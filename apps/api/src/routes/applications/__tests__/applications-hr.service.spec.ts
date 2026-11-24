import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../../shared/constants/application-status.enum.js';
import { SIGNED_URL_EXPIRES_SEC } from '../../../shared/constants/storage.constant.js';
import type { ScreeningPipelineService } from '../../../shared/screening/screening-pipeline.service.js';
import type { ApplicationStateService } from '../../../shared/services/application-state.service.js';
import type { StorageService } from '../../../shared/services/storage.service.js';
import { ApplicationErrorCode } from '../applications.error.js';
import type {
  ApplicationsRepository,
  HrApplicationDetail,
  JobStatsRow,
} from '../applications.repository.js';
import {
  GetApplicationDetailResSchema,
  GetJobApplicationsQuerySchema,
} from '../applications.schema.js';
import { ApplicationsService } from '../applications.service.js';
import type { CvTextExtractor } from '../cv-text.extractor.js';

const HR_A = '11111111-1111-4111-8111-111111111111';
const HR_B = '22222222-2222-4222-8222-222222222222';
const JOB_ID = '33333333-3333-4333-8333-333333333333';
const APP_ID = '44444444-4444-4444-8444-444444444444';
const INTERVIEW_ID = '55555555-5555-4555-8555-555555555555';

function makeDetail(overrides: Partial<HrApplicationDetail> = {}): HrApplicationDetail {
  const now = new Date('2026-11-21T08:00:00.000Z');
  return {
    id: APP_ID,
    status: ApplicationStatus.SCREENED,
    cvFileName: 'cv.pdf',
    cvSizeBytes: 12000,
    cvMimeType: 'application/pdf',
    aiRecommendation: AiRecommendation.PASS,
    screeningError: null,
    hrDecisionAt: null,
    hrNote: null,
    createdAt: now,
    updatedAt: now,
    candidate: {
      id: '66666666-6666-4666-8666-666666666666',
      fullName: 'Trần Văn An',
      email: 'an@hireflow.vn',
    },
    job: {
      id: JOB_ID,
      title: 'Backend NestJS',
      cvPassThreshold: 70,
      createdById: HR_A,
    },
    screeningResult: {
      totalScore: 84,
      breakdown: {
        requiredSkills: { score: 90, weight: 35, matched: ['NestJS'], missing: [] },
        preferredSkills: { score: 50, weight: 10, matched: ['Docker'], missing: ['Redis'] },
        experienceYears: { score: 100, weight: 15, candidateYears: 4, requiredYears: 3 },
        relevance: { score: 90, weight: 25, comment: 'Phù hợp tốt' },
        similarity: { score: 75, weight: 15, cosine: 0.878 },
        capped: false,
      },
      explanation: {
        strengths: [{ point: 'Thành thạo NestJS', quote: '4 năm kinh nghiệm NestJS' }],
        gaps: [],
        summary: 'Phù hợp tốt',
      },
      timings: {
        parseCvMs: 400,
        embedMs: 200,
        scoreMs: 350,
        explainMs: 250,
        totalMs: 1200,
      },
      processingDurationMs: 1200,
      createdAt: now,
      updatedAt: now,
    },
    hrDecisionBy: null,
    interview: null,
    statusHistories: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        fromStatus: null,
        toStatus: ApplicationStatus.SUBMITTED,
        changedById: '66666666-6666-4666-8666-666666666666',
        reason: null,
        changedAt: now,
      },
    ],
    ...overrides,
  };
}

describe('ApplicationsService (HR Dashboard W2-BE-04)', () => {
  let repo: {
    findJobOwner: ReturnType<typeof vi.fn>;
    findByJobForHr: ReturnType<typeof vi.fn>;
    findDetailById: ReturnType<typeof vi.fn>;
    findDecisionContext: ReturnType<typeof vi.fn>;
    applyDecision: ReturnType<typeof vi.fn>;
    getJobStatsRows: ReturnType<typeof vi.fn>;
    findCvKeyById: ReturnType<typeof vi.fn>;
    findByCandidate: ReturnType<typeof vi.fn>;
  };
  let storage: { getSignedUrl: ReturnType<typeof vi.fn> };
  let stateService: { emitStatusChanged: ReturnType<typeof vi.fn> };
  let pipeline: { rescreen: ReturnType<typeof vi.fn> };
  let service: ApplicationsService;

  beforeEach(() => {
    repo = {
      findJobOwner: vi.fn().mockResolvedValue({ id: JOB_ID, createdById: HR_A }),
      findByJobForHr: vi.fn(),
      findDetailById: vi.fn(),
      findDecisionContext: vi.fn(),
      applyDecision: vi.fn(),
      getJobStatsRows: vi.fn(),
      findCvKeyById: vi.fn(),
      findByCandidate: vi.fn(),
    };
    storage = {
      getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-cv.pdf'),
    };
    stateService = {
      emitStatusChanged: vi.fn(),
    };
    pipeline = {
      rescreen: vi.fn().mockResolvedValue(undefined),
    };

    service = new ApplicationsService(
      repo as unknown as ApplicationsRepository,
      storage as unknown as StorageService,
      {} as CvTextExtractor,
      stateService as unknown as ApplicationStateService,
      pipeline as unknown as ScreeningPipelineService,
    );
  });

  describe('Ownership & NotFound', () => {
    it('rejects HR B accessing HR A job applications & stats with 403', async () => {
      await expect(
        service.findByJobForHr(HR_B, JOB_ID, {
          page: 1,
          limit: 10,
          sort: 'createdAt',
          order: 'desc',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(service.getJobStats(HR_B, JOB_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 when job does not exist', async () => {
      repo.findJobOwner.mockResolvedValueOnce(null);
      await expect(service.getJobStats(HR_A, JOB_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects HR B reading detail, deciding, or getting CV url of HR A application with 403', async () => {
      repo.findDetailById.mockResolvedValueOnce(makeDetail());
      await expect(service.findDetailForHr(HR_B, APP_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.SCREENED,
        job: { createdById: HR_A },
      });
      await expect(
        service.decide(HR_B, APP_ID, { decision: 'APPROVE' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      repo.findCvKeyById.mockResolvedValueOnce({
        id: APP_ID,
        cvS3Key: 'cvs/job/cv.pdf',
        job: { createdById: HR_A },
      });
      await expect(service.getCvSignedUrl(HR_B, APP_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findByJobForHr', () => {
    it('forwards minScore=70, sort=score, order=desc and maps list items', async () => {
      const createdAt = new Date('2026-11-21T08:00:00.000Z');
      repo.findByJobForHr.mockResolvedValueOnce({
        items: [
          {
            id: APP_ID,
            status: ApplicationStatus.SCREENED,
            aiRecommendation: AiRecommendation.PASS,
            createdAt,
            candidate: { fullName: 'Trần Văn An' },
            screeningResult: { totalScore: 84 },
          },
        ],
        total: 1,
      });

      const res = await service.findByJobForHr(HR_A, JOB_ID, {
        minScore: 70,
        sort: 'score',
        order: 'desc',
        page: 1,
        limit: 10,
      });

      expect(repo.findByJobForHr).toHaveBeenCalledWith({
        jobId: JOB_ID,
        minScore: 70,
        sort: 'score',
        order: 'desc',
        page: 1,
        limit: 10,
      });
      expect(res.data).toEqual([
        {
          id: APP_ID,
          candidateName: 'Trần Văn An',
          totalScore: 84,
          aiRecommendation: AiRecommendation.PASS,
          status: ApplicationStatus.SCREENED,
          createdAt: createdAt.toISOString(),
        },
      ]);
      expect(res.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('rejects minScore > maxScore in query schema', () => {
      const parsed = GetJobApplicationsQuerySchema.safeParse({ minScore: 80, maxScore: 50 });
      expect(parsed.success).toBe(false);
    });
  });

  describe('findDetailForHr', () => {
    it('maps screeningResult, histories, interviewId and omits sensitive/heavy fields', async () => {
      const detail = makeDetail({
        interview: { id: INTERVIEW_ID },
      });
      repo.findDetailById.mockResolvedValueOnce(detail);

      const res = await service.findDetailForHr(HR_A, APP_ID);

      expect(GetApplicationDetailResSchema.safeParse(res).success).toBe(true);
      expect(res.interviewId).toBe(INTERVIEW_ID);
      expect(res.job).toEqual({ id: JOB_ID, title: 'Backend NestJS', cvPassThreshold: 70 });
      expect(res.screeningResult?.totalScore).toBe(84);
      expect(res.statusHistories).toHaveLength(1);
      expect(res).not.toHaveProperty('cvText');
      expect(res).not.toHaveProperty('cvS3Key');
      expect(res).not.toHaveProperty('embedding');
    });
  });

  describe('decide', () => {
    it('approves a SCREENED application, creates Interview, transitions to INTERVIEW_INVITED, and emits events', async () => {
      const now = new Date('2026-11-21T09:00:00.000Z');
      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.SCREENED,
        job: { createdById: HR_A },
      });
      repo.applyDecision.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.INTERVIEW_INVITED,
        interviewId: INTERVIEW_ID,
        hrDecisionById: HR_A,
        hrDecisionAt: now,
        hrNote: 'Rất phù hợp',
        events: [
          {
            applicationId: APP_ID,
            jobId: JOB_ID,
            fromStatus: ApplicationStatus.SCREENED,
            toStatus: ApplicationStatus.SHORTLISTED,
            actorId: HR_A,
          },
          {
            applicationId: APP_ID,
            jobId: JOB_ID,
            fromStatus: ApplicationStatus.SHORTLISTED,
            toStatus: ApplicationStatus.INTERVIEW_INVITED,
            actorId: HR_A,
          },
        ],
      });

      const res = await service.decide(HR_A, APP_ID, {
        decision: 'APPROVE',
        note: 'Rất phù hợp',
      });

      expect(res).toEqual({
        id: APP_ID,
        status: ApplicationStatus.INTERVIEW_INVITED,
        interviewId: INTERVIEW_ID,
        hrDecisionById: HR_A,
        hrDecisionAt: now.toISOString(),
        hrNote: 'Rất phù hợp',
      });
      expect(stateService.emitStatusChanged).toHaveBeenCalledTimes(2);
    });

    it('rejects decision when status is not SCREENED (409)', async () => {
      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.INTERVIEW_INVITED,
        job: { createdById: HR_A },
      });

      const err = await service.decide(HR_A, APP_ID, { decision: 'APPROVE' }).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err.getResponse() as { code?: string }).code).toBe(
        ApplicationErrorCode.INVALID_DECISION_STATUS,
      );
      expect(repo.applyDecision).not.toHaveBeenCalled();
      expect(stateService.emitStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('rescreen (W2-BE-01)', () => {
    it.each([ApplicationStatus.SCREENED, ApplicationStatus.SCREENING_FAILED])(
      'accepts %s, hands off to the pipeline with HR as actor and returns SCREENING',
      async (status) => {
        repo.findDecisionContext.mockResolvedValueOnce({
          id: APP_ID,
          status,
          job: { createdById: HR_A },
        });

        const res = await service.rescreen(HR_A, APP_ID);

        expect(pipeline.rescreen).toHaveBeenCalledWith(APP_ID, HR_A);
        expect(res).toEqual({ id: APP_ID, status: ApplicationStatus.SCREENING });
      },
    );

    it('returns 404 when application does not exist', async () => {
      repo.findDecisionContext.mockResolvedValueOnce(null);

      await expect(service.rescreen(HR_A, APP_ID)).rejects.toBeInstanceOf(NotFoundException);
      expect(pipeline.rescreen).not.toHaveBeenCalled();
    });

    it('rejects HR B rescreening HR A application with 403', async () => {
      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.SCREENED,
        job: { createdById: HR_A },
      });

      await expect(service.rescreen(HR_B, APP_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(pipeline.rescreen).not.toHaveBeenCalled();
    });

    it.each([
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.SCREENING,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.REJECTED,
    ])('rejects rescreen from %s with 409 INVALID_RESCREEN_STATUS', async (status) => {
      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status,
        job: { createdById: HR_A },
      });

      const err = await service.rescreen(HR_A, APP_ID).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err.getResponse() as { code?: string }).code).toBe(
        ApplicationErrorCode.INVALID_RESCREEN_STATUS,
      );
      expect(pipeline.rescreen).not.toHaveBeenCalled();
    });

    it('maps a state-machine conflict (status changed concurrently) to INVALID_RESCREEN_STATUS', async () => {
      repo.findDecisionContext.mockResolvedValueOnce({
        id: APP_ID,
        status: ApplicationStatus.SCREENED,
        job: { createdById: HR_A },
      });
      pipeline.rescreen.mockRejectedValueOnce(
        new ConflictException('Không thể chuyển trạng thái hồ sơ từ SCREENING sang SCREENING'),
      );

      const err = await service.rescreen(HR_A, APP_ID).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err.getResponse() as { code?: string }).code).toBe(
        ApplicationErrorCode.INVALID_RESCREEN_STATUS,
      );
    });
  });

  describe('getJobStats', () => {
    it('computes status counts, 10-point score buckets, aiPassRate, and hrAgreementRate', async () => {
      const now = new Date();
      const rows: JobStatsRow[] = [
        {
          status: ApplicationStatus.INTERVIEW_INVITED,
          aiRecommendation: AiRecommendation.PASS,
          hrDecisionAt: now,
          screeningResult: { totalScore: 84 },
        },
        {
          status: ApplicationStatus.REJECTED,
          aiRecommendation: AiRecommendation.CONSIDER,
          hrDecisionAt: now,
          screeningResult: { totalScore: 62 },
        },
        {
          status: ApplicationStatus.SCREENED,
          aiRecommendation: AiRecommendation.PASS,
          hrDecisionAt: null,
          screeningResult: { totalScore: 100 },
        },
        {
          status: ApplicationStatus.SUBMITTED,
          aiRecommendation: null,
          hrDecisionAt: null,
          screeningResult: null,
        },
      ];
      repo.getJobStatsRows.mockResolvedValueOnce(rows);

      const stats = await service.getJobStats(HR_A, JOB_ID);

      expect(stats.totalApplications).toBe(4);
      expect(stats.byStatus[ApplicationStatus.INTERVIEW_INVITED]).toBe(1);
      expect(stats.byStatus[ApplicationStatus.SUBMITTED]).toBe(1);
      expect(stats.byRecommendation).toEqual({
        PASS: 2,
        CONSIDER: 1,
        REJECT: 0,
        unrated: 1,
      });
      expect(stats.aiPassRate).toBe(0.6667);
      expect(stats.hrAgreementRate).toBe(1);
      expect(stats.scoreDistribution.find((b) => b.range === '80-89')?.count).toBe(1);
      expect(stats.scoreDistribution.find((b) => b.range === '90-100')?.count).toBe(1);
      expect(stats.scoreDistribution.find((b) => b.range === '60-69')?.count).toBe(1);
    });

    it('returns 0 aiPassRate and null hrAgreementRate when job has 0 applications', async () => {
      repo.getJobStatsRows.mockResolvedValueOnce([]);
      const stats = await service.getJobStats(HR_A, JOB_ID);
      expect(stats.totalApplications).toBe(0);
      expect(stats.aiPassRate).toBe(0);
      expect(stats.hrAgreementRate).toBeNull();
    });
  });

  describe('getCvSignedUrl & findMine interviewId', () => {
    it('returns presigned S3 url with 10-minute expiry', async () => {
      repo.findCvKeyById.mockResolvedValueOnce({
        id: APP_ID,
        cvS3Key: 'cvs/job/cv.pdf',
        job: { createdById: HR_A },
      });

      const res = await service.getCvSignedUrl(HR_A, APP_ID);
      expect(storage.getSignedUrl).toHaveBeenCalledWith('cvs/job/cv.pdf', SIGNED_URL_EXPIRES_SEC);
      expect(res).toEqual({
        url: 'https://s3.example.com/signed-cv.pdf',
        expiresInSec: 600,
      });
    });

    it('includes interviewId in findMine when interview exists', async () => {
      const now = new Date('2026-11-21T08:00:00.000Z');
      repo.findByCandidate.mockResolvedValueOnce([
        {
          id: APP_ID,
          status: ApplicationStatus.INTERVIEW_INVITED,
          cvFileName: 'cv.pdf',
          cvSizeBytes: 1000,
          cvMimeType: 'application/pdf',
          aiRecommendation: AiRecommendation.PASS,
          createdAt: now,
          updatedAt: now,
          job: { id: JOB_ID, title: 'Backend NestJS' },
          interview: { id: INTERVIEW_ID },
        },
      ]);

      const res = await service.findMine('cand-1');
      expect(res[0].interviewId).toBe(INTERVIEW_ID);
    });
  });
});
