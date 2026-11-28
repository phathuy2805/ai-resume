import { type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AnswerSource, Role } from '../../../generated/prisma/client.js';
import { AiQueueService } from '../../../shared/ai/ai-queue.service.js';
import envConfig from '../../../shared/config/env.config.js';
import { ApplicationStatus } from '../../../shared/constants/application-status.enum.js';
import { HttpExceptionFilter } from '../../../shared/filters/http-exception.filter.js';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../shared/guards/roles.guard.js';
import { ApplicationStateService } from '../../../shared/services/application-state.service.js';
import { TokenService } from '../../../shared/services/token.service.js';
import { InterviewGateway } from '../interview.gateway.js';
import {
  INTERVIEW_AUTH_ERRORS,
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_ERROR_CODES,
  INTERVIEW_EVENTS,
  INTERVIEW_INVITE_TTL_MS,
  INTERVIEW_NAMESPACE,
  INTERVIEW_PHASES,
  QUESTION_PLANNER,
  TRANSCRIPT_STATUS,
} from '../interviews.constant.js';
import {
  InterviewsRepository,
  type ExpiredInProgressSessionRecord,
  type InterviewOwnershipRecord,
  type InterviewSessionRecord,
  type RecordTurnAnswerParams,
  type RecordTurnAnswerResult,
  type StartSessionWithTurnsParams,
  type StartSessionWithTurnsResult,
} from '../interviews.repository.js';
import { InterviewsService } from '../interviews.service.js';
import type {
  InterviewCompletedEventPayload,
  InterviewCompletedPayload,
  InterviewErrorPayload,
  InterviewPreparingPayload,
  InterviewQuestionPayload,
  InterviewStatePayload,
} from '../interviews.type.js';
import { FallbackQuestionPlannerService } from '../question-planner.service.js';

const INTERVIEW_ID = '550e8400-e29b-41d4-a716-446655440000';
const APP_ID = '44444444-4444-4444-8444-444444444444';
const JOB_ID = '22222222-2222-4222-8222-222222222222';
const CANDIDATE_A = '11111111-1111-4111-8111-111111111111';
const CANDIDATE_B = '99999999-9999-4999-8999-999999999999';

class InMemoryInterviewsRepository {
  sessions = new Map<string, InterviewSessionRecord>();

  reset(): void {
    this.sessions.clear();
    const now = new Date();
    this.sessions.set(INTERVIEW_ID, {
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
        parsedCv: { skills: ['NodeJS', 'PostgreSQL'] },
        job: {
          id: JOB_ID,
          title: 'Senior Backend NestJS',
          requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL'],
          preferredSkills: ['Redis'],
          parsedJd: { domain: 'Backend Engineering' },
          interviewQuestionCount: 3,
        },
        screeningResult: {
          breakdown: {
            requiredSkills: { missing: ['NestJS'] },
          },
        },
      },
      turns: [],
    });
  }

  simulateAudioUpload(interviewId: string, turnId: string, audioS3Key: string): void {
    const session = this.sessions.get(interviewId);
    const turn = session?.turns.find((t) => t.id === turnId);
    if (turn) {
      turn.audioS3Key = audioS3Key;
    }
  }

  async findOwnership(interviewId: string): Promise<InterviewOwnershipRecord | null> {
    const session = this.sessions.get(interviewId);
    if (!session) return null;
    return {
      id: session.id,
      applicationId: session.applicationId,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      completedAt: session.completedAt,
      application: {
        candidateId: session.application.candidateId,
        jobId: session.application.jobId,
        status: session.application.status,
      },
    };
  }

  async findSessionById(interviewId: string): Promise<InterviewSessionRecord | null> {
    const session = this.sessions.get(interviewId);
    return session ? structuredClone(session) : null;
  }

  async findExpiredInProgressSessions(): Promise<ExpiredInProgressSessionRecord[]> {
    return [];
  }

  async ensureTurnAskedAt(interviewId: string, turnId: string, askedAt: Date): Promise<void> {
    const turn = this.sessions.get(interviewId)?.turns.find((t) => t.id === turnId);
    if (turn && turn.askedAt === null) {
      turn.askedAt = askedAt;
    }
  }

  async autoCompleteExpiredSession(interviewId: string, completedAt: Date): Promise<boolean> {
    const session = this.sessions.get(interviewId);
    if (!session || session.completedAt !== null || session.startedAt === null) {
      return false;
    }
    session.completedAt = completedAt;
    return true;
  }

  async startSessionWithTurns(
    params: StartSessionWithTurnsParams,
  ): Promise<StartSessionWithTurnsResult> {
    const session = this.sessions.get(params.interviewId)!;
    session.application.status = ApplicationStatus.INTERVIEWING;
    session.recordingConsentAt = params.consentAt;
    session.startedAt = params.startedAt;
    session.turns = params.questions.map((item, idx) => ({
      id: randomUUID(),
      orderIndex: idx + 1,
      question: item.question,
      questionType: item.questionType,
      targetSkill: item.targetSkill,
      answerText: null,
      source: AnswerSource.VOICE,
      transcriptStatus: null,
      transcriptEdited: false,
      audioS3Key: null,
      askedAt: idx === 0 ? params.startedAt : null,
      answeredAt: null,
    }));

    return {
      turns: session.turns.map((turn) => ({
        id: turn.id,
        orderIndex: turn.orderIndex,
        question: turn.question,
      })),
      statusEvent: {
        applicationId: session.applicationId,
        jobId: session.application.jobId,
        fromStatus: ApplicationStatus.INTERVIEW_INVITED,
        toStatus: ApplicationStatus.INTERVIEWING,
        actorId: params.candidateId,
      },
    };
  }

  async recordTurnAnswer(params: RecordTurnAnswerParams): Promise<RecordTurnAnswerResult> {
    const session = this.sessions.get(params.interviewId);
    if (!session) return { recorded: false };
    const turn = session.turns.find((item) => item.id === params.turnId);
    if (!turn || turn.answeredAt !== null) {
      return { recorded: false };
    }

    turn.answerText = params.answerText;
    turn.source = params.source;
    turn.transcriptStatus = params.transcriptStatus;
    if (params.clearAudio) {
      turn.audioS3Key = null;
    }
    turn.answeredAt = params.answeredAt;

    if (params.nextTurnId) {
      const nextTurn = session.turns.find((item) => item.id === params.nextTurnId);
      if (nextTurn && nextTurn.askedAt === null) {
        nextTurn.askedAt = params.answeredAt;
      }
    }

    if (params.isFinalTurn) {
      session.completedAt = params.answeredAt;
    }

    return {
      recorded: true,
      completedAt: params.isFinalTurn ? params.answeredAt : null,
    };
  }
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event "${event}"`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('InterviewGateway (Socket.IO integration with global guards & filter)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwtService: JwtService;
  let tokenService: TokenService;
  let eventEmitter: EventEmitter2;
  let fakeRepo: InMemoryInterviewsRepository;
  const openSockets: Socket[] = [];

  function connectClient(token?: string): Socket {
    const socket = io(`${baseUrl}${INTERVIEW_NAMESPACE}`, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
      auth: token !== undefined ? { token } : {},
    });
    openSockets.push(socket);
    return socket;
  }

  beforeAll(async () => {
    fakeRepo = new InMemoryInterviewsRepository();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({}), EventEmitterModule.forRoot()],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        TokenService,
        AiQueueService,
        {
          provide: ApplicationStateService,
          useValue: { emitStatusChanged: () => {} },
        },
        {
          provide: InterviewsRepository,
          useValue: fakeRepo,
        },
        FallbackQuestionPlannerService,
        {
          provide: QUESTION_PLANNER,
          useExisting: FallbackQuestionPlannerService,
        },
        InterviewsService,
        InterviewGateway,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    jwtService = moduleRef.get(JwtService);
    tokenService = moduleRef.get(TokenService);
    eventEmitter = moduleRef.get(EventEmitter2);
  });

  beforeEach(() => {
    fakeRepo.reset();
  });

  afterAll(async () => {
    for (const socket of openSockets) {
      socket.disconnect();
    }
    await app.close();
  });

  it('rejects expired access token at handshake with AUTH_EXPIRED', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: CANDIDATE_A, email: 'a@hireflow.vn', role: Role.CANDIDATE },
      { secret: envConfig.ACCESS_TOKEN_SECRET, expiresIn: -10, algorithm: 'HS256' },
    );

    const socket = connectClient(expiredToken);
    const err = await waitForEvent<Error & { data?: { code?: string } }>(socket, 'connect_error');

    expect(err.message).toBe(INTERVIEW_AUTH_ERRORS.EXPIRED);
    expect(err.data?.code).toBe(INTERVIEW_AUTH_ERRORS.EXPIRED);
  });

  it('rejects missing or invalid access token at handshake with AUTH_INVALID', async () => {
    const noTokenSocket = connectClient();
    const errMissing = await waitForEvent<Error & { data?: { code?: string } }>(
      noTokenSocket,
      'connect_error',
    );
    expect(errMissing.message).toBe(INTERVIEW_AUTH_ERRORS.INVALID);

    const badTokenSocket = connectClient('not-a-valid-jwt');
    const errBad = await waitForEvent<Error & { data?: { code?: string } }>(
      badTokenSocket,
      'connect_error',
    );
    expect(errBad.message).toBe(INTERVIEW_AUTH_ERRORS.INVALID);
  });

  it('rejects another candidate trying to join an interview they do not own', async () => {
    const tokenB = await tokenService.signAccessToken({
      sub: CANDIDATE_B,
      email: 'b@hireflow.vn',
      role: Role.CANDIDATE,
    });
    const socket = connectClient(tokenB);
    await waitForEvent(socket, 'connect');

    const errorPromise = waitForEvent<InterviewErrorPayload>(socket, INTERVIEW_EVENTS.ERROR);
    socket.emit(INTERVIEW_EVENTS.JOIN, { interviewId: INTERVIEW_ID });
    const errPayload = await errorPromise;

    expect(errPayload.code).toBe(INTERVIEW_ERROR_CODES.FORBIDDEN);
  });

  it('runs full flow: join -> start -> VOICE error without audio -> VOICE with audio -> duplicate -> reconnect -> TEXT clears audio -> completed', async () => {
    const completedEvents: InterviewCompletedEventPayload[] = [];
    const listener = (payload: InterviewCompletedEventPayload) => {
      completedEvents.push(payload);
    };
    eventEmitter.on(INTERVIEW_COMPLETED_EVENT, listener);

    try {
      const tokenA = await tokenService.signAccessToken({
        sub: CANDIDATE_A,
        email: 'a@hireflow.vn',
        role: Role.CANDIDATE,
      });

      const socket1 = connectClient(tokenA);
      await waitForEvent(socket1, 'connect');

      const initialStatePromise = waitForEvent<InterviewStatePayload>(
        socket1,
        INTERVIEW_EVENTS.STATE,
      );
      socket1.emit(INTERVIEW_EVENTS.JOIN, { interviewId: INTERVIEW_ID });
      const initialState = await initialStatePromise;
      expect(initialState.status).toBe(ApplicationStatus.INTERVIEW_INVITED);
      expect(initialState.phase).toBe(INTERVIEW_PHASES.NOT_STARTED);
      expect(initialState.inviteExpiresAt).toBeTruthy();
      expect(initialState.sessionExpiresAt).toBeNull();

      const preparingPromise = waitForEvent<InterviewPreparingPayload>(
        socket1,
        INTERVIEW_EVENTS.PREPARING,
      );
      const q1Promise = waitForEvent<InterviewQuestionPayload>(socket1, INTERVIEW_EVENTS.QUESTION);
      socket1.emit(INTERVIEW_EVENTS.START, { consent: true });
      const preparing = await preparingPromise;
      const q1 = await q1Promise;
      expect(preparing.interviewId).toBe(INTERVIEW_ID);
      expect(q1.order).toBe(1);
      expect(q1.total).toBe(3);

      const noAudioErrPromise = waitForEvent<InterviewErrorPayload>(
        socket1,
        INTERVIEW_EVENTS.ERROR,
      );
      socket1.emit(INTERVIEW_EVENTS.ANSWER, {
        turnId: q1.turnId,
        source: 'VOICE',
      });
      expect((await noAudioErrPromise).code).toBe(INTERVIEW_ERROR_CODES.AUDIO_NOT_UPLOADED);

      fakeRepo.simulateAudioUpload(INTERVIEW_ID, q1.turnId, 'interviews/audio-1.webm');
      const q2Promise = waitForEvent<InterviewQuestionPayload>(socket1, INTERVIEW_EVENTS.QUESTION);
      socket1.emit(INTERVIEW_EVENTS.ANSWER, {
        turnId: q1.turnId,
        source: 'VOICE',
      });
      const q2 = await q2Promise;
      expect(q2.order).toBe(2);

      const dupStatePromise = waitForEvent<InterviewStatePayload>(socket1, INTERVIEW_EVENTS.STATE);
      socket1.emit(INTERVIEW_EVENTS.ANSWER, {
        turnId: q1.turnId,
        source: 'VOICE',
      });
      const dupState = await dupStatePromise;
      expect(dupState.currentQuestion?.turnId).toBe(q2.turnId);
      expect(dupState.answeredTurns).toHaveLength(1);

      socket1.disconnect();

      const socket2 = connectClient(tokenA);
      await waitForEvent(socket2, 'connect');
      const resumeStatePromise = waitForEvent<InterviewStatePayload>(
        socket2,
        INTERVIEW_EVENTS.STATE,
      );
      socket2.emit(INTERVIEW_EVENTS.JOIN, { interviewId: INTERVIEW_ID });
      const resumeState = await resumeStatePromise;
      expect(resumeState.phase).toBe(INTERVIEW_PHASES.IN_PROGRESS);
      expect(resumeState.sessionExpiresAt).toBeTruthy();
      expect(resumeState.answeredTurns).toHaveLength(1);
      expect(resumeState.currentQuestion).toEqual(q2);

      fakeRepo.simulateAudioUpload(INTERVIEW_ID, q2.turnId, 'interviews/audio-2-abandoned.webm');
      const q3Promise = waitForEvent<InterviewQuestionPayload>(socket2, INTERVIEW_EVENTS.QUESTION);
      socket2.emit(INTERVIEW_EVENTS.ANSWER, {
        turnId: q2.turnId,
        source: 'TEXT',
        text: 'Em tối ưu PostgreSQL bằng EXPLAIN ANALYZE và composite index.',
      });
      const q3 = await q3Promise;
      expect(q3.order).toBe(3);

      const savedSession = fakeRepo.sessions.get(INTERVIEW_ID)!;
      expect(savedSession.turns[1].audioS3Key).toBeNull();
      expect(savedSession.turns[1].transcriptStatus).toBeNull();

      fakeRepo.simulateAudioUpload(INTERVIEW_ID, q3.turnId, 'interviews/audio-3.webm');
      const completedPromise = waitForEvent<InterviewCompletedPayload>(
        socket2,
        INTERVIEW_EVENTS.COMPLETED,
      );
      socket2.emit(INTERVIEW_EVENTS.ANSWER, {
        turnId: q3.turnId,
        source: 'VOICE',
      });
      const completed = await completedPromise;
      expect(completed.interviewId).toBe(INTERVIEW_ID);
      expect(completed.transcriptStatus).toBe(TRANSCRIPT_STATUS.TRANSCRIBING);

      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0]).toMatchObject({
        interviewId: INTERVIEW_ID,
        applicationId: APP_ID,
        jobId: JOB_ID,
        candidateId: CANDIDATE_A,
      });
    } finally {
      eventEmitter.off(INTERVIEW_COMPLETED_EVENT, listener);
    }
  });

  it('rejects NOT_JOINED, TEXT missing text, VOICE with text, and TEXT > 3000 chars', async () => {
    const tokenA = await tokenService.signAccessToken({
      sub: CANDIDATE_A,
      email: 'a@hireflow.vn',
      role: Role.CANDIDATE,
    });
    const socket = connectClient(tokenA);
    await waitForEvent(socket, 'connect');

    const notJoinedPromise = waitForEvent<InterviewErrorPayload>(socket, INTERVIEW_EVENTS.ERROR);
    socket.emit(INTERVIEW_EVENTS.START, { consent: true });
    expect((await notJoinedPromise).code).toBe(INTERVIEW_ERROR_CODES.NOT_JOINED);

    const statePromise = waitForEvent<InterviewStatePayload>(socket, INTERVIEW_EVENTS.STATE);
    socket.emit(INTERVIEW_EVENTS.JOIN, { interviewId: INTERVIEW_ID });
    await statePromise;

    const q1Promise = waitForEvent<InterviewQuestionPayload>(socket, INTERVIEW_EVENTS.QUESTION);
    socket.emit(INTERVIEW_EVENTS.START, { consent: true });
    const q1 = await q1Promise;

    const missingTextErr = waitForEvent<InterviewErrorPayload>(socket, INTERVIEW_EVENTS.ERROR);
    socket.emit(INTERVIEW_EVENTS.ANSWER, { turnId: q1.turnId, source: 'TEXT' });
    expect((await missingTextErr).code).toBe(INTERVIEW_ERROR_CODES.INVALID_PAYLOAD);

    const voiceWithTextErr = waitForEvent<InterviewErrorPayload>(socket, INTERVIEW_EVENTS.ERROR);
    socket.emit(INTERVIEW_EVENTS.ANSWER, {
      turnId: q1.turnId,
      source: 'VOICE',
      text: 'không được phép gửi text ở VOICE',
    });
    expect((await voiceWithTextErr).code).toBe(INTERVIEW_ERROR_CODES.INVALID_PAYLOAD);

    const longTextErr = waitForEvent<InterviewErrorPayload>(socket, INTERVIEW_EVENTS.ERROR);
    socket.emit(INTERVIEW_EVENTS.ANSWER, {
      turnId: q1.turnId,
      source: 'TEXT',
      text: 'a'.repeat(3001),
    });
    expect((await longTextErr).code).toBe(INTERVIEW_ERROR_CODES.INVALID_PAYLOAD);
  });
});
