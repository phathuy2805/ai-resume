import { Inject, Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import envConfig from '../../shared/config/env.config.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { DEFAULT_RUBRIC_WEIGHTS } from '../../shared/constants/job.constant.js';
import { RubricWeightsSchema } from '../../shared/models/job.model.js';
import { AiQueueService } from '../../shared/ai/ai-queue.service.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { StorageService } from '../../shared/services/storage.service.js';
import {
  buildTurnEvaluationInputs,
  type InterviewEvaluator,
  type InterviewTranscriber,
} from './interview-evaluation.adapters.js';
import {
  DEFAULT_EVALUATION_RETRY_DELAY_MS,
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_EVALUATION_MAX_ATTEMPTS,
  INTERVIEW_EVALUATOR,
  INTERVIEW_PROCESSING_OPTIONS,
  INTERVIEW_TRANSCRIBER,
} from './interview-evaluation.constant.js';
import { InterviewEvaluationRepository } from './interview-evaluation.repository.js';
import {
  buildInterviewTranscriptText,
  computeWeightedInterviewScore,
} from './interview-transcript.util.js';

export interface InterviewCompletedEventPayload {
  interviewId: string;
  applicationId?: string;
}

export interface InterviewProcessingOptions {
  retryDelayMs?: number;
}

export interface EnqueueInterviewOptions {
  retryFailedOnly?: boolean;
}

type ProcessingStep = 'TRANSCRIBE' | 'EVALUATE';

const DECIDED_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.PASSED,
  ApplicationStatus.FAILED,
]);

@Injectable()
export class InterviewProcessingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InterviewProcessingService.name);
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly rerunRequested = new Map<string, EnqueueInterviewOptions>();
  private readonly retryDelayMs: number;

  constructor(
    private readonly repo: InterviewEvaluationRepository,
    @Inject(INTERVIEW_TRANSCRIBER)
    private readonly transcriber: InterviewTranscriber,
    @Inject(INTERVIEW_EVALUATOR)
    private readonly evaluator: InterviewEvaluator,
    private readonly aiQueue: AiQueueService,
    private readonly storage: StorageService,
    private readonly applicationStateService: ApplicationStateService,
    @Optional()
    @Inject(INTERVIEW_PROCESSING_OPTIONS)
    options?: InterviewProcessingOptions,
  ) {
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_EVALUATION_RETRY_DELAY_MS;
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      const pending = await this.repo.findPendingRecoveryInterviewIds();
      if (pending.length === 0) {
        return;
      }

      this.logger.log(`Khôi phục đánh giá nền cho ${pending.length} phiên phỏng vấn chưa có kết quả`);
      for (const item of pending) {
        this.enqueue(item.id);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi quét phiên phỏng vấn cần khôi phục: ${formatError(error)}`);
    }
  }

  @OnEvent(INTERVIEW_COMPLETED_EVENT)
  handleInterviewCompleted(payload: InterviewCompletedEventPayload): void {
    if (!payload?.interviewId) {
      return;
    }
    this.enqueue(payload.interviewId);
  }

  enqueue(interviewId: string, options: EnqueueInterviewOptions = {}): void {
    void this.schedule(interviewId, options);
  }

  whenIdle(interviewId: string): Promise<void> {
    return this.inFlight.get(interviewId) ?? Promise.resolve();
  }

  private schedule(interviewId: string, options: EnqueueInterviewOptions): Promise<void> {
    const existing = this.inFlight.get(interviewId);
    if (existing) {
      this.rerunRequested.set(interviewId, options);
      return existing;
    }

    const promise = this.runWithRetry(interviewId, options)
      .catch((error: unknown) => {
        this.logger.error(`interview=${interviewId} lỗi ngoài dự kiến: ${formatError(error)}`);
      })
      .finally(() => {
        this.inFlight.delete(interviewId);
        const queuedOptions = this.rerunRequested.get(interviewId);
        if (queuedOptions) {
          this.rerunRequested.delete(interviewId);
          this.enqueue(interviewId, queuedOptions);
        }
      });

    this.inFlight.set(interviewId, promise);
    return promise;
  }

  private async runWithRetry(
    interviewId: string,
    options: EnqueueInterviewOptions,
  ): Promise<void> {
    let lastStep: ProcessingStep = 'TRANSCRIBE';
    let lastError: unknown;

    for (let attempt = 1; attempt <= INTERVIEW_EVALUATION_MAX_ATTEMPTS; attempt++) {
      const stepRef: { current: ProcessingStep } = { current: 'TRANSCRIBE' };
      try {
        await this.processOnce(interviewId, options, stepRef);
        return;
      } catch (error) {
        lastStep = stepRef.current;
        lastError = error;
        this.logger.warn(
          `interview=${interviewId} attempt=${attempt}/${INTERVIEW_EVALUATION_MAX_ATTEMPTS} step=${lastStep} lỗi: ${formatError(error)}`,
        );

        if (attempt < INTERVIEW_EVALUATION_MAX_ATTEMPTS && this.retryDelayMs > 0) {
          await this.wait(this.retryDelayMs);
        }
      }
    }

    const errorMessage = `${lastStep}: ${formatError(lastError)}`.slice(0, 1000);
    try {
      await this.repo.saveEvaluationError(interviewId, errorMessage);
      this.logger.error(`interview=${interviewId} đánh giá thất bại sau ${INTERVIEW_EVALUATION_MAX_ATTEMPTS} lần thử: ${errorMessage}`);
    } catch (saveError) {
      this.logger.error(
        `interview=${interviewId} không lưu được evaluationError: ${formatError(saveError)}`,
      );
    }
  }

  private async processOnce(
    interviewId: string,
    options: EnqueueInterviewOptions,
    stepRef: { current: ProcessingStep },
  ): Promise<void> {
    const initial = await this.repo.findByInterviewId(interviewId);
    if (!initial || !initial.completedAt) {
      this.logger.warn(`interview=${interviewId} bỏ qua: không tồn tại hoặc chưa kết thúc`);
      return;
    }

    if (this.isAlreadyDecided(initial)) {
      this.logger.log(`interview=${interviewId} bỏ qua: HR đã ra quyết định cuối`);
      return;
    }

    stepRef.current = 'TRANSCRIBE';
    const transcription = await this.transcriber.transcribeSession(interviewId, {
      retryFailedOnly: options.retryFailedOnly,
    });
    if (transcription.failedTurnIds.length > 0) {
      throw new Error(
        `Nhận dạng giọng nói thất bại ở ${transcription.failedTurnIds.length} câu (${transcription.failedTurnIds.join(', ')})`,
      );
    }

    stepRef.current = 'EVALUATE';
    const session = await this.repo.findByInterviewId(interviewId);
    if (!session || !session.completedAt || this.isAlreadyDecided(session)) {
      return;
    }

    const parsedWeights = RubricWeightsSchema.safeParse(session.application.job.rubricWeights);
    const rubricWeights = parsedWeights.success
      ? parsedWeights.data
      : { ...DEFAULT_RUBRIC_WEIGHTS };

    const turnInputs = buildTurnEvaluationInputs(session.turns);
    const evaluated = await this.aiQueue.add(
      () =>
        this.evaluator.evaluateInterview({
          jobTitle: session.application.job.title,
          requiredSkills: session.application.job.requiredSkills,
          parsedJd: session.application.job.parsedJd,
          rubricWeights,
          screeningResult: session.application.screeningResult,
          turns: turnInputs,
        }),
      { lane: 'background' },
    );

    const totalScore = computeWeightedInterviewScore(evaluated, rubricWeights);
    const aiRecommendation =
      totalScore >= envConfig.INTERVIEW_PASS_THRESHOLD
        ? AiRecommendation.PASS
        : AiRecommendation.REJECT;

    const transcriptText = buildInterviewTranscriptText({
      interviewId: session.id,
      jobTitle: session.application.job.title,
      completedAt: session.completedAt,
      turns: session.turns,
    });
    const transcriptS3Key = `transcripts/${session.id}.txt`;
    await this.storage.putObject(
      transcriptS3Key,
      Buffer.from(transcriptText, 'utf-8'),
      'text/plain; charset=utf-8',
    );

    const saved = await this.repo.saveEvaluationResult({
      interviewId: session.id,
      applicationId: session.applicationId,
      currentStatus: session.application.status as ApplicationStatus,
      transcriptS3Key,
      technicalScore: evaluated.technicalScore,
      communicationScore: evaluated.communicationScore,
      relevanceScore: evaluated.relevanceScore,
      evidenceScore: evaluated.evidenceScore,
      totalScore,
      feedbackSummary: evaluated.feedbackSummary,
      evidenceQuotes: evaluated.evidenceQuotes,
      aiRecommendation,
      candidateFeedback: evaluated.candidateFeedback,
    });

    if (saved.statusEvent) {
      this.applicationStateService.emitStatusChanged(saved.statusEvent);
    }

    this.logger.log(
      `interview=${session.id} hoàn tất đánh giá: totalScore=${totalScore}, aiRecommendation=${aiRecommendation}, transcript=${transcriptS3Key}`,
    );
  }

  private isAlreadyDecided(record: {
    application: { status: string };
    result: { decisionAt: Date | null } | null;
  }): boolean {
    return (
      DECIDED_STATUSES.has(record.application.status as ApplicationStatus) ||
      record.result?.decisionAt !== null && record.result?.decisionAt !== undefined
    );
  }

  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
