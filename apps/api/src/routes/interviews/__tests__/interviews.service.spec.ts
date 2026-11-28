import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnswerSource, TurnTranscriptStatus } from '../../../generated/prisma/client.js';
import { AiQueueService } from '../../../shared/ai/ai-queue.service.js';
import { ApplicationStatus } from '../../../shared/constants/application-status.enum.js';
import type { ApplicationStateService } from '../../../shared/services/application-state.service.js';
import {
  INTERVIEW_AI_QUEUE_PRIORITY,
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_ERROR_CODES,
  INTERVIEW_INVITE_TTL_MS,
  INTERVIEW_PHASES,
  INTERVIEW_SESSION_TTL_MS,
  TRANSCRIPT_STATUS,
} from '../interviews.constant.js';
import { InterviewWebSocketError } from '../interviews.error.js';
import type {
  InterviewOwnershipRecord,
  InterviewSessionRecord,
  InterviewsRepository,
} from '../interviews.repository.js';
import { InterviewsService } from '../interviews.service.js';
import type { QuestionPlanner } from '../interviews.type.js';

const INTERVIEW_ID = '550e8400-e29b-41d4-a716-446655440000';
const APP_ID = '44444444-4444-4444-8444-444444444444';
const JOB_ID = '22222222-2222-4222-8222-222222222222';
const CANDIDATE_A = '11111111-1111-4111-8111-111111111111';
const CANDIDATE_B = '99999999-9999-4999-8999-999999999999';
const TURN_1_ID = '660e8400-e29b-41d4-a716-446655440001';
const TURN_2_ID = '660e8400-e29b-41d4-a716-446655440002';

function makeOwnership(
  overrides: Partial<InterviewOwnershipRecord> = {},
): InterviewOwnershipRecord {
  const now = new Date();
  return {
    id: INTERVIEW_ID,
    applicationId: APP_ID,
    createdAt: now,
    startedAt: null,
    expiresAt: new Date(now.getTime() + INTERVIEW_INVITE_TTL_MS),
    completedAt: null,
    application: {
      candidateId: CANDIDATE_A,
      jobId: JOB_ID,
      status: ApplicationStatus.INTERVIEW_INVITED,
    },
    ...overrides,
  };
}

function makeSession(overrides: Partial<InterviewSessionRecord> = {}): InterviewSessionRecord {
  const now = new Date();
  return {
    id: INTERVIEW_ID,
    applicationId: APP_ID,
    recordingConsentAt: null,
    startedAt: null,
    completedAt: null,
    expiresAt: new Date(now.getTime() + INTERVIEW_INVITE_TTL_MS),
    evaluationError: null,
    createdAt: now,
    application: {
      id: APP_ID,
      jobId: JOB_ID,
      candidateId: CANDIDATE_A,
      status: ApplicationStatus.INTERVIEW_INVITED,
      parsedCv: { skills: ['NodeJS'] },
      job: {
        id: JOB_ID,
        title: 'Backend NestJS',
        requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
        preferredSkills: ['Redis'],
        parsedJd: { domain: 'Backend' },
        interviewQuestionCount: 3,
      },
      screeningResult: {
        breakdown: {
          requiredSkills: {
            missing: ['NestJS'],
          },
        },
      },
    },
    turns: [],
    ...overrides,
  };
}

describe('InterviewsService', () => {
  let repo: {
    findOwnership: ReturnType<typeof vi.fn>;
    findSessionById: ReturnType<typeof vi.fn>;
    findExpiredInProgressSessions: ReturnType<typeof vi.fn>;
    ensureTurnAskedAt: ReturnType<typeof vi.fn>;
    autoCompleteExpiredSession: ReturnType<typeof vi.fn>;
    startSessionWithTurns: ReturnType<typeof vi.fn>;
    recordTurnAnswer: ReturnType<typeof vi.fn>;
  };
  let aiQueue: AiQueueService;
  let stateService: { emitStatusChanged: ReturnType<typeof vi.fn> };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let questionPlanner: { generateQuestionPlan: ReturnType<typeof vi.fn> };
  let service: InterviewsService;

  beforeEach(() => {
    repo = {
      findOwnership: vi.fn(),
      findSessionById: vi.fn(),
      findExpiredInProgressSessions: vi.fn().mockResolvedValue([]),
      ensureTurnAskedAt: vi.fn().mockResolvedValue(undefined),
      autoCompleteExpiredSession: vi.fn().mockResolvedValue(true),
      startSessionWithTurns: vi.fn(),
      recordTurnAnswer: vi.fn(),
    };
    aiQueue = new AiQueueService();
    stateService = { emitStatusChanged: vi.fn() };
    eventEmitter = { emit: vi.fn() };
    questionPlanner = {
      generateQuestionPlan: vi.fn().mockResolvedValue([
        { question: 'Câu 1', questionType: 'EXPERIENCE', targetSkill: 'NodeJS' },
        { question: 'Câu 2', questionType: 'TECHNICAL', targetSkill: 'NestJS' },
      ]),
    };

    service = new InterviewsService(
      repo as unknown as InterviewsRepository,
      aiQueue,
      stateService as unknown as ApplicationStateService,
      eventEmitter as unknown as EventEmitter2,
      questionPlanner as unknown as QuestionPlanner,
    );
  });

  describe('assertInterviewOwner & assertInterviewOwnerForHttp', () => {
    it('returns ownership record for the owning candidate', async () => {
      const record = makeOwnership();
      repo.findOwnership.mockResolvedValueOnce(record);

      const res = await service.assertInterviewOwner(INTERVIEW_ID, CANDIDATE_A);
      expect(res).toEqual(record);
    });

    it('throws INTERVIEW_NOT_FOUND (and 404 for HTTP) when interview does not exist', async () => {
      repo.findOwnership.mockResolvedValue(null);

      await expect(service.assertInterviewOwner(INTERVIEW_ID, CANDIDATE_A)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.INTERVIEW_NOT_FOUND,
      });
      await expect(
        service.assertInterviewOwnerForHttp(INTERVIEW_ID, CANDIDATE_A),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws FORBIDDEN (and 403 for HTTP) when another candidate accesses the interview', async () => {
      repo.findOwnership.mockResolvedValue(makeOwnership());

      await expect(service.assertInterviewOwner(INTERVIEW_ID, CANDIDATE_B)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.FORBIDDEN,
      });
      await expect(
        service.assertInterviewOwnerForHttp(INTERVIEW_ID, CANDIDATE_B),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('joinInterview', () => {
    it('returns NOT_STARTED phase, inviteExpiresAt, and null sessionExpiresAt when INTERVIEW_INVITED', async () => {
      repo.findSessionById.mockResolvedValueOnce(makeSession());

      const state = await service.joinInterview(INTERVIEW_ID, CANDIDATE_A);

      expect(state.status).toBe(ApplicationStatus.INTERVIEW_INVITED);
      expect(state.phase).toBe(INTERVIEW_PHASES.NOT_STARTED);
      expect(state.inviteExpiresAt).toBeTruthy();
      expect(state.sessionExpiresAt).toBeNull();
      expect(state.isExpired).toBe(false);
      expect(state.transcriptStatus).toBe(TRANSCRIPT_STATUS.NONE);
      expect(state.totalQuestions).toBe(3);
      expect(state.currentQuestion).toBeNull();
    });

    it('resumes at first unanswered turn without overwriting existing askedAt', async () => {
      const startedAt = new Date(Date.now() - 10 * 60_000);
      const asked1 = new Date(Date.now() - 10 * 60_000);
      const answered1 = new Date(Date.now() - 8 * 60_000);
      repo.findSessionById.mockResolvedValueOnce(
        makeSession({
          startedAt,
          application: {
            ...makeSession().application,
            status: ApplicationStatus.INTERVIEWING,
          },
          turns: [
            {
              id: TURN_1_ID,
              orderIndex: 1,
              question: 'Câu 1',
              questionType: 'EXPERIENCE',
              targetSkill: 'NodeJS',
              answerText: null,
              source: AnswerSource.VOICE,
              transcriptStatus: TurnTranscriptStatus.PENDING,
              transcriptEdited: false,
              audioS3Key: 'interviews/turn-1.webm',
              askedAt: asked1,
              answeredAt: answered1,
            },
            {
              id: TURN_2_ID,
              orderIndex: 2,
              question: 'Câu 2',
              questionType: 'TECHNICAL',
              targetSkill: 'NestJS',
              answerText: null,
              source: AnswerSource.VOICE,
              transcriptStatus: null,
              transcriptEdited: false,
              audioS3Key: null,
              askedAt: answered1,
              answeredAt: null,
            },
          ],
        }),
      );

      const state = await service.joinInterview(INTERVIEW_ID, CANDIDATE_A);

      expect(state.phase).toBe(INTERVIEW_PHASES.IN_PROGRESS);
      expect(state.sessionExpiresAt).toBe(
        new Date(startedAt.getTime() + INTERVIEW_SESSION_TTL_MS).toISOString(),
      );
      expect(repo.ensureTurnAskedAt).not.toHaveBeenCalled();
      expect(state.answeredTurns).toHaveLength(1);
      expect(state.answeredTurns[0].askedAt).toBe(asked1.toISOString());
      expect(state.currentQuestion).toEqual({
        turnId: TURN_2_ID,
        order: 2,
        total: 2,
        text: 'Câu 2',
      });
    });

    it('returns EXPIRED phase when invite deadline (7 days) passed without starting', async () => {
      repo.findSessionById.mockResolvedValueOnce(
        makeSession({
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );

      const state = await service.joinInterview(INTERVIEW_ID, CANDIDATE_A);

      expect(state.phase).toBe(INTERVIEW_PHASES.EXPIRED);
      expect(state.isExpired).toBe(true);
      expect(state.currentQuestion).toBeNull();
    });

    it('auto-completes session and emits interview.completed when startedAt > 24 hours ago', async () => {
      const startedAt = new Date(Date.now() - INTERVIEW_SESSION_TTL_MS - 60_000);
      const expectedCompletedAt = new Date(startedAt.getTime() + INTERVIEW_SESSION_TTL_MS);

      repo.findSessionById.mockResolvedValueOnce(
        makeSession({
          startedAt,
          completedAt: null,
          application: {
            ...makeSession().application,
            status: ApplicationStatus.INTERVIEWING,
          },
          turns: [
            {
              id: TURN_1_ID,
              orderIndex: 1,
              question: 'Câu 1',
              questionType: 'EXPERIENCE',
              targetSkill: 'NodeJS',
              answerText: null,
              source: AnswerSource.VOICE,
              transcriptStatus: null,
              transcriptEdited: false,
              audioS3Key: null,
              askedAt: startedAt,
              answeredAt: null,
            },
          ],
        }),
      );

      const state = await service.joinInterview(INTERVIEW_ID, CANDIDATE_A);

      expect(repo.autoCompleteExpiredSession).toHaveBeenCalledWith(
        INTERVIEW_ID,
        expectedCompletedAt,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(INTERVIEW_COMPLETED_EVENT, {
        interviewId: INTERVIEW_ID,
        applicationId: APP_ID,
        jobId: JOB_ID,
        candidateId: CANDIDATE_A,
        completedAt: expectedCompletedAt,
      });
      expect(state.phase).toBe(INTERVIEW_PHASES.SUBMITTED);
      expect(state.completedAt).toBe(expectedCompletedAt.toISOString());
      expect(state.currentQuestion).toBeNull();
    });

    it('returns DELAYED and processingDelayed=true without leaking evaluationError details', async () => {
      const completedAt = new Date();
      repo.findSessionById.mockResolvedValueOnce(
        makeSession({
          startedAt: new Date(Date.now() - 10 * 60_000),
          completedAt,
          evaluationError: 'Gemini 503 UNAVAILABLE internal stack trace',
          application: {
            ...makeSession().application,
            status: ApplicationStatus.INTERVIEWING,
          },
          turns: [
            {
              id: TURN_1_ID,
              orderIndex: 1,
              question: 'Câu 1',
              questionType: 'EXPERIENCE',
              targetSkill: 'NodeJS',
              answerText: null,
              source: AnswerSource.VOICE,
              transcriptStatus: TurnTranscriptStatus.PENDING,
              transcriptEdited: false,
              audioS3Key: 'interviews/turn-1.webm',
              askedAt: new Date(Date.now() - 10 * 60_000),
              answeredAt: completedAt,
            },
          ],
        }),
      );

      const state = await service.joinInterview(INTERVIEW_ID, CANDIDATE_A);

      expect(state.phase).toBe(INTERVIEW_PHASES.SUBMITTED);
      expect(state.transcriptStatus).toBe(TRANSCRIPT_STATUS.DELAYED);
      expect(state.processingDelayed).toBe(true);
      expect(state).not.toHaveProperty('evaluationError');
    });
  });

  describe('onApplicationBootstrap / autoCompleteExpiredSessions', () => {
    it('auto-completes all in-progress sessions older than 24h and emits interview.completed', async () => {
      const startedAt = new Date(Date.now() - INTERVIEW_SESSION_TTL_MS - 300_000);
      repo.findExpiredInProgressSessions.mockResolvedValueOnce([
        {
          id: INTERVIEW_ID,
          applicationId: APP_ID,
          startedAt,
          application: {
            jobId: JOB_ID,
            candidateId: CANDIDATE_A,
          },
        },
      ]);

      await service.onApplicationBootstrap();

      expect(repo.autoCompleteExpiredSession).toHaveBeenCalledWith(
        INTERVIEW_ID,
        new Date(startedAt.getTime() + INTERVIEW_SESSION_TTL_MS),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        INTERVIEW_COMPLETED_EVENT,
        expect.objectContaining({
          interviewId: INTERVIEW_ID,
          applicationId: APP_ID,
        }),
      );
    });
  });

  describe('startInterview', () => {
    it('rejects when consent is false with CONSENT_REQUIRED', async () => {
      await expect(service.startInterview(INTERVIEW_ID, CANDIDATE_A, false)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.CONSENT_REQUIRED,
      });
      expect(repo.findSessionById).not.toHaveBeenCalled();
    });

    it('rejects when invite is expired (>7 days) with INTERVIEW_EXPIRED', async () => {
      repo.findSessionById.mockResolvedValueOnce(
        makeSession({
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 10_000),
        }),
      );

      await expect(service.startInterview(INTERVIEW_ID, CANDIDATE_A, true)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.INTERVIEW_EXPIRED,
      });
    });

    it('queues question planning on live lane, persists turns, emits status event, and returns question 1', async () => {
      const addSpy = vi.spyOn(aiQueue, 'add');
      const onPreparing = vi.fn();
      const statusEvent = {
        applicationId: APP_ID,
        jobId: JOB_ID,
        fromStatus: ApplicationStatus.INTERVIEW_INVITED,
        toStatus: ApplicationStatus.INTERVIEWING,
        actorId: CANDIDATE_A,
      };
      repo.findSessionById.mockResolvedValueOnce(makeSession());
      repo.startSessionWithTurns.mockResolvedValueOnce({
        turns: [
          { id: TURN_1_ID, orderIndex: 1, question: 'Câu 1' },
          { id: TURN_2_ID, orderIndex: 2, question: 'Câu 2' },
        ],
        statusEvent,
      });

      const res = await service.startInterview(INTERVIEW_ID, CANDIDATE_A, true, onPreparing);

      expect(onPreparing).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith(expect.any(Function), {
        priority: INTERVIEW_AI_QUEUE_PRIORITY,
        lane: 'live',
      });
      expect(stateService.emitStatusChanged).toHaveBeenCalledWith(statusEvent);
      expect(res).toEqual({
        kind: 'STARTED',
        firstQuestion: {
          turnId: TURN_1_ID,
          order: 1,
          total: 2,
          text: 'Câu 1',
        },
      });
    });

    it('keeps INTERVIEW_INVITED on AI failure and releases lock so retry succeeds', async () => {
      repo.findSessionById.mockResolvedValue(makeSession());
      questionPlanner.generateQuestionPlan
        .mockRejectedValueOnce(new Error('Gemini timeout'))
        .mockResolvedValueOnce([
          { question: 'Câu 1 retry', questionType: 'EXPERIENCE', targetSkill: 'NodeJS' },
        ]);
      repo.startSessionWithTurns.mockResolvedValueOnce({
        turns: [{ id: TURN_1_ID, orderIndex: 1, question: 'Câu 1 retry' }],
        statusEvent: {
          applicationId: APP_ID,
          jobId: JOB_ID,
          fromStatus: ApplicationStatus.INTERVIEW_INVITED,
          toStatus: ApplicationStatus.INTERVIEWING,
          actorId: CANDIDATE_A,
        },
      });

      await expect(service.startInterview(INTERVIEW_ID, CANDIDATE_A, true)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.QUESTION_GENERATION_FAILED,
      });
      expect(repo.startSessionWithTurns).not.toHaveBeenCalled();

      const retryRes = await service.startInterview(INTERVIEW_ID, CANDIDATE_A, true);
      expect(retryRes).toEqual({
        kind: 'STARTED',
        firstQuestion: {
          turnId: TURN_1_ID,
          order: 1,
          total: 1,
          text: 'Câu 1 retry',
        },
      });
    });

    it('ignores concurrent duplicate start calls silently without calling AI twice', async () => {
      let resolvePlan!: (value: unknown) => void;
      questionPlanner.generateQuestionPlan.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePlan = resolve;
        }),
      );
      repo.findSessionById.mockResolvedValue(makeSession());
      repo.startSessionWithTurns.mockResolvedValueOnce({
        turns: [{ id: TURN_1_ID, orderIndex: 1, question: 'Câu 1' }],
        statusEvent: {
          applicationId: APP_ID,
          jobId: JOB_ID,
          fromStatus: ApplicationStatus.INTERVIEW_INVITED,
          toStatus: ApplicationStatus.INTERVIEWING,
          actorId: CANDIDATE_A,
        },
      });

      const firstPromise = service.startInterview(INTERVIEW_ID, CANDIDATE_A, true);
      await Promise.resolve();

      const secondRes = await service.startInterview(INTERVIEW_ID, CANDIDATE_A, true);
      expect(secondRes).toEqual({ kind: 'IGNORED' });
      expect(questionPlanner.generateQuestionPlan).toHaveBeenCalledTimes(1);

      resolvePlan([{ question: 'Câu 1', questionType: 'EXPERIENCE', targetSkill: 'NodeJS' }]);
      await firstPromise;
    });

    it('maps ConflictException from optimistic transition to INVALID_STATE', async () => {
      repo.findSessionById.mockResolvedValueOnce(makeSession());
      repo.startSessionWithTurns.mockRejectedValueOnce(new ConflictException('Already started'));

      await expect(service.startInterview(INTERVIEW_ID, CANDIDATE_A, true)).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.INVALID_STATE,
      });
    });
  });

  describe('submitAnswer', () => {
    function makeInterviewingSession(): InterviewSessionRecord {
      const startedAt = new Date(Date.now() - 5 * 60_000);
      return makeSession({
        startedAt,
        application: {
          ...makeSession().application,
          status: ApplicationStatus.INTERVIEWING,
        },
        turns: [
          {
            id: TURN_1_ID,
            orderIndex: 1,
            question: 'Câu 1',
            questionType: 'EXPERIENCE',
            targetSkill: 'NodeJS',
            answerText: null,
            source: AnswerSource.VOICE,
            transcriptStatus: null,
            transcriptEdited: false,
            audioS3Key: 'interviews/turn-1.webm',
            askedAt: startedAt,
            answeredAt: null,
          },
          {
            id: TURN_2_ID,
            orderIndex: 2,
            question: 'Câu 2',
            questionType: 'TECHNICAL',
            targetSkill: 'NestJS',
            answerText: null,
            source: AnswerSource.VOICE,
            transcriptStatus: null,
            transcriptEdited: false,
            audioS3Key: 'interviews/turn-2.webm',
            askedAt: null,
            answeredAt: null,
          },
        ],
      });
    }

    it('rejects VOICE answer with AUDIO_NOT_UPLOADED when turn has no audioS3Key in DB', async () => {
      const session = makeInterviewingSession();
      session.turns[0].audioS3Key = null;
      repo.findSessionById.mockResolvedValueOnce(session);

      await expect(
        service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
          turnId: TURN_1_ID,
          source: 'VOICE',
        }),
      ).rejects.toMatchObject({
        code: INTERVIEW_ERROR_CODES.AUDIO_NOT_UPLOADED,
      });
      expect(repo.recordTurnAnswer).not.toHaveBeenCalled();
    });

    it('records VOICE answer with null answerText, PENDING transcriptStatus, and sets askedAt for next turn', async () => {
      repo.findSessionById.mockResolvedValueOnce(makeInterviewingSession());
      repo.recordTurnAnswer.mockResolvedValueOnce({ recorded: true, completedAt: null });

      const res = await service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
        turnId: TURN_1_ID,
        source: 'VOICE',
      });

      expect(repo.recordTurnAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          interviewId: INTERVIEW_ID,
          turnId: TURN_1_ID,
          answerText: null,
          source: AnswerSource.VOICE,
          transcriptStatus: TurnTranscriptStatus.PENDING,
          clearAudio: false,
          nextTurnId: TURN_2_ID,
          isFinalTurn: false,
        }),
      );
      expect(res).toEqual({
        kind: 'NEXT_QUESTION',
        question: {
          turnId: TURN_2_ID,
          order: 2,
          total: 2,
          text: 'Câu 2',
        },
      });
    });

    it('clears previously uploaded audio (clearAudio=true, transcriptStatus=null) when candidate switches to TEXT', async () => {
      repo.findSessionById.mockResolvedValueOnce(makeInterviewingSession());
      repo.recordTurnAnswer.mockResolvedValueOnce({ recorded: true, completedAt: null });

      const res = await service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
        turnId: TURN_1_ID,
        source: 'TEXT',
        text: 'Em chuyển sang trả lời bằng chữ',
      });

      expect(repo.recordTurnAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          turnId: TURN_1_ID,
          answerText: 'Em chuyển sang trả lời bằng chữ',
          source: AnswerSource.TEXT,
          transcriptStatus: null,
          clearAudio: true,
          nextTurnId: TURN_2_ID,
        }),
      );
      expect(res.kind).toBe('NEXT_QUESTION');
    });

    it('returns DUPLICATE with current state when resubmitting an already-answered turn', async () => {
      const answeredSession = makeInterviewingSession();
      answeredSession.turns[0].answeredAt = new Date();
      repo.findSessionById.mockResolvedValueOnce(answeredSession);

      const res = await service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
        turnId: TURN_1_ID,
        source: 'VOICE',
      });

      expect(repo.recordTurnAnswer).not.toHaveBeenCalled();
      expect(res.kind).toBe('DUPLICATE');
      if (res.kind === 'DUPLICATE') {
        expect(res.state.currentQuestion?.turnId).toBe(TURN_2_ID);
      }
    });

    it('rejects answering a future turn out of order', async () => {
      repo.findSessionById.mockResolvedValueOnce(makeInterviewingSession());

      const err = await service
        .submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
          turnId: TURN_2_ID,
          source: 'TEXT',
          text: 'Trả lời nhảy cóc',
        })
        .catch((e) => e);

      expect(err).toBeInstanceOf(InterviewWebSocketError);
      expect((err as InterviewWebSocketError).code).toBe(INTERVIEW_ERROR_CODES.INVALID_PAYLOAD);
    });

    it('completes session on final turn and emits interview.completed event', async () => {
      const session = makeInterviewingSession();
      session.turns[0].answeredAt = new Date();
      const completedAt = new Date();

      repo.findSessionById.mockResolvedValueOnce(session);
      repo.recordTurnAnswer.mockResolvedValueOnce({ recorded: true, completedAt });

      const res = await service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
        turnId: TURN_2_ID,
        source: 'VOICE',
      });

      expect(res).toEqual({
        kind: 'COMPLETED',
        completed: {
          interviewId: INTERVIEW_ID,
          completedAt: completedAt.toISOString(),
          transcriptStatus: TRANSCRIPT_STATUS.TRANSCRIBING,
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(INTERVIEW_COMPLETED_EVENT, {
        interviewId: INTERVIEW_ID,
        applicationId: APP_ID,
        jobId: JOB_ID,
        candidateId: CANDIDATE_A,
        completedAt,
      });
    });

    it('returns READY transcriptStatus immediately when all answers are TEXT', async () => {
      const session = makeInterviewingSession();
      session.turns[0].answeredAt = new Date();
      session.turns[0].source = AnswerSource.TEXT;
      session.turns[0].answerText = 'Câu trả lời 1 bằng text';
      const completedAt = new Date();

      repo.findSessionById.mockResolvedValueOnce(session);
      repo.recordTurnAnswer.mockResolvedValueOnce({ recorded: true, completedAt });

      const res = await service.submitAnswer(INTERVIEW_ID, CANDIDATE_A, {
        turnId: TURN_2_ID,
        source: 'TEXT',
        text: 'Câu trả lời 2 bằng text',
      });

      expect(res).toEqual({
        kind: 'COMPLETED',
        completed: {
          interviewId: INTERVIEW_ID,
          completedAt: completedAt.toISOString(),
          transcriptStatus: TRANSCRIPT_STATUS.READY,
        },
      });
    });
  });
});
