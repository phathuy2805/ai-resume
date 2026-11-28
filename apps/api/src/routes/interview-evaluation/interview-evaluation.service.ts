import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import envConfig from '../../shared/config/env.config.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { DEFAULT_RUBRIC_WEIGHTS } from '../../shared/constants/job.constant.js';
import { SIGNED_URL_EXPIRES_SEC } from '../../shared/constants/storage.constant.js';
import { RubricWeightsSchema } from '../../shared/models/job.model.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { StorageService } from '../../shared/services/storage.service.js';
import {
  DEFAULT_INTERVIEW_DEADLINE_DAYS,
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_PHASES,
  INTERVIEW_SESSION_TTL_MS,
  type InterviewPhase,
} from './interview-evaluation.constant.js';
import {
  ApplicationNotFoundForInterviewException,
  InterviewForbiddenException,
  InterviewNotFoundException,
  InvalidInterviewDecisionStatusException,
  InvalidReEvaluateStatusException,
} from './interview-evaluation.error.js';
import {
  InterviewEvaluationRepository,
  type InterviewEvaluationRecord,
} from './interview-evaluation.repository.js';
import {
  CandidateFeedbackSchema,
  EvidenceQuotesSchema,
  type CandidateFeedbackType,
  type EvidenceQuotesType,
  type GetApplicationInterviewResType,
  type GetCandidateFeedbackResType,
  type InterviewDecisionBodyType,
  type InterviewDecisionResType,
  type ReEvaluateInterviewResType,
} from './interview-evaluation.schema.js';
import { InterviewProcessingService } from './interview-processing.service.js';
import { isTurnAnswerEmpty } from './interview-transcript.util.js';

const EMPTY_EVIDENCE_QUOTES: EvidenceQuotesType = {
  technical: { comment: '', quotes: [] },
  communication: { comment: '', quotes: [] },
  relevance: { comment: '', quotes: [] },
  evidence: { comment: '', quotes: [] },
};

const EMPTY_CANDIDATE_FEEDBACK: CandidateFeedbackType = {
  strengths: [],
  improvements: [],
  suggestions: [],
};

@Injectable()
export class InterviewEvaluationService {
  private readonly logger = new Logger(InterviewEvaluationService.name);

  constructor(
    private readonly repo: InterviewEvaluationRepository,
    private readonly storage: StorageService,
    private readonly applicationStateService: ApplicationStateService,
    private readonly processingService: InterviewProcessingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getApplicationInterviewForHr(
    hrId: string,
    applicationId: string,
  ): Promise<GetApplicationInterviewResType> {
    const ownership = await this.repo.findApplicationOwnership(applicationId);
    if (!ownership) {
      throw ApplicationNotFoundForInterviewException;
    }
    if (ownership.job.createdById !== hrId) {
      throw InterviewForbiddenException;
    }

    const interview = await this.repo.findByApplicationId(applicationId);
    if (!interview) {
      throw InterviewNotFoundException;
    }

    const inviteExpiresAt = this.resolveExpiresAt(interview);
    const sessionExpiresAt = interview.startedAt
      ? new Date(interview.startedAt.getTime() + INTERVIEW_SESSION_TTL_MS)
      : null;

    if (
      sessionExpiresAt &&
      !interview.completedAt &&
      Date.now() >= sessionExpiresAt.getTime()
    ) {
      const transitioned = await this.repo.autoCompleteExpiredSession(
        interview.id,
        sessionExpiresAt,
      );
      interview.completedAt = sessionExpiresAt;
      if (transitioned) {
        this.eventEmitter.emit(INTERVIEW_COMPLETED_EVENT, {
          interviewId: interview.id,
          applicationId: interview.applicationId,
          jobId: interview.application.jobId,
          candidateId: interview.application.candidateId,
          completedAt: sessionExpiresAt,
        });
      }
    }

    const isExpired =
      !interview.startedAt && !interview.completedAt && inviteExpiresAt.getTime() <= Date.now();
    const status = interview.application.status as ApplicationStatus;
    const phase = this.resolvePhase(interview, status, isExpired);

    const parsedWeights = RubricWeightsSchema.safeParse(interview.application.job.rubricWeights);
    const rubricWeights = parsedWeights.success
      ? parsedWeights.data
      : { ...DEFAULT_RUBRIC_WEIGHTS };

    const turns = await Promise.all(
      interview.turns.map(async (turn) => {
        const audioUrl = turn.audioS3Key ? await this.safeGetSignedUrl(turn.audioS3Key) : null;
        const durationSec =
          turn.askedAt && turn.answeredAt
            ? Math.max(0, Math.round((turn.answeredAt.getTime() - turn.askedAt.getTime()) / 1000))
            : null;

        return {
          id: turn.id,
          orderIndex: turn.orderIndex,
          question: turn.question,
          questionType: turn.questionType,
          targetSkill: turn.targetSkill,
          answerText: turn.answerText,
          source: turn.source,
          transcriptStatus: turn.transcriptStatus,
          transcriptEdited: turn.transcriptEdited,
          askedAt: turn.askedAt ? turn.askedAt.toISOString() : null,
          answeredAt: turn.answeredAt ? turn.answeredAt.toISOString() : null,
          durationSec,
          isEmpty: isTurnAnswerEmpty(turn),
          audioUrl,
        };
      }),
    );

    const result = interview.result
      ? this.mapInterviewResult(interview.result)
      : null;

    return {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      status,
      phase,
      expiresAt: inviteExpiresAt.toISOString(),
      inviteExpiresAt: inviteExpiresAt.toISOString(),
      sessionExpiresAt: sessionExpiresAt ? sessionExpiresAt.toISOString() : null,
      isExpired,
      recordingConsentAt: interview.recordingConsentAt
        ? interview.recordingConsentAt.toISOString()
        : null,
      startedAt: interview.startedAt ? interview.startedAt.toISOString() : null,
      completedAt: interview.completedAt ? interview.completedAt.toISOString() : null,
      transcriptS3Key: interview.transcriptS3Key,
      evaluationError: interview.evaluationError,
      passThreshold: envConfig.INTERVIEW_PASS_THRESHOLD,
      rubricWeights,
      turns,
      result,
    };
  }

  async decideInterview(
    hrId: string,
    applicationId: string,
    body: InterviewDecisionBodyType,
  ): Promise<InterviewDecisionResType> {
    const ownership = await this.repo.findApplicationOwnership(applicationId);
    if (!ownership) {
      throw ApplicationNotFoundForInterviewException;
    }
    if (ownership.job.createdById !== hrId) {
      throw InterviewForbiddenException;
    }

    const interview = await this.repo.findByApplicationId(applicationId);
    if (!interview) {
      throw InterviewNotFoundException;
    }

    const status = interview.application.status as ApplicationStatus;
    if (
      status !== ApplicationStatus.EVALUATED ||
      !interview.result ||
      interview.result.decisionAt !== null
    ) {
      throw InvalidInterviewDecisionStatusException;
    }

    const saved = await this.repo.saveInterviewDecision({
      applicationId,
      interviewId: interview.id,
      hrId,
      decision: body.decision,
      note: body.note,
      candidateMessage: body.candidateMessage,
    });
    if (!saved) {
      throw InvalidInterviewDecisionStatusException;
    }

    this.applicationStateService.emitStatusChanged(saved.event);

    return {
      id: saved.id,
      interviewId: saved.interviewId,
      status: saved.status,
      decisionById: saved.decisionById,
      decisionAt: saved.decisionAt.toISOString(),
      decisionNote: saved.decisionNote,
      candidateMessage: saved.candidateMessage,
    };
  }

  async reEvaluateInterview(
    hrId: string,
    interviewId: string,
  ): Promise<ReEvaluateInterviewResType> {
    const interview = await this.repo.findByInterviewId(interviewId);
    if (!interview) {
      throw InterviewNotFoundException;
    }
    if (interview.application.job.createdById !== hrId) {
      throw InterviewForbiddenException;
    }

    const status = interview.application.status as ApplicationStatus;
    const canReEvaluateError =
      status === ApplicationStatus.INTERVIEWING &&
      interview.completedAt !== null &&
      interview.evaluationError !== null;
    const canReEvaluateEvaluated =
      status === ApplicationStatus.EVALUATED && interview.result?.decisionAt === null;

    if (!canReEvaluateError && !canReEvaluateEvaluated) {
      throw InvalidReEvaluateStatusException;
    }

    await this.repo.clearEvaluationError(interview.id);
    this.processingService.enqueue(interview.id, { retryFailedOnly: true });

    return {
      interviewId: interview.id,
      applicationId: interview.applicationId,
      status,
    };
  }

  async getCandidateFeedback(
    candidateId: string,
    applicationId: string,
  ): Promise<GetCandidateFeedbackResType> {
    const application = await this.repo.findCandidateFeedbackApplication(applicationId);
    if (!application) {
      throw ApplicationNotFoundForInterviewException;
    }
    if (application.candidateId !== candidateId) {
      throw InterviewForbiddenException;
    }

    const status = application.status as ApplicationStatus;

    if (status === ApplicationStatus.PASSED || status === ApplicationStatus.FAILED) {
      const parsedFeedback = CandidateFeedbackSchema.safeParse(
        application.interview?.result?.candidateFeedback,
      );

      return {
        status,
        stage: 'INTERVIEW',
        result: status,
        candidateMessage: application.interview?.result?.candidateMessage ?? null,
        feedback: parsedFeedback.success ? parsedFeedback.data : null,
      };
    }

    if (status === ApplicationStatus.REJECTED) {
      const parsedCvFeedback = CandidateFeedbackSchema.safeParse(application.candidateFeedback);

      return {
        status,
        stage: 'CV',
        result: 'REJECTED',
        candidateMessage: application.candidateMessage ?? null,
        feedback: parsedCvFeedback.success ? parsedCvFeedback.data : null,
      };
    }

    return { status };
  }

  private resolveExpiresAt(interview: InterviewEvaluationRecord): Date {
    if (interview.expiresAt) {
      return interview.expiresAt;
    }
    return new Date(
      interview.createdAt.getTime() + DEFAULT_INTERVIEW_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    );
  }

  private resolvePhase(
    interview: InterviewEvaluationRecord,
    status: ApplicationStatus,
    isExpired: boolean,
  ): InterviewPhase {
    if (
      status === ApplicationStatus.PASSED ||
      status === ApplicationStatus.FAILED ||
      interview.result?.decisionAt !== null && interview.result?.decisionAt !== undefined
    ) {
      return INTERVIEW_PHASES.DECIDED;
    }
    if (status === ApplicationStatus.EVALUATED) {
      return INTERVIEW_PHASES.EVALUATED;
    }
    if (interview.completedAt) {
      return INTERVIEW_PHASES.SUBMITTED;
    }
    if (isExpired) {
      return INTERVIEW_PHASES.EXPIRED;
    }
    if (interview.startedAt) {
      return INTERVIEW_PHASES.IN_PROGRESS;
    }
    return INTERVIEW_PHASES.INVITED;
  }

  private mapInterviewResult(result: NonNullable<InterviewEvaluationRecord['result']>) {
    const parsedQuotes = EvidenceQuotesSchema.safeParse(result.evidenceQuotes);
    const parsedFeedback = CandidateFeedbackSchema.safeParse(result.candidateFeedback);
    const aiRecommendation: AiRecommendation.PASS | AiRecommendation.REJECT =
      result.aiRecommendation === AiRecommendation.PASS
        ? AiRecommendation.PASS
        : AiRecommendation.REJECT;

    return {
      technicalScore: result.technicalScore,
      communicationScore: result.communicationScore,
      relevanceScore: result.relevanceScore,
      evidenceScore: result.evidenceScore,
      totalScore: result.totalScore,
      feedbackSummary: result.feedbackSummary,
      evidenceQuotes: parsedQuotes.success ? parsedQuotes.data : EMPTY_EVIDENCE_QUOTES,
      aiRecommendation,
      candidateFeedback: parsedFeedback.success ? parsedFeedback.data : EMPTY_CANDIDATE_FEEDBACK,
      decisionBy: result.decisionBy
        ? { id: result.decisionBy.id, fullName: result.decisionBy.fullName }
        : null,
      decisionAt: result.decisionAt ? result.decisionAt.toISOString() : null,
      decisionNote: result.decisionNote,
      candidateMessage: result.candidateMessage,
      createdAt: result.createdAt.toISOString(),
    };
  }

  private async safeGetSignedUrl(key: string): Promise<string | null> {
    try {
      return await this.storage.getSignedUrl(key, SIGNED_URL_EXPIRES_SEC);
    } catch (error) {
      this.logger.warn(`Không tạo được presigned URL cho audio ${key}: ${String(error)}`);
      return null;
    }
  }
}
