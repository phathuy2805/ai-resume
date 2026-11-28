import { Injectable } from '@nestjs/common';
import { AnswerSource, type Prisma, type TurnTranscriptStatus } from '../../generated/prisma/client.js';
import type { ApplicationStatusChangedPayload } from '../../shared/constants/application-event.constant.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import type { PlannedQuestion } from './interviews.type.js';

export const interviewOwnershipSelect = {
  id: true,
  applicationId: true,
  createdAt: true,
  startedAt: true,
  expiresAt: true,
  completedAt: true,
  application: {
    select: {
      candidateId: true,
      jobId: true,
      status: true,
    },
  },
} satisfies Prisma.InterviewSelect;

export type InterviewOwnershipRecord = Prisma.InterviewGetPayload<{
  select: typeof interviewOwnershipSelect;
}>;

export const interviewSessionSelect = {
  id: true,
  applicationId: true,
  recordingConsentAt: true,
  startedAt: true,
  completedAt: true,
  expiresAt: true,
  evaluationError: true,
  createdAt: true,
  application: {
    select: {
      id: true,
      jobId: true,
      candidateId: true,
      status: true,
      parsedCv: true,
      job: {
        select: {
          id: true,
          title: true,
          requiredSkills: true,
          preferredSkills: true,
          parsedJd: true,
          interviewQuestionCount: true,
        },
      },
      screeningResult: {
        select: {
          breakdown: true,
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
} satisfies Prisma.InterviewSelect;

export type InterviewSessionRecord = Prisma.InterviewGetPayload<{
  select: typeof interviewSessionSelect;
}>;

export interface ExpiredInProgressSessionRecord {
  id: string;
  applicationId: string;
  startedAt: Date | null;
  application: {
    jobId: string;
    candidateId: string;
  };
}

export interface StartSessionWithTurnsParams {
  interviewId: string;
  applicationId: string;
  candidateId: string;
  consentAt: Date;
  startedAt: Date;
  questions: PlannedQuestion[];
}

export interface CreatedTurnRecord {
  id: string;
  orderIndex: number;
  question: string;
}

export interface StartSessionWithTurnsResult {
  turns: CreatedTurnRecord[];
  statusEvent: ApplicationStatusChangedPayload;
}

export interface RecordTurnAnswerParams {
  interviewId: string;
  turnId: string;
  answerText: string | null;
  source: AnswerSource;
  transcriptStatus: TurnTranscriptStatus | null;
  clearAudio: boolean;
  answeredAt: Date;
  nextTurnId: string | null;
  isFinalTurn: boolean;
}

export type RecordTurnAnswerResult =
  | { recorded: false }
  | { recorded: true; completedAt: Date | null };

@Injectable()
export class InterviewsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationStateService: ApplicationStateService,
  ) {}

  findOwnership(interviewId: string): Promise<InterviewOwnershipRecord | null> {
    return this.prisma.interview.findUnique({
      where: { id: interviewId },
      select: interviewOwnershipSelect,
    });
  }

  findSessionById(interviewId: string): Promise<InterviewSessionRecord | null> {
    return this.prisma.interview.findUnique({
      where: { id: interviewId },
      select: interviewSessionSelect,
    });
  }

  findExpiredInProgressSessions(
    cutoffStartedBefore: Date,
  ): Promise<ExpiredInProgressSessionRecord[]> {
    return this.prisma.interview.findMany({
      where: {
        startedAt: { lte: cutoffStartedBefore },
        completedAt: null,
      },
      select: {
        id: true,
        applicationId: true,
        startedAt: true,
        application: {
          select: {
            jobId: true,
            candidateId: true,
          },
        },
      },
    });
  }

  async ensureTurnAskedAt(interviewId: string, turnId: string, askedAt: Date): Promise<void> {
    await this.prisma.interviewTurn.updateMany({
      where: {
        id: turnId,
        interviewId,
        askedAt: null,
      },
      data: { askedAt },
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

  startSessionWithTurns({
    interviewId,
    applicationId,
    candidateId,
    consentAt,
    startedAt,
    questions,
  }: StartSessionWithTurnsParams): Promise<StartSessionWithTurnsResult> {
    return this.prisma.$transaction(async (tx) => {
      const transition = await this.applicationStateService.transition(
        applicationId,
        ApplicationStatus.INTERVIEWING,
        {
          actorId: candidateId,
          reason: 'Ứng viên đồng ý AI xử lý và bắt đầu phỏng vấn',
          tx,
        },
      );

      await tx.interview.update({
        where: { id: interviewId },
        data: {
          recordingConsentAt: consentAt,
          startedAt,
        },
      });

      const turns: CreatedTurnRecord[] = [];
      for (let i = 0; i < questions.length; i++) {
        const item = questions[i];
        const created = await tx.interviewTurn.create({
          data: {
            interviewId,
            orderIndex: i + 1,
            question: item.question,
            questionType: item.questionType,
            targetSkill: item.targetSkill,
            askedAt: i === 0 ? startedAt : null,
          },
          select: {
            id: true,
            orderIndex: true,
            question: true,
          },
        });
        turns.push(created);
      }

      return {
        turns,
        statusEvent: transition.event,
      };
    });
  }

  recordTurnAnswer({
    interviewId,
    turnId,
    answerText,
    source,
    transcriptStatus,
    clearAudio,
    answeredAt,
    nextTurnId,
    isFinalTurn,
  }: RecordTurnAnswerParams): Promise<RecordTurnAnswerResult> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.interviewTurn.updateMany({
        where: {
          id: turnId,
          interviewId,
          answeredAt: null,
        },
        data: {
          answerText,
          source,
          transcriptStatus,
          ...(clearAudio ? { audioS3Key: null } : {}),
          answeredAt,
        },
      });

      if (updated.count === 0) {
        return { recorded: false };
      }

      if (nextTurnId) {
        await tx.interviewTurn.updateMany({
          where: {
            id: nextTurnId,
            interviewId,
            askedAt: null,
          },
          data: { askedAt: answeredAt },
        });
      }

      if (isFinalTurn) {
        await tx.interview.update({
          where: { id: interviewId },
          data: { completedAt: answeredAt },
        });
      }

      return {
        recorded: true,
        completedAt: isFinalTurn ? answeredAt : null,
      };
    });
  }
}
