import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnswerSource, TurnTranscriptStatus } from '../../generated/prisma/client.js';
import { AiQueueService } from '../../shared/ai/ai-queue.service.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import {
  computeInterviewPhase,
  computeInviteExpiresAt,
  computeSessionExpiresAt,
  isInviteExpired,
  isSessionDeadlinePassed,
} from './interview-phase.util.js';
import {
  INTERVIEW_AI_QUEUE_PRIORITY,
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_ERROR_CODES,
  INTERVIEW_SESSION_TTL_MS,
  QUESTION_PLANNER,
  TRANSCRIPT_STATUS,
  type TranscriptStatus,
} from './interviews.constant.js';
import { InterviewWebSocketError } from './interviews.error.js';
import {
  InterviewsRepository,
  type InterviewOwnershipRecord,
  type InterviewSessionRecord,
} from './interviews.repository.js';
import type { InterviewAnswerPayload } from './interviews.schema.js';
import type {
  InterviewCompletedEventPayload,
  InterviewStatePayload,
  PlannedQuestion,
  QuestionPlanner,
  StartInterviewResult,
  SubmitAnswerResult,
} from './interviews.type.js';

@Injectable()
export class InterviewsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InterviewsService.name);
  private readonly startingInterviews = new Set<string>();

  constructor(
    private readonly interviewsRepo: InterviewsRepository,
    private readonly aiQueue: AiQueueService,
    private readonly applicationStateService: ApplicationStateService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(QUESTION_PLANNER)
    private readonly questionPlanner: QuestionPlanner,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.autoCompleteExpiredSessions();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Lỗi khi quét các phiên phỏng vấn quá hạn 24 giờ: ${reason}`);
    }
  }

  async autoCompleteExpiredSessions(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - INTERVIEW_SESSION_TTL_MS);
    const expired = await this.interviewsRepo.findExpiredInProgressSessions(cutoff);
    let completedCount = 0;

    for (const session of expired) {
      if (!session.startedAt) {
        continue;
      }
      const completedAt = computeSessionExpiresAt(session) ?? now;
      const completed = await this.interviewsRepo.autoCompleteExpiredSession(
        session.id,
        completedAt,
      );
      if (completed) {
        completedCount += 1;
        this.emitInterviewCompleted({
          interviewId: session.id,
          applicationId: session.applicationId,
          jobId: session.application.jobId,
          candidateId: session.application.candidateId,
          completedAt,
        });
      }
    }

    if (completedCount > 0) {
      this.logger.log(`Đã tự kết thúc ${completedCount} phiên phỏng vấn quá hạn 24 giờ`);
    }

    return completedCount;
  }

  async autoCompleteIfSessionExpired(interviewId: string, now = new Date()): Promise<boolean> {
    const session = await this.interviewsRepo.findSessionById(interviewId);
    if (!session) {
      return false;
    }
    return this.completeSessionIfDeadlinePassed(session, now);
  }

  async assertInterviewOwner(
    interviewId: string,
    userId: string,
  ): Promise<InterviewOwnershipRecord> {
    const interview = await this.interviewsRepo.findOwnership(interviewId);
    if (!interview) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INTERVIEW_NOT_FOUND,
        'Không tìm thấy phiên phỏng vấn',
      );
    }
    if (interview.application.candidateId !== userId) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.FORBIDDEN,
        'Bạn không có quyền truy cập phiên phỏng vấn này',
      );
    }
    return interview;
  }

  async assertInterviewOwnerForHttp(
    interviewId: string,
    userId: string,
  ): Promise<InterviewOwnershipRecord> {
    try {
      return await this.assertInterviewOwner(interviewId, userId);
    } catch (error) {
      if (error instanceof InterviewWebSocketError) {
        if (error.code === INTERVIEW_ERROR_CODES.INTERVIEW_NOT_FOUND) {
          throw new NotFoundException({ code: error.code, message: error.message });
        }
        if (error.code === INTERVIEW_ERROR_CODES.FORBIDDEN) {
          throw new ForbiddenException({ code: error.code, message: error.message });
        }
      }
      throw error;
    }
  }

  async joinInterview(interviewId: string, userId: string): Promise<InterviewStatePayload> {
    const session = await this.loadOwnedSession(interviewId, userId);
    await this.completeSessionIfDeadlinePassed(session);

    if (session.completedAt === null && session.startedAt !== null) {
      const currentTurn = session.turns.find((turn) => turn.answeredAt === null);
      if (currentTurn && currentTurn.askedAt === null) {
        const now = new Date();
        await this.interviewsRepo.ensureTurnAskedAt(session.id, currentTurn.id, now);
        currentTurn.askedAt = now;
      }
    }

    return this.buildStatePayload(session);
  }

  async startInterview(
    interviewId: string,
    userId: string,
    consent: boolean,
    onPreparing?: () => void,
  ): Promise<StartInterviewResult> {
    if (!consent) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.CONSENT_REQUIRED,
        'Bạn cần đồng ý để AI xử lý và lưu câu trả lời trước khi bắt đầu phỏng vấn',
      );
    }

    const session = await this.loadOwnedSession(interviewId, userId);

    if (this.startingInterviews.has(interviewId)) {
      return { kind: 'IGNORED' };
    }

    if (session.application.status !== ApplicationStatus.INTERVIEW_INVITED) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INVALID_STATE,
        'Phiên phỏng vấn đã được bắt đầu hoặc không ở trạng thái chờ bắt đầu',
      );
    }

    if (isInviteExpired(session)) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INTERVIEW_EXPIRED,
        'Lời mời phỏng vấn đã quá hạn tham gia',
      );
    }

    this.startingInterviews.add(interviewId);
    try {
      onPreparing?.();

      const consentAt = new Date();
      const questions = await this.generateQuestions(session);
      const startedAt = new Date();

      let persisted: Awaited<ReturnType<InterviewsRepository['startSessionWithTurns']>>;
      try {
        persisted = await this.interviewsRepo.startSessionWithTurns({
          interviewId: session.id,
          applicationId: session.applicationId,
          candidateId: userId,
          consentAt,
          startedAt,
          questions,
        });
      } catch (error) {
        if (error instanceof ConflictException) {
          throw new InterviewWebSocketError(
            INTERVIEW_ERROR_CODES.INVALID_STATE,
            'Trạng thái phiên phỏng vấn vừa thay đổi, vui lòng tải lại',
          );
        }
        throw error;
      }

      this.applicationStateService.emitStatusChanged(persisted.statusEvent);

      const first = persisted.turns[0];
      return {
        kind: 'STARTED',
        firstQuestion: {
          turnId: first.id,
          order: first.orderIndex,
          total: persisted.turns.length,
          text: first.question,
        },
      };
    } finally {
      this.startingInterviews.delete(interviewId);
    }
  }

  async submitAnswer(
    interviewId: string,
    userId: string,
    payload: InterviewAnswerPayload,
  ): Promise<SubmitAnswerResult> {
    const session = await this.loadOwnedSession(interviewId, userId);

    if (
      session.completedAt !== null ||
      session.application.status !== ApplicationStatus.INTERVIEWING
    ) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INVALID_STATE,
        'Phiên phỏng vấn chưa bắt đầu hoặc đã kết thúc',
      );
    }

    if (await this.completeSessionIfDeadlinePassed(session)) {
      return {
        kind: 'COMPLETED',
        completed: {
          interviewId: session.id,
          completedAt: session.completedAt!.toISOString(),
          transcriptStatus: this.computeTranscriptStatus(session),
        },
      };
    }

    const targetTurn = session.turns.find((turn) => turn.id === payload.turnId);
    if (!targetTurn) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INVALID_PAYLOAD,
        'Câu hỏi không thuộc phiên phỏng vấn này',
      );
    }

    if (targetTurn.answeredAt !== null) {
      return {
        kind: 'DUPLICATE',
        state: this.buildStatePayload(session),
      };
    }

    const currentTurn = session.turns.find((turn) => turn.answeredAt === null);
    if (!currentTurn || currentTurn.id !== targetTurn.id) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INVALID_PAYLOAD,
        'Chỉ được gửi câu trả lời cho câu hỏi hiện tại',
      );
    }

    if (payload.source === 'VOICE' && !currentTurn.audioS3Key) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.AUDIO_NOT_UPLOADED,
        'Vui lòng tải file ghi âm lên trước khi gửi câu trả lời bằng giọng nói',
      );
    }

    const nextTurn =
      session.turns.find((turn) => turn.answeredAt === null && turn.id !== currentTurn.id) ?? null;
    const isFinalTurn = nextTurn === null;
    const answeredAt = new Date();
    const isVoice = payload.source === 'VOICE';

    const recordResult = await this.interviewsRepo.recordTurnAnswer({
      interviewId: session.id,
      turnId: currentTurn.id,
      answerText: isVoice ? null : payload.text,
      source: isVoice ? AnswerSource.VOICE : AnswerSource.TEXT,
      transcriptStatus: isVoice ? TurnTranscriptStatus.PENDING : null,
      clearAudio: !isVoice,
      answeredAt,
      nextTurnId: nextTurn?.id ?? null,
      isFinalTurn,
    });

    if (!recordResult.recorded) {
      const latest = await this.loadOwnedSession(interviewId, userId);
      return {
        kind: 'DUPLICATE',
        state: this.buildStatePayload(latest),
      };
    }

    if (nextTurn) {
      return {
        kind: 'NEXT_QUESTION',
        question: {
          turnId: nextTurn.id,
          order: nextTurn.orderIndex,
          total: session.turns.length,
          text: nextTurn.question,
        },
      };
    }

    const completedAt = recordResult.completedAt ?? answeredAt;
    this.emitInterviewCompleted({
      interviewId: session.id,
      applicationId: session.applicationId,
      jobId: session.application.jobId,
      candidateId: session.application.candidateId,
      completedAt,
    });

    const hasPendingVoiceStt = session.turns.some((turn) => {
      if (turn.id === currentTurn.id) {
        return isVoice;
      }
      return turn.source === AnswerSource.VOICE && turn.answerText === null && turn.answeredAt !== null;
    });

    return {
      kind: 'COMPLETED',
      completed: {
        interviewId: session.id,
        completedAt: completedAt.toISOString(),
        transcriptStatus: hasPendingVoiceStt
          ? TRANSCRIPT_STATUS.TRANSCRIBING
          : TRANSCRIPT_STATUS.READY,
      },
    };
  }

  private async completeSessionIfDeadlinePassed(
    session: InterviewSessionRecord,
    now = new Date(),
  ): Promise<boolean> {
    if (!isSessionDeadlinePassed(session, now)) {
      return false;
    }

    const completedAt = computeSessionExpiresAt(session) ?? now;
    const transitioned = await this.interviewsRepo.autoCompleteExpiredSession(
      session.id,
      completedAt,
    );
    session.completedAt = completedAt;

    if (transitioned) {
      this.logger.log(`Tự động kết thúc phiên phỏng vấn quá hạn 24 giờ: interview=${session.id}`);
      this.emitInterviewCompleted({
        interviewId: session.id,
        applicationId: session.applicationId,
        jobId: session.application.jobId,
        candidateId: session.application.candidateId,
        completedAt,
      });
    }

    return true;
  }

  private emitInterviewCompleted(payload: InterviewCompletedEventPayload): void {
    this.eventEmitter.emit(INTERVIEW_COMPLETED_EVENT, payload);
  }

  private async loadOwnedSession(
    interviewId: string,
    userId: string,
  ): Promise<InterviewSessionRecord> {
    const session = await this.interviewsRepo.findSessionById(interviewId);
    if (!session) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.INTERVIEW_NOT_FOUND,
        'Không tìm thấy phiên phỏng vấn',
      );
    }
    if (session.application.candidateId !== userId) {
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.FORBIDDEN,
        'Bạn không có quyền truy cập phiên phỏng vấn này',
      );
    }
    return session;
  }

  private async generateQuestions(session: InterviewSessionRecord): Promise<PlannedQuestion[]> {
    const missingSkills = this.extractMissingSkills(session.application.screeningResult?.breakdown);
    try {
      const plan = await this.aiQueue.add(
        () =>
          this.questionPlanner.generateQuestionPlan({
            jobTitle: session.application.job.title,
            requiredSkills: session.application.job.requiredSkills,
            preferredSkills: session.application.job.preferredSkills,
            parsedJd: session.application.job.parsedJd,
            parsedCv: session.application.parsedCv,
            questionCount: session.application.job.interviewQuestionCount,
            missingSkills,
          }),
        {
          priority: INTERVIEW_AI_QUEUE_PRIORITY,
          lane: 'live',
        },
      );

      if (!Array.isArray(plan) || plan.length === 0) {
        throw new Error('Question plan returned empty list');
      }

      return plan;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Sinh câu hỏi thất bại cho interview=${session.id}: ${reason}`);
      throw new InterviewWebSocketError(
        INTERVIEW_ERROR_CODES.QUESTION_GENERATION_FAILED,
        'Không thể tạo bộ câu hỏi lúc này. Vui lòng bấm bắt đầu lại.',
      );
    }
  }

  private extractMissingSkills(breakdown: unknown): string[] {
    if (!breakdown || typeof breakdown !== 'object') {
      return [];
    }
    const required = (breakdown as { requiredSkills?: { missing?: unknown } }).requiredSkills;
    if (!required || !Array.isArray(required.missing)) {
      return [];
    }
    return required.missing.filter((item): item is string => typeof item === 'string');
  }

  private computeTranscriptStatus(session: InterviewSessionRecord): TranscriptStatus {
    if (session.completedAt === null) {
      return TRANSCRIPT_STATUS.NONE;
    }
    if (session.evaluationError !== null) {
      return TRANSCRIPT_STATUS.DELAYED;
    }
    const hasPendingVoiceStt = session.turns.some(
      (turn) =>
        turn.answeredAt !== null &&
        turn.source === AnswerSource.VOICE &&
        turn.answerText === null &&
        turn.transcriptStatus !== TurnTranscriptStatus.NO_SPEECH,
    );
    return hasPendingVoiceStt ? TRANSCRIPT_STATUS.TRANSCRIBING : TRANSCRIPT_STATUS.READY;
  }

  private buildStatePayload(session: InterviewSessionRecord): InterviewStatePayload {
    const now = new Date();
    const status = session.application.status as ApplicationStatus;
    const inviteExpiresAt = computeInviteExpiresAt(session);
    const sessionExpiresAt = computeSessionExpiresAt(session);
    const phase = computeInterviewPhase(session, status, now);
    const expired = isInviteExpired(session, now);

    const totalQuestions =
      session.turns.length > 0
        ? session.turns.length
        : session.application.job.interviewQuestionCount;

    const answeredTurns = session.turns
      .filter((turn) => turn.answeredAt !== null)
      .map((turn) => ({
        turnId: turn.id,
        order: turn.orderIndex,
        question: turn.question,
        answerText: turn.answerText,
        source: turn.source,
        transcriptStatus: turn.transcriptStatus,
        askedAt: turn.askedAt ? turn.askedAt.toISOString() : null,
        answeredAt: turn.answeredAt!.toISOString(),
      }));

    const nextUnanswered = session.turns.find((turn) => turn.answeredAt === null) ?? null;
    const currentQuestion =
      session.completedAt === null && !expired && nextUnanswered !== null
        ? {
            turnId: nextUnanswered.id,
            order: nextUnanswered.orderIndex,
            total: session.turns.length,
            text: nextUnanswered.question,
          }
        : null;

    return {
      interviewId: session.id,
      status,
      phase,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
      sessionExpiresAt: sessionExpiresAt ? sessionExpiresAt.toISOString() : null,
      expiresAt: inviteExpiresAt.toISOString(),
      isExpired: expired,
      recordingConsentAt: session.recordingConsentAt?.toISOString() ?? null,
      startedAt: session.startedAt?.toISOString() ?? null,
      completedAt: session.completedAt?.toISOString() ?? null,
      transcriptStatus: this.computeTranscriptStatus(session),
      processingDelayed: session.completedAt !== null && session.evaluationError !== null,
      totalQuestions,
      currentQuestion,
      answeredTurns,
    };
  }
}
