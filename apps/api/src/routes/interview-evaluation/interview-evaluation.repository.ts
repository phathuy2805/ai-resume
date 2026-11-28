import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ApplicationStatusChangedPayload } from '../../shared/constants/application-event.constant.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import type {
  CandidateFeedbackType,
  EvidenceQuotesType,
} from './interview-evaluation.schema.js';

export const interviewEvaluationRecordSelect = {
  id: true,
  applicationId: true,
  recordingConsentAt: true,
  startedAt: true,
  completedAt: true,
  expiresAt: true,
  transcriptS3Key: true,
  evaluationError: true,
  createdAt: true,
  application: {
    select: {
      id: true,
      jobId: true,
      candidateId: true,
      status: true,
      job: {
        select: {
          id: true,
          title: true,
          createdById: true,
          requiredSkills: true,
          parsedJd: true,
          rubricWeights: true,
        },
      },
      screeningResult: {
        select: {
          totalScore: true,
          breakdown: true,
          explanation: true,
        },
      },
    },
  },
  turns: {
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      orderIndex: true,
      question: true,
      questionType: true,
      targetSkill: true,
      answerText: true,
      source: true,
      transcriptStatus: true,
      transcriptEdited: true,
      audioS3Key: true,
      askedAt: true,
      answeredAt: true,
    },
  },
  result: {
    select: {
      id: true,
      technicalScore: true,
      communicationScore: true,
      relevanceScore: true,
      evidenceScore: true,
      totalScore: true,
      feedbackSummary: true,
      evidenceQuotes: true,
      aiRecommendation: true,
      candidateFeedback: true,
      candidateMessage: true,
      decisionById: true,
      decisionAt: true,
      decisionNote: true,
      createdAt: true,
      decisionBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  },
} satisfies Prisma.InterviewSelect;

export type InterviewEvaluationRecord = Prisma.InterviewGetPayload<{
  select: typeof interviewEvaluationRecordSelect;
}>;

export const candidateFeedbackApplicationSelect = {
  id: true,
  candidateId: true,
  status: true,
  candidateMessage: true,
  candidateFeedback: true,
  interview: {
    select: {
      id: true,
      result: {
        select: {
          candidateFeedback: true,
          candidateMessage: true,
        },
      },
    },
  },
} satisfies Prisma.ApplicationSelect;

export type CandidateFeedbackApplicationRecord = Prisma.ApplicationGetPayload<{
  select: typeof candidateFeedbackApplicationSelect;
}>;

export interface SaveEvaluationResultParams {
  interviewId: string;
  applicationId: string;
  currentStatus: ApplicationStatus;
  transcriptS3Key: string;
  technicalScore: number;
  communicationScore: number;
  relevanceScore: number;
  evidenceScore: number;
  totalScore: number;
  feedbackSummary: string;
  evidenceQuotes: EvidenceQuotesType;
  aiRecommendation: AiRecommendation.PASS | AiRecommendation.REJECT;
  candidateFeedback: CandidateFeedbackType;
}

export interface SaveInterviewDecisionParams {
  applicationId: string;
  interviewId: string;
  hrId: string;
  decision: 'PASS' | 'FAIL';
  note?: string;
  candidateMessage?: string;
}

export interface SaveInterviewDecisionResult {
  id: string;
  interviewId: string;
  status: ApplicationStatus.PASSED | ApplicationStatus.FAILED;
  decisionById: string;
  decisionAt: Date;
  decisionNote: string | null;
  candidateMessage: string | null;
  event: ApplicationStatusChangedPayload;
}

@Injectable()
export class InterviewEvaluationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationStateService: ApplicationStateService,
  ) {}

  findByInterviewId(interviewId: string): Promise<InterviewEvaluationRecord | null> {
    return this.prisma.interview.findUnique({
      where: { id: interviewId },
      select: interviewEvaluationRecordSelect,
    });
  }

  findByApplicationId(applicationId: string): Promise<InterviewEvaluationRecord | null> {
    return this.prisma.interview.findUnique({
      where: { applicationId },
      select: interviewEvaluationRecordSelect,
    });
  }

  findApplicationOwnership(applicationId: string) {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        candidateId: true,
        job: { select: { createdById: true } },
      },
    });
  }

  findCandidateFeedbackApplication(
    applicationId: string,
  ): Promise<CandidateFeedbackApplicationRecord | null> {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      select: candidateFeedbackApplicationSelect,
    });
  }

  findPendingRecoveryInterviewIds(): Promise<Array<{ id: string }>> {
    return this.prisma.interview.findMany({
      where: {
        completedAt: { not: null },
        result: null,
      },
      select: { id: true },
      orderBy: { completedAt: 'asc' },
    });
  }

  async saveEvaluationError(interviewId: string, errorMessage: string): Promise<void> {
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { evaluationError: errorMessage },
    });
  }

  async clearEvaluationError(interviewId: string): Promise<void> {
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { evaluationError: null },
    });
  }

  async autoCompleteExpiredSession(interviewId: string, completedAt: Date): Promise<boolean> {
    const updated = await this.prisma.interview.updateMany({
      where: {
        id: interviewId,
        completedAt: null,
        startedAt: { not: null },
      },
      data: { completedAt },
    });
    return updated.count > 0;
  }

  async saveEvaluationResult(
    params: SaveEvaluationResultParams,
  ): Promise<{ statusEvent: ApplicationStatusChangedPayload | null }> {
    return this.prisma.$transaction(async (tx) => {
      const resultPayload = {
        technicalScore: params.technicalScore,
        communicationScore: params.communicationScore,
        relevanceScore: params.relevanceScore,
        evidenceScore: params.evidenceScore,
        totalScore: params.totalScore,
        feedbackSummary: params.feedbackSummary,
        evidenceQuotes: params.evidenceQuotes as unknown as Prisma.InputJsonValue,
        aiRecommendation: params.aiRecommendation,
        candidateFeedback: params.candidateFeedback as unknown as Prisma.InputJsonValue,
      };

      await tx.interviewResult.upsert({
        where: { interviewId: params.interviewId },
        update: resultPayload,
        create: {
          interviewId: params.interviewId,
          ...resultPayload,
        },
      });

      await tx.interview.update({
        where: { id: params.interviewId },
        data: {
          transcriptS3Key: params.transcriptS3Key,
          evaluationError: null,
        },
      });

      let statusEvent: ApplicationStatusChangedPayload | null = null;
      if (params.currentStatus === ApplicationStatus.INTERVIEWING) {
        const transition = await this.applicationStateService.transition(
          params.applicationId,
          ApplicationStatus.EVALUATED,
          {
            actorId: null,
            reason: 'AI hoàn tất đánh giá vòng phỏng vấn',
            tx,
          },
        );
        statusEvent = transition.event;
      }

      return { statusEvent };
    });
  }

  saveInterviewDecision(
    params: SaveInterviewDecisionParams,
  ): Promise<SaveInterviewDecisionResult | null> {
    const decisionAt = new Date();
    const decisionNote = params.note?.trim() ? params.note.trim() : null;
    const candidateMessage = params.candidateMessage?.trim()
      ? params.candidateMessage.trim()
      : null;
    const toStatus =
      params.decision === 'PASS' ? ApplicationStatus.PASSED : ApplicationStatus.FAILED;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.interviewResult.updateMany({
        where: {
          interviewId: params.interviewId,
          decisionAt: null,
        },
        data: {
          decisionById: params.hrId,
          decisionAt,
          decisionNote,
          candidateMessage,
        },
      });

      if (claimed.count === 0) {
        return null;
      }

      const transition = await this.applicationStateService.transition(
        params.applicationId,
        toStatus,
        {
          actorId: params.hrId,
          reason: decisionNote,
          tx,
        },
      );

      return {
        id: params.applicationId,
        interviewId: params.interviewId,
        status: toStatus,
        decisionById: params.hrId,
        decisionAt,
        decisionNote,
        candidateMessage,
        event: {
          ...transition.event,
          candidateMessage,
        },
      };
    });
  }
}
