import { ScreeningStepError, type AiClient, type ScreeningOutput } from '@hireflow/ai';
import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiQueueService } from '../ai/ai-queue.service.js';
import type { JobAnalysisService } from '../ai/job-analysis.service.js';
import type { ScreeningResultService } from '../ai/screening-result.service.js';
import type { ApplicationStatusChangedPayload } from '../constants/application-event.constant.js';
import { AiRecommendation, ApplicationStatus } from '../constants/application-status.enum.js';
import type { ApplicationStateService } from '../services/application-state.service.js';
import { ScreeningPipelineService } from './screening-pipeline.service.js';
import { SCREENING_MAX_ATTEMPTS } from './screening.constant.js';
import type { ScreeningRepository } from './screening.repository.js';

const aiMocks = vi.hoisted(() => ({ screenCv: vi.fn() }));

vi.mock('@hireflow/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hireflow/ai')>();
  return { ...actual, screenCv: aiMocks.screenCv };
});

const APP_ID = 'a1000000-0000-4000-8000-000000000001';
const JOB_ID = 'b2000000-0000-4000-8000-000000000002';
const HR_ID = 'c3000000-0000-4000-8000-000000000003';
const CV_TEXT = 'Nguyễn Văn A — 0901234567 — NestJS 3 năm';

const OUTPUT = {
  parsedCv: {},
  cvEmbedding: [0.1],
  total: 82,
  breakdown: {},
  explanation: {},
  timings: { parseCvMs: 1, embedMs: 2, scoreMs: 3, explainMs: 4, totalMs: 10 },
} as unknown as ScreeningOutput;

/** Không chờ thật giữa 2 lần thử. */
class TestPipeline extends ScreeningPipelineService {
  protected override wait(): Promise<void> {
    return Promise.resolve();
  }
}

function makeEvent(toStatus: ApplicationStatus): ApplicationStatusChangedPayload {
  return { applicationId: APP_ID, jobId: JOB_ID, fromStatus: null, toStatus, actorId: null };
}

describe('ScreeningPipelineService', () => {
  let repo: {
    findForScreening: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
    startRescreen: ReturnType<typeof vi.fn>;
  };
  let stateService: {
    transition: ReturnType<typeof vi.fn>;
    emitStatusChanged: ReturnType<typeof vi.fn>;
  };
  let jobAnalysis: { ensureJobAnalyzed: ReturnType<typeof vi.fn> };
  let screeningResult: { saveScreeningResult: ReturnType<typeof vi.fn> };
  let aiQueue: AiQueueService;
  let service: TestPipeline;

  function givenApplication(status: ApplicationStatus, cvText: string | null = CV_TEXT) {
    repo.findForScreening.mockResolvedValue({ id: APP_ID, jobId: JOB_ID, status, cvText });
  }

  async function runPipeline() {
    service.enqueue(APP_ID);
    await service.whenIdle(APP_ID);
  }

  beforeEach(() => {
    aiMocks.screenCv.mockReset().mockResolvedValue(OUTPUT);
    repo = {
      findForScreening: vi.fn(),
      markFailed: vi.fn().mockResolvedValue(makeEvent(ApplicationStatus.SCREENING_FAILED)),
      startRescreen: vi.fn().mockResolvedValue(makeEvent(ApplicationStatus.SCREENING)),
    };
    stateService = { transition: vi.fn().mockResolvedValue({}), emitStatusChanged: vi.fn() };
    jobAnalysis = {
      ensureJobAnalyzed: vi
        .fn()
        .mockResolvedValue({ parsedJd: { schemaVersion: 1 }, embedding: [0.2] }),
    };
    screeningResult = {
      saveScreeningResult: vi.fn().mockResolvedValue({
        applicationId: APP_ID,
        totalScore: 82,
        aiRecommendation: AiRecommendation.PASS,
      }),
    };
    aiQueue = new AiQueueService();
    service = new TestPipeline(
      {} as AiClient,
      aiQueue,
      jobAnalysis as unknown as JobAnalysisService,
      screeningResult as unknown as ScreeningResultService,
      stateService as unknown as ApplicationStateService,
      repo as unknown as ScreeningRepository,
    );
  });

  it('SUBMITTED: SCREENING → ensureJobAnalyzed → screenCv (qua hàng đợi) → save → SCREENED', async () => {
    givenApplication(ApplicationStatus.SUBMITTED);
    const queueAdd = vi.spyOn(aiQueue, 'add');

    await runPipeline();

    expect(stateService.transition.mock.calls).toEqual([
      [APP_ID, ApplicationStatus.SCREENING],
      [APP_ID, ApplicationStatus.SCREENED],
    ]);
    expect(jobAnalysis.ensureJobAnalyzed).toHaveBeenCalledWith(JOB_ID);
    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(aiMocks.screenCv).toHaveBeenCalledWith(
      expect.anything(),
      { cvText: CV_TEXT, parsedJd: { schemaVersion: 1 }, jdEmbedding: [0.2] },
      expect.anything(),
    );
    expect(screeningResult.saveScreeningResult).toHaveBeenCalledWith(APP_ID, OUTPUT);
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('SCREENING (chấm lại / khôi phục): không gọi transition SUBMITTED → SCREENING', async () => {
    givenApplication(ApplicationStatus.SCREENING);

    await runPipeline();

    expect(stateService.transition.mock.calls).toEqual([[APP_ID, ApplicationStatus.SCREENED]]);
    expect(screeningResult.saveScreeningResult).toHaveBeenCalledTimes(1);
  });

  it.each([
    ApplicationStatus.SCREENED,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.SCREENING_FAILED,
  ])('bỏ qua hồ sơ ở %s, không gọi AI', async (status) => {
    givenApplication(status);

    await runPipeline();

    expect(aiMocks.screenCv).not.toHaveBeenCalled();
    expect(stateService.transition).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('bỏ qua khi không tìm thấy hồ sơ', async () => {
    repo.findForScreening.mockResolvedValue(null);

    await runPipeline();

    expect(aiMocks.screenCv).not.toHaveBeenCalled();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('lỗi lần 1, lần 2 thành công → SCREENED, không đánh dấu lỗi', async () => {
    givenApplication(ApplicationStatus.SUBMITTED);
    aiMocks.screenCv.mockRejectedValueOnce(new ScreeningStepError('SCORE', new Error('429 quota')));
    // Lần 2 đọc lại thấy đã SCREENING (lần 1 đã chuyển) → không chuyển lại.
    repo.findForScreening
      .mockResolvedValueOnce({
        id: APP_ID,
        jobId: JOB_ID,
        status: ApplicationStatus.SUBMITTED,
        cvText: CV_TEXT,
      })
      .mockResolvedValueOnce({
        id: APP_ID,
        jobId: JOB_ID,
        status: ApplicationStatus.SCREENING,
        cvText: CV_TEXT,
      });

    await runPipeline();

    expect(aiMocks.screenCv).toHaveBeenCalledTimes(2);
    expect(stateService.transition.mock.calls).toEqual([
      [APP_ID, ApplicationStatus.SCREENING],
      [APP_ID, ApplicationStatus.SCREENED],
    ]);
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('lỗi cả 2 lần → SCREENING_FAILED với tên bước, không lộ nội dung CV, phát sự kiện', async () => {
    givenApplication(ApplicationStatus.SCREENING);
    aiMocks.screenCv.mockRejectedValue(
      new ScreeningStepError('EXPLAIN', new Error('Gemini timeout')),
    );

    await runPipeline();

    expect(aiMocks.screenCv).toHaveBeenCalledTimes(SCREENING_MAX_ATTEMPTS);
    expect(repo.markFailed).toHaveBeenCalledTimes(1);
    const [, message] = repo.markFailed.mock.calls[0] as [string, string];
    expect(message).toBe('EXPLAIN: Gemini timeout');
    expect(message).not.toContain(CV_TEXT);
    expect(stateService.emitStatusChanged).toHaveBeenCalledWith(
      makeEvent(ApplicationStatus.SCREENING_FAILED),
    );
  });

  it('lỗi ở bước phân tích JD → message ghi JOB_ANALYSIS', async () => {
    givenApplication(ApplicationStatus.SCREENING);
    jobAnalysis.ensureJobAnalyzed.mockRejectedValue(new Error('parseJd failed'));

    await runPipeline();

    expect(repo.markFailed).toHaveBeenCalledWith(APP_ID, 'JOB_ANALYSIS: parseJd failed');
    expect(aiMocks.screenCv).not.toHaveBeenCalled();
  });

  it('hồ sơ không có cvText → SCREENING_FAILED ở bước LOAD', async () => {
    givenApplication(ApplicationStatus.SCREENING, null);

    await runPipeline();

    expect(repo.markFailed).toHaveBeenCalledWith(APP_ID, expect.stringMatching(/^LOAD: /));
  });

  it('markFailed lỗi (VD hồ sơ còn SUBMITTED) → chỉ ghi log, không throw', async () => {
    givenApplication(ApplicationStatus.SUBMITTED);
    stateService.transition.mockRejectedValue(new Error('DB down'));
    repo.markFailed.mockRejectedValue(new ConflictException('SUBMITTED → SCREENING_FAILED'));

    await expect(runPipeline()).resolves.toBeUndefined();
    expect(stateService.emitStatusChanged).not.toHaveBeenCalled();
  });

  it('enqueue trùng khi đang chạy → chỉ 1 lượt song song, chạy thêm đúng 1 lượt sau đó', async () => {
    givenApplication(ApplicationStatus.SCREENING);
    let release!: () => void;
    aiMocks.screenCv.mockImplementationOnce(
      () => new Promise<ScreeningOutput>((resolve) => (release = () => resolve(OUTPUT))),
    );

    service.enqueue(APP_ID);
    service.enqueue(APP_ID);
    service.enqueue(APP_ID);
    await vi.waitFor(() => expect(aiMocks.screenCv).toHaveBeenCalledTimes(1));

    // Lượt 2 đọc lại thấy đã SCREENED → bỏ qua.
    repo.findForScreening.mockResolvedValue({
      id: APP_ID,
      jobId: JOB_ID,
      status: ApplicationStatus.SCREENED,
      cvText: CV_TEXT,
    });
    release();
    await vi.waitFor(() => expect(repo.findForScreening).toHaveBeenCalledTimes(2));
    await service.whenIdle(APP_ID);

    expect(aiMocks.screenCv).toHaveBeenCalledTimes(1);
  });

  it('rescreen: chuyển SCREENING trong repo, phát sự kiện rồi chạy pipeline', async () => {
    givenApplication(ApplicationStatus.SCREENING);

    await service.rescreen(APP_ID, HR_ID);
    await service.whenIdle(APP_ID);

    expect(repo.startRescreen).toHaveBeenCalledWith(APP_ID, HR_ID);
    expect(stateService.emitStatusChanged).toHaveBeenCalledWith(
      makeEvent(ApplicationStatus.SCREENING),
    );
    expect(screeningResult.saveScreeningResult).toHaveBeenCalledTimes(1);
  });

  it('rescreen: state machine trả 409 → ném lại, không chạy pipeline', async () => {
    repo.startRescreen.mockRejectedValue(new ConflictException('409'));

    await expect(service.rescreen(APP_ID, HR_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.findForScreening).not.toHaveBeenCalled();
  });
});
