import { Injectable } from '@nestjs/common';
import type { AnswerSource, Prisma } from '../../generated/prisma/client.js';
import type { ApplicationStatusChangedPayload } from '../../shared/constants/application-event.constant.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import type { PlannedQuestion } from './interviews.type.js';

export const interviewOwnershipSelect = {
  id: true,
  applicationId: true,
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
      transcriptEdited: true,
      audioS3Key: true,
      answeredAt: true,
    },
  },
} satisfies Prisma.InterviewSelect;

export type InterviewSessionRecord = Prisma.InterviewGetPayload<{
  select: typeof interviewSessionSelect;
}>;

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
  audioS3Key: string | null;
  transcriptEdited: boolean;
  answeredAt: Date;
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
          reason: 'Ứng viên đồng ý ghi âm và bắt đầu phỏng vấn AI',
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
    audioS3Key,
    transcriptEdited,
    answeredAt,
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
          audioS3Key,
          transcriptEdited,
          answeredAt,
        },
      });

      if (updated.count === 0) {
        return { recorded: false };
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
