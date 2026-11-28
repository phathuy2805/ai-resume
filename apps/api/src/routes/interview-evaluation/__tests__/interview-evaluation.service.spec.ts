import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { AnswerSource, TurnTranscriptStatus } from '../../../generated/prisma/client.js';
import envConfig from '../../../shared/config/env.config.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../../shared/constants/application-status.enum.js';
import type { ApplicationStateService } from '../../../shared/services/application-state.service.js';
import type { StorageService } from '../../../shared/services/storage.service.js';
import {
  INTERVIEW_COMPLETED_EVENT,
  INTERVIEW_PHASES,
  INTERVIEW_SESSION_TTL_MS,
} from '../interview-evaluation.constant.js';
import {
  ApplicationNotFoundForInterviewException,
  InterviewForbiddenException,
  InterviewNotFoundException,
  InvalidInterviewDecisionStatusException,
  InvalidReEvaluateStatusException,
} from '../interview-evaluation.error.js';
import type {
  InterviewEvaluationRecord,
  InterviewEvaluationRepository,
} from '../interview-evaluation.repository.js';
import { InterviewEvaluationService } from '../interview-evaluation.service.js';
import type { InterviewProcessingService } from '../interview-processing.service.js';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const APPLICATION_ID = '22222222-2222-4222-8222-222222222222';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const HR_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_HR_ID = '44444444-4444-4444-8444-444444444499';
const CANDIDATE_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_CANDIDATE_ID = '55555555-5555-4555-8555-555555555599';

function buildInterviewRecord(
  status: ApplicationStatus = ApplicationStatus.EVALUATED,
): InterviewEvaluationRecord {
  return {
    id: INTERVIEW_ID,
    applicationId: APPLICATION_ID,
    recordingConsentAt: new Date('2026-11-28T01:30:00.000Z'),
    startedAt: new Date('2026-11-28T01:31:00.000Z'),
    completedAt: new Date('2026-11-28T01:45:00.000Z'),
    expiresAt: new Date('2026-12-05T01:30:00.000Z'),
    transcriptS3Key: `transcripts/${INTERVIEW_ID}.txt`,
    evaluationError: null,
    createdAt: new Date('2026-11-27T01:30:00.000Z'),
    application: {
      id: APPLICATION_ID,
      jobId: JOB_ID,
      candidateId: CANDIDATE_ID,
      status,
      job: {
        id: JOB_ID,
        title: 'Backend Engineer',
        createdById: HR_ID,
        requiredSkills: ['NestJS', 'PostgreSQL'],
        parsedJd: null,
        rubricWeights: {
          technical: 40,
          communication: 20,
          relevance: 20,
          evidence: 20,
        },
      },
      screeningResult: null,
    },
    turns: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
        orderIndex: 1,
        question: 'Bạn tối ưu truy vấn SQL ra sao?',
        questionType: 'TECHNICAL',
        targetSkill: 'PostgreSQL',
        answerText: 'Kiểm tra EXPLAIN ANALYZE và thêm index phù hợp.',
        source: AnswerSource.VOICE,
        transcriptStatus: TurnTranscriptStatus.DONE,
        transcriptEdited: false,
        audioS3Key: `interviews/${INTERVIEW_ID}/turn-1.webm`,
        askedAt: new Date('2026-11-28T01:32:00.000Z'),
        answeredAt: new Date('2026-11-28T01:33:15.000Z'),
      },
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
        orderIndex: 2,
        question: 'Mô tả dự án gần nhất.',
        questionType: 'EXPERIENCE',
        targetSkill: 'NestJS',
        answerText: null,
        source: AnswerSource.VOICE,
        transcriptStatus: TurnTranscriptStatus.NO_SPEECH,
        transcriptEdited: false,
        audioS3Key: `interviews/${INTERVIEW_ID}/turn-2.webm`,
        askedAt: new Date('2026-11-28T01:34:00.000Z'),
        answeredAt: new Date('2026-11-28T01:34:10.000Z'),
      },
    ],
    result: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      technicalScore: 78,
      communicationScore: 72,
      relevanceScore: 75,
      evidenceScore: 68,
      totalScore: 74.2,
      feedbackSummary: 'Ứng viên nắm vững chuyên môn PostgreSQL.',
      evidenceQuotes: {
        technical: { comment: 'Tốt', quotes: ['EXPLAIN ANALYZE'] },
        communication: { comment: 'Rõ ràng', quotes: ['thêm index phù hợp'] },
        relevance: { comment: 'Đúng trọng tâm', quotes: ['EXPLAIN ANALYZE'] },
        evidence: { comment: 'Cần thêm ví dụ', quotes: [] },
      },
      aiRecommendation: AiRecommendation.PASS,
      candidateFeedback: {
        strengths: ['Hiểu rõ cách phân tích truy vấn SQL'],
        improvements: ['Bổ sung ví dụ dự án thực tế'],
        suggestions: ['Trình bày theo tình huống cụ thể'],
      },
      candidateMessage: null,
      decisionById: null,
      decisionAt: null,
      decisionNote: null,
      createdAt: new Date('2026-11-28T01:46:00.000Z'),
      decisionBy: null,
    },
  };
}

describe('InterviewEvaluationService', () => {
  let repo: {
    findApplicationOwnership: ReturnType<typeof vi.fn>;
    findByApplicationId: ReturnType<typeof vi.fn>;
    findByInterviewId: ReturnType<typeof vi.fn>;
    findCandidateFeedbackApplication: ReturnType<typeof vi.fn>;
    saveInterviewDecision: ReturnType<typeof vi.fn>;
    clearEvaluationError: ReturnType<typeof vi.fn>;
    autoCompleteExpiredSession: ReturnType<typeof vi.fn>;
  };
  let storage: { getSignedUrl: ReturnType<typeof vi.fn> };
  let applicationStateService: { emitStatusChanged: ReturnType<typeof vi.fn> };
  let processingService: { enqueue: ReturnType<typeof vi.fn> };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let service: InterviewEvaluationService;

  beforeEach(() => {
    repo = {
      findApplicationOwnership: vi.fn().mockResolvedValue({
        id: APPLICATION_ID,
        status: ApplicationStatus.EVALUATED,
        candidateId: CANDIDATE_ID,
        job: { createdById: HR_ID },
      }),
      findByApplicationId: vi.fn().mockResolvedValue(buildInterviewRecord()),
      findByInterviewId: vi.fn().mockResolvedValue(buildInterviewRecord()),
      findCandidateFeedbackApplication: vi.fn(),
      saveInterviewDecision: vi.fn(),
      clearEvaluationError: vi.fn().mockResolvedValue(undefined),
      autoCompleteExpiredSession: vi.fn().mockResolvedValue(true),
    };

    storage = {
      getSignedUrl: vi.fn().mockImplementation(async (key: string) => `https://s3.local/${key}`),
    };

    applicationStateService = {
      emitStatusChanged: vi.fn(),
    };

    processingService = {
      enqueue: vi.fn(),
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    service = new InterviewEvaluationService(
      repo as unknown as InterviewEvaluationRepository,
      storage as unknown as StorageService,
      applicationStateService as unknown as ApplicationStateService,
      processingService as unknown as InterviewProcessingService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('getApplicationInterviewForHr', () => {
    it('trả đủ turns (durationSec, isEmpty, presigned audioUrl), điểm 4 tiêu chí, passThreshold và phase', async () => {
      const res = await service.getApplicationInterviewForHr(HR_ID, APPLICATION_ID);

      expect(res.interviewId).toBe(INTERVIEW_ID);
      expect(res.phase).toBe(INTERVIEW_PHASES.EVALUATED);
      expect(res.passThreshold).toBe(envConfig.INTERVIEW_PASS_THRESHOLD);
      expect(res.turns).toHaveLength(2);
      expect(res.turns[0].durationSec).toBe(75);
      expect(res.turns[0].isEmpty).toBe(false);
      expect(res.turns[0].audioUrl).toBe(`https://s3.local/interviews/${INTERVIEW_ID}/turn-1.webm`);
      expect(res.turns[1].durationSec).toBe(10);
      expect(res.turns[1].isEmpty).toBe(true);
      expect(res.result?.totalScore).toBe(74.2);
      expect(res.result?.aiRecommendation).toBe(AiRecommendation.PASS);
    });

    it('không làm hỏng response khi lỗi tạo presigned audioUrl', async () => {
      storage.getSignedUrl.mockRejectedValueOnce(new Error('S3 unavailable'));

      const res = await service.getApplicationInterviewForHr(HR_ID, APPLICATION_ID);

      expect(res.turns[0].audioUrl).toBeNull();
      expect(res.turns[1].audioUrl).toBe(`https://s3.local/interviews/${INTERVIEW_ID}/turn-2.webm`);
    });

    it('chặn HR không sở hữu job với 403', async () => {
      await expect(
        service.getApplicationInterviewForHr(OTHER_HR_ID, APPLICATION_ID),
      ).rejects.toBe(InterviewForbiddenException);
    });

    it('trả 404 khi hồ sơ không tồn tại hoặc chưa có phiên phỏng vấn', async () => {
      repo.findApplicationOwnership.mockResolvedValueOnce(null);
      await expect(
        service.getApplicationInterviewForHr(HR_ID, APPLICATION_ID),
      ).rejects.toBe(ApplicationNotFoundForInterviewException);

      repo.findByApplicationId.mockResolvedValueOnce(null);
      await expect(
        service.getApplicationInterviewForHr(HR_ID, APPLICATION_ID),
      ).rejects.toBe(InterviewNotFoundException);
    });

    it('tự kết thúc phiên quá hạn 24 giờ và phát interview.completed khi HR mở kết quả', async () => {
      const startedAt = new Date(Date.now() - INTERVIEW_SESSION_TTL_MS - 60_000);
      const expectedCompletedAt = new Date(startedAt.getTime() + INTERVIEW_SESSION_TTL_MS);
      const stale = buildInterviewRecord(ApplicationStatus.INTERVIEWING);
      stale.startedAt = startedAt;
      stale.completedAt = null;
      stale.result = null;
      repo.findByApplicationId.mockResolvedValueOnce(stale);

      const res = await service.getApplicationInterviewForHr(HR_ID, APPLICATION_ID);

      expect(repo.autoCompleteExpiredSession).toHaveBeenCalledWith(
        INTERVIEW_ID,
        expectedCompletedAt,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        INTERVIEW_COMPLETED_EVENT,
        expect.objectContaining({
          interviewId: INTERVIEW_ID,
          applicationId: APPLICATION_ID,
          completedAt: expectedCompletedAt,
        }),
      );
      expect(res.phase).toBe(INTERVIEW_PHASES.SUBMITTED);
      expect(res.completedAt).toBe(expectedCompletedAt.toISOString());
      expect(res.sessionExpiresAt).toBe(expectedCompletedAt.toISOString());
    });
  });

  describe('decideInterview', () => {
    it('chuyển EVALUATED -> PASSED, lưu note & candidateMessage và phát sự kiện status_changed', async () => {
      const decisionAt = new Date('2026-11-28T03:00:00.000Z');
      repo.saveInterviewDecision.mockResolvedValue({
        id: APPLICATION_ID,
        interviewId: INTERVIEW_ID,
        status: ApplicationStatus.PASSED,
        decisionById: HR_ID,
        decisionAt,
        decisionNote: 'Chuyên môn ổn',
        candidateMessage: 'Chúc mừng bạn, team sẽ liên hệ vòng tiếp theo.',
        event: {
          applicationId: APPLICATION_ID,
          jobId: JOB_ID,
          fromStatus: ApplicationStatus.EVALUATED,
          toStatus: ApplicationStatus.PASSED,
          actorId: HR_ID,
          candidateMessage: 'Chúc mừng bạn, team sẽ liên hệ vòng tiếp theo.',
        },
      });

      const res = await service.decideInterview(HR_ID, APPLICATION_ID, {
        decision: 'PASS',
        note: 'Chuyên môn ổn',
        candidateMessage: 'Chúc mừng bạn, team sẽ liên hệ vòng tiếp theo.',
      });

      expect(res).toEqual({
        id: APPLICATION_ID,
        interviewId: INTERVIEW_ID,
        status: ApplicationStatus.PASSED,
        decisionById: HR_ID,
        decisionAt: decisionAt.toISOString(),
        decisionNote: 'Chuyên môn ổn',
        candidateMessage: 'Chúc mừng bạn, team sẽ liên hệ vòng tiếp theo.',
      });
      expect(applicationStateService.emitStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: APPLICATION_ID,
          toStatus: ApplicationStatus.PASSED,
          candidateMessage: 'Chúc mừng bạn, team sẽ liên hệ vòng tiếp theo.',
        }),
      );
    });

    it('chuyển EVALUATED -> FAILED khi HR chọn FAIL', async () => {
      const decisionAt = new Date('2026-11-28T03:05:00.000Z');
      repo.saveInterviewDecision.mockResolvedValue({
        id: APPLICATION_ID,
        interviewId: INTERVIEW_ID,
        status: ApplicationStatus.FAILED,
        decisionById: HR_ID,
        decisionAt,
        decisionNote: null,
        candidateMessage: null,
        event: {
          applicationId: APPLICATION_ID,
          jobId: JOB_ID,
          fromStatus: ApplicationStatus.EVALUATED,
          toStatus: ApplicationStatus.FAILED,
          actorId: HR_ID,
          candidateMessage: null,
        },
      });

      const res = await service.decideInterview(HR_ID, APPLICATION_ID, { decision: 'FAIL' });

      expect(res.status).toBe(ApplicationStatus.FAILED);
      expect(applicationStateService.emitStatusChanged).toHaveBeenCalledTimes(1);
    });

    it('trả 409 khi quyết định lại lần 2 hoặc hồ sơ không ở EVALUATED', async () => {
      const alreadyDecided = buildInterviewRecord(ApplicationStatus.PASSED);
      alreadyDecided.result!.decisionAt = new Date();
      repo.findByApplicationId.mockResolvedValueOnce(alreadyDecided);

      await expect(
        service.decideInterview(HR_ID, APPLICATION_ID, { decision: 'FAIL' }),
      ).rejects.toBe(InvalidInterviewDecisionStatusException);

      repo.findByApplicationId.mockResolvedValueOnce(buildInterviewRecord(ApplicationStatus.INTERVIEWING));
      await expect(
        service.decideInterview(HR_ID, APPLICATION_ID, { decision: 'PASS' }),
      ).rejects.toBe(InvalidInterviewDecisionStatusException);
    });
  });

  describe('reEvaluateInterview', () => {
    it('cho phép đánh giá lại khi INTERVIEWING có evaluationError', async () => {
      const failedRecord = buildInterviewRecord(ApplicationStatus.INTERVIEWING);
      failedRecord.evaluationError = 'EVALUATE: API_KEY_INVALID';
      failedRecord.result = null;
      repo.findByInterviewId.mockResolvedValue(failedRecord);

      const res = await service.reEvaluateInterview(HR_ID, INTERVIEW_ID);

      expect(res).toEqual({
        interviewId: INTERVIEW_ID,
        applicationId: APPLICATION_ID,
        status: ApplicationStatus.INTERVIEWING,
      });
      expect(repo.clearEvaluationError).toHaveBeenCalledWith(INTERVIEW_ID);
      expect(processingService.enqueue).toHaveBeenCalledWith(INTERVIEW_ID, {
        retryFailedOnly: true,
      });
    });

    it('cho phép đánh giá lại khi EVALUATED và HR chưa quyết định', async () => {
      repo.findByInterviewId.mockResolvedValue(buildInterviewRecord(ApplicationStatus.EVALUATED));

      const res = await service.reEvaluateInterview(HR_ID, INTERVIEW_ID);

      expect(res.status).toBe(ApplicationStatus.EVALUATED);
      expect(processingService.enqueue).toHaveBeenCalledWith(INTERVIEW_ID, {
        retryFailedOnly: true,
      });
    });

    it('trả 409 khi HR đã quyết định PASSED/FAILED hoặc phiên INTERVIEWING không bị lỗi', async () => {
      const passedRecord = buildInterviewRecord(ApplicationStatus.PASSED);
      passedRecord.result!.decisionAt = new Date();
      repo.findByInterviewId.mockResolvedValueOnce(passedRecord);

      await expect(service.reEvaluateInterview(HR_ID, INTERVIEW_ID)).rejects.toBe(
        InvalidReEvaluateStatusException,
      );

      const runningRecord = buildInterviewRecord(ApplicationStatus.INTERVIEWING);
      runningRecord.evaluationError = null;
      runningRecord.result = null;
      repo.findByInterviewId.mockResolvedValueOnce(runningRecord);

      await expect(service.reEvaluateInterview(HR_ID, INTERVIEW_ID)).rejects.toBe(
        InvalidReEvaluateStatusException,
      );
    });

    it('chặn HR khác với 403', async () => {
      await expect(service.reEvaluateInterview(OTHER_HR_ID, INTERVIEW_ID)).rejects.toBe(
        InterviewForbiddenException,
      );
    });
  });

  describe('getCandidateFeedback', () => {
    it('trả stage=INTERVIEW với candidateMessage + feedback khi PASSED/FAILED và tuyệt đối không lộ điểm/ngưỡng/ghi chú nội bộ', async () => {
      repo.findCandidateFeedbackApplication.mockResolvedValue({
        id: APPLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: ApplicationStatus.PASSED,
        interview: {
          id: INTERVIEW_ID,
          result: {
            candidateFeedback: {
              strengths: ['Nắm chắc SQL'],
              improvements: ['Cần bổ sung ví dụ'],
              suggestions: ['Luyện cách trình bày STAR'],
            },
            candidateMessage: 'Hẹn gặp bạn ở vòng phỏng vấn kỹ thuật cùng team!',
          },
        },
      });

      const res = await service.getCandidateFeedback(CANDIDATE_ID, APPLICATION_ID);

      expect(res).toEqual({
        status: ApplicationStatus.PASSED,
        stage: 'INTERVIEW',
        result: 'PASSED',
        candidateMessage: 'Hẹn gặp bạn ở vòng phỏng vấn kỹ thuật cùng team!',
        feedback: {
          strengths: ['Nắm chắc SQL'],
          improvements: ['Cần bổ sung ví dụ'],
          suggestions: ['Luyện cách trình bày STAR'],
        },
      });
      expect(res).not.toHaveProperty('totalScore');
      expect(res).not.toHaveProperty('technicalScore');
      expect(res).not.toHaveProperty('aiRecommendation');
      expect(res).not.toHaveProperty('passThreshold');
      expect(res).not.toHaveProperty('decisionNote');
    });

    it('trả stage=CV với candidateMessage + feedback (hoặc null khi đang chuẩn bị) khi bị loại vòng CV (REJECTED)', async () => {
      repo.findCandidateFeedbackApplication.mockResolvedValueOnce({
        id: APPLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: ApplicationStatus.REJECTED,
        candidateMessage: 'Cảm ơn bạn đã ứng tuyển.',
        candidateFeedback: null,
        interview: null,
      });

      const res = await service.getCandidateFeedback(CANDIDATE_ID, APPLICATION_ID);

      expect(res).toEqual({
        status: ApplicationStatus.REJECTED,
        stage: 'CV',
        result: 'REJECTED',
        candidateMessage: 'Cảm ơn bạn đã ứng tuyển.',
        feedback: null,
      });
    });

    it('chỉ trả { status } khi HR chưa quyết định (EVALUATED / INTERVIEWING)', async () => {
      repo.findCandidateFeedbackApplication.mockResolvedValue({
        id: APPLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: ApplicationStatus.EVALUATED,
        interview: { id: INTERVIEW_ID, result: null },
      });

      const res = await service.getCandidateFeedback(CANDIDATE_ID, APPLICATION_ID);

      expect(res).toEqual({ status: ApplicationStatus.EVALUATED });
    });

    it('chặn ứng viên khác xem phản hồi với 403', async () => {
      repo.findCandidateFeedbackApplication.mockResolvedValue({
        id: APPLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: ApplicationStatus.PASSED,
        interview: null,
      });

      await expect(
        service.getCandidateFeedback(OTHER_CANDIDATE_ID, APPLICATION_ID),
      ).rejects.toBe(InterviewForbiddenException);
    });
  });
});
