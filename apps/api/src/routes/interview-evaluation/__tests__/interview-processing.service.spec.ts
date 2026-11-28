import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnswerSource, TurnTranscriptStatus } from '../../../generated/prisma/client.js';
import envConfig from '../../../shared/config/env.config.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../../shared/constants/application-status.enum.js';
import type { AiQueueService } from '../../../shared/ai/ai-queue.service.js';
import type { ApplicationStateService } from '../../../shared/services/application-state.service.js';
import type { StorageService } from '../../../shared/services/storage.service.js';
import type {
  EvaluateInterviewOutput,
  InterviewEvaluator,
  InterviewTranscriber,
} from '../interview-evaluation.adapters.js';
import type {
  InterviewEvaluationRecord,
  InterviewEvaluationRepository,
} from '../interview-evaluation.repository.js';
import { InterviewProcessingService } from '../interview-processing.service.js';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const APPLICATION_ID = '22222222-2222-4222-8222-222222222222';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const HR_ID = '44444444-4444-4444-8444-444444444444';
const CANDIDATE_ID = '55555555-5555-4555-8555-555555555555';

function buildSessionRecord(
  overrides: Partial<InterviewEvaluationRecord> = {},
): InterviewEvaluationRecord {
  const now = new Date('2026-11-28T02:00:00.000Z');
  return {
    id: INTERVIEW_ID,
    applicationId: APPLICATION_ID,
    recordingConsentAt: now,
    startedAt: new Date('2026-11-28T01:40:00.000Z'),
    completedAt: now,
    expiresAt: new Date('2026-12-05T02:00:00.000Z'),
    transcriptS3Key: null,
    evaluationError: null,
    createdAt: new Date('2026-11-27T02:00:00.000Z'),
    application: {
      id: APPLICATION_ID,
      jobId: JOB_ID,
      candidateId: CANDIDATE_ID,
      status: ApplicationStatus.INTERVIEWING,
      job: {
        id: JOB_ID,
        title: 'Backend Engineer',
        createdById: HR_ID,
        requiredSkills: ['Node.js', 'PostgreSQL'],
        parsedJd: { role: 'Backend Engineer' },
        rubricWeights: {
          technical: 40,
          communication: 20,
          relevance: 20,
          evidence: 20,
        },
      },
      screeningResult: {
        totalScore: 82,
        breakdown: { skills: 85 },
        explanation: { summary: 'Phù hợp' },
      },
    },
    turns: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        orderIndex: 1,
        question: 'Bạn thiết kế index PostgreSQL như thế nào?',
        questionType: 'TECHNICAL',
        targetSkill: 'PostgreSQL',
        answerText: 'Tôi dùng composite index theo thứ tự cột lọc có độ chọn lọc cao.',
        source: AnswerSource.VOICE,
        transcriptStatus: TurnTranscriptStatus.DONE,
        transcriptEdited: false,
        audioS3Key: `interviews/${INTERVIEW_ID}/turn-1.webm`,
        askedAt: new Date('2026-11-28T01:41:00.000Z'),
        answeredAt: new Date('2026-11-28T01:42:30.000Z'),
      },
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        orderIndex: 2,
        question: 'Kể về sự cố production bạn từng xử lý.',
        questionType: 'BEHAVIORAL',
        targetSkill: 'Debugging',
        answerText: 'noise',
        source: AnswerSource.VOICE,
        transcriptStatus: TurnTranscriptStatus.NO_SPEECH,
        transcriptEdited: false,
        audioS3Key: `interviews/${INTERVIEW_ID}/turn-2.webm`,
        askedAt: new Date('2026-11-28T01:43:00.000Z'),
        answeredAt: new Date('2026-11-28T01:43:20.000Z'),
      },
    ],
    result: null,
    ...overrides,
  };
}

function buildEvaluationOutput(
  overrides: Partial<EvaluateInterviewOutput> = {},
): EvaluateInterviewOutput {
  return {
    technicalScore: 80,
    communicationScore: 70,
    relevanceScore: 75,
    evidenceScore: 65,
    feedbackSummary: 'Ứng viên có nền tảng kỹ thuật tốt nhưng bỏ trống câu xử lý sự cố.',
    evidenceQuotes: {
      technical: {
        comment: 'Giải thích đúng bản chất composite index.',
        quotes: ['composite index theo thứ tự cột lọc'],
      },
      communication: {
        comment: 'Diễn đạt rõ ràng ở câu 1.',
        quotes: ['Tôi dùng composite index'],
      },
      relevance: {
        comment: 'Bám sát câu hỏi PostgreSQL.',
        quotes: ['composite index'],
      },
      evidence: {
        comment: 'Thiếu dẫn chứng thực tế ở câu 2.',
        quotes: [],
      },
    },
    candidateFeedback: {
      strengths: ['Nắm vững tối ưu truy vấn PostgreSQL'],
      improvements: ['Cần bổ sung ví dụ thực tế về xử lý sự cố'],
      suggestions: ['Chuẩn bị tình huống theo cấu trúc STAR'],
    },
    ...overrides,
  };
}

describe('InterviewProcessingService', () => {
  let repo: {
    findByInterviewId: ReturnType<typeof vi.fn>;
    findPendingRecoveryInterviewIds: ReturnType<typeof vi.fn>;
    saveEvaluationError: ReturnType<typeof vi.fn>;
    saveEvaluationResult: ReturnType<typeof vi.fn>;
  };
  let transcriber: { transcribeSession: ReturnType<typeof vi.fn> };
  let evaluator: { evaluateInterview: ReturnType<typeof vi.fn> };
  let aiQueue: { add: ReturnType<typeof vi.fn> };
  let storage: { putObject: ReturnType<typeof vi.fn> };
  let applicationStateService: { emitStatusChanged: ReturnType<typeof vi.fn> };
  let service: InterviewProcessingService;

  beforeEach(() => {
    repo = {
      findByInterviewId: vi.fn(),
      findPendingRecoveryInterviewIds: vi.fn().mockResolvedValue([]),
      saveEvaluationError: vi.fn().mockResolvedValue(undefined),
      saveEvaluationResult: vi.fn().mockResolvedValue({
        statusEvent: {
          applicationId: APPLICATION_ID,
          jobId: JOB_ID,
          fromStatus: ApplicationStatus.INTERVIEWING,
          toStatus: ApplicationStatus.EVALUATED,
          actorId: null,
        },
      }),
    };

    transcriber = {
      transcribeSession: vi.fn().mockResolvedValue({ processedCount: 2, failedTurnIds: [] }),
    };

    evaluator = {
      evaluateInterview: vi.fn().mockResolvedValue(buildEvaluationOutput()),
    };

    aiQueue = {
      add: vi.fn().mockImplementation(async (task: () => Promise<unknown>) => task()),
    };

    storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
    };

    applicationStateService = {
      emitStatusChanged: vi.fn(),
    };

    service = new InterviewProcessingService(
      repo as unknown as InterviewEvaluationRepository,
      transcriber as unknown as InterviewTranscriber,
      evaluator as unknown as InterviewEvaluator,
      aiQueue as unknown as AiQueueService,
      storage as unknown as StorageService,
      applicationStateService as unknown as ApplicationStateService,
      { retryDelayMs: 0 },
    );
  });

  it('hoàn tất luồng transcribe -> evaluate -> upload transcript -> lưu kết quả & chuyển EVALUATED', async () => {
    const session = buildSessionRecord();
    repo.findByInterviewId.mockResolvedValue(session);

    service.handleInterviewCompleted({ interviewId: INTERVIEW_ID, applicationId: APPLICATION_ID });
    await service.whenIdle(INTERVIEW_ID);

    expect(transcriber.transcribeSession).toHaveBeenCalledWith(INTERVIEW_ID, {
      retryFailedOnly: undefined,
    });
    expect(aiQueue.add).toHaveBeenCalledTimes(1);

    const evaluateArg = evaluator.evaluateInterview.mock.calls[0][0];
    expect(evaluateArg.turns[0].isEmpty).toBe(false);
    expect(evaluateArg.turns[1].isEmpty).toBe(true);
    expect(evaluateArg.turns[1].answerText).toBeNull();

    expect(storage.putObject).toHaveBeenCalledWith(
      `transcripts/${INTERVIEW_ID}.txt`,
      expect.any(Buffer),
      'text/plain; charset=utf-8',
    );
    const uploadedTxt = (storage.putObject.mock.calls[0][1] as Buffer).toString('utf-8');
    expect(uploadedTxt).toContain('Backend Engineer');
    expect(uploadedTxt).toContain('Không ghi nhận được giọng nói');

    // weighted: 80*0.4 + 70*0.2 + 75*0.2 + 65*0.2 = 32 + 14 + 15 + 13 = 74 >= 60 -> PASS
    expect(repo.saveEvaluationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: INTERVIEW_ID,
        applicationId: APPLICATION_ID,
        transcriptS3Key: `transcripts/${INTERVIEW_ID}.txt`,
        totalScore: 74,
        aiRecommendation: AiRecommendation.PASS,
      }),
    );
    expect(applicationStateService.emitStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: APPLICATION_ID,
        toStatus: ApplicationStatus.EVALUATED,
      }),
    );
    expect(repo.saveEvaluationError).not.toHaveBeenCalled();
  });

  it('gán aiRecommendation = REJECT khi totalScore thấp hơn INTERVIEW_PASS_THRESHOLD', async () => {
    repo.findByInterviewId.mockResolvedValue(buildSessionRecord());
    evaluator.evaluateInterview.mockResolvedValue(
      buildEvaluationOutput({
        technicalScore: 40,
        communicationScore: 50,
        relevanceScore: 55,
        evidenceScore: 45,
      }),
    );

    service.enqueue(INTERVIEW_ID);
    await service.whenIdle(INTERVIEW_ID);

    const expectedTotal = 46;
    expect(expectedTotal).toBeLessThan(envConfig.INTERVIEW_PASS_THRESHOLD);
    expect(repo.saveEvaluationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        totalScore: expectedTotal,
        aiRecommendation: AiRecommendation.REJECT,
      }),
    );
  });

  it('thử lại 1 lần khi gặp lỗi tạm thời rồi thành công', async () => {
    repo.findByInterviewId.mockResolvedValue(buildSessionRecord());
    evaluator.evaluateInterview
      .mockRejectedValueOnce(new Error('Gemini 503 overloaded'))
      .mockResolvedValueOnce(buildEvaluationOutput());

    service.enqueue(INTERVIEW_ID);
    await service.whenIdle(INTERVIEW_ID);

    expect(evaluator.evaluateInterview).toHaveBeenCalledTimes(2);
    expect(repo.saveEvaluationResult).toHaveBeenCalledTimes(1);
    expect(repo.saveEvaluationError).not.toHaveBeenCalled();
  });

  it('lưu evaluationError gắn tên bước TRANSCRIBE khi nhận dạng thất bại cả 2 lần và giữ INTERVIEWING', async () => {
    repo.findByInterviewId.mockResolvedValue(buildSessionRecord());
    transcriber.transcribeSession.mockResolvedValue({
      processedCount: 1,
      failedTurnIds: ['turn-2'],
    });

    service.enqueue(INTERVIEW_ID);
    await service.whenIdle(INTERVIEW_ID);

    expect(transcriber.transcribeSession).toHaveBeenCalledTimes(2);
    expect(evaluator.evaluateInterview).not.toHaveBeenCalled();
    expect(repo.saveEvaluationResult).not.toHaveBeenCalled();
    expect(applicationStateService.emitStatusChanged).not.toHaveBeenCalled();
    expect(repo.saveEvaluationError).toHaveBeenCalledWith(
      INTERVIEW_ID,
      expect.stringMatching(/^TRANSCRIBE: /),
    );
  });

  it('lưu evaluationError gắn tên bước EVALUATE khi AI lỗi cả 2 lần (vd sai API key) và giữ INTERVIEWING', async () => {
    repo.findByInterviewId.mockResolvedValue(buildSessionRecord());
    evaluator.evaluateInterview.mockRejectedValue(new Error('API_KEY_INVALID'));

    service.enqueue(INTERVIEW_ID);
    await service.whenIdle(INTERVIEW_ID);

    expect(evaluator.evaluateInterview).toHaveBeenCalledTimes(2);
    expect(repo.saveEvaluationResult).not.toHaveBeenCalled();
    expect(applicationStateService.emitStatusChanged).not.toHaveBeenCalled();
    expect(repo.saveEvaluationError).toHaveBeenCalledWith(
      INTERVIEW_ID,
      'EVALUATE: API_KEY_INVALID',
    );
  });

  it('khôi phục các phiên đã completedAt nhưng chưa có kết quả khi server khởi động', async () => {
    repo.findPendingRecoveryInterviewIds.mockResolvedValue([{ id: INTERVIEW_ID }]);
    repo.findByInterviewId.mockResolvedValue(buildSessionRecord());

    await service.onApplicationBootstrap();
    await service.whenIdle(INTERVIEW_ID);

    expect(repo.findPendingRecoveryInterviewIds).toHaveBeenCalledTimes(1);
    expect(repo.saveEvaluationResult).toHaveBeenCalledTimes(1);
  });

  it('không phát sự kiện chuyển trạng thái khi chạy re-evaluate trên hồ sơ đang EVALUATED', async () => {
    const evaluatedSession = buildSessionRecord();
    evaluatedSession.application.status = ApplicationStatus.EVALUATED;
    repo.findByInterviewId.mockResolvedValue(evaluatedSession);
    repo.saveEvaluationResult.mockResolvedValue({ statusEvent: null });

    service.enqueue(INTERVIEW_ID, { retryFailedOnly: true });
    await service.whenIdle(INTERVIEW_ID);

    expect(transcriber.transcribeSession).toHaveBeenCalledWith(INTERVIEW_ID, {
      retryFailedOnly: true,
    });
    expect(repo.saveEvaluationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStatus: ApplicationStatus.EVALUATED,
      }),
    );
    expect(applicationStateService.emitStatusChanged).not.toHaveBeenCalled();
  });

  it('bỏ qua phiên nếu HR đã ra quyết định PASSED/FAILED', async () => {
    const decided = buildSessionRecord();
    decided.application.status = ApplicationStatus.PASSED;
    repo.findByInterviewId.mockResolvedValue(decided);

    service.enqueue(INTERVIEW_ID);
    await service.whenIdle(INTERVIEW_ID);

    expect(transcriber.transcribeSession).not.toHaveBeenCalled();
    expect(evaluator.evaluateInterview).not.toHaveBeenCalled();
  });
});
