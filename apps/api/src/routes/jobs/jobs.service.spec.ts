import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobAnalysisService } from '../../shared/ai/job-analysis.service.js';
import { JobStatus } from '../../shared/constants/job.constant.js';
import { JobAnalysisTrigger } from './job-analysis.trigger.js';
import type { PrismaJobWithCount } from './jobs.mapper.js';
import type { JobsRepository } from './jobs.repository.js';
import { JobsService } from './jobs.service.js';

const HR_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_HR_ID = '44444444-4444-4444-8444-444444444444';
const JOB_ID = '22222222-2222-4222-8222-222222222222';

function prismaJob(overrides: Partial<PrismaJobWithCount> = {}): PrismaJobWithCount {
  const now = new Date('2026-11-19T03:00:00.000Z');
  return {
    id: JOB_ID,
    title: 'Backend NestJS',
    description: 'Xây dựng API',
    requirements: null,
    requiredSkills: ['NestJS'],
    preferredSkills: [],
    minYearsExperience: 2,
    level: 'MIDDLE',
    status: JobStatus.OPEN,
    cvPassThreshold: 85,
    interviewQuestionCount: 4,
    rubricWeights: {
      technical: 50,
      communication: 20,
      relevance: 20,
      evidence: 10,
    },
    parsedJd: null,
    createdById: HR_ID,
    createdAt: now,
    updatedAt: now,
    _count: { applications: 3 },
    ...overrides,
  } as PrismaJobWithCount;
}

describe('JobsService', () => {
  let repo: {
    findJobByIdWithCount: ReturnType<typeof vi.fn>;
    createJob: ReturnType<typeof vi.fn>;
    closeJob: ReturnType<typeof vi.fn>;
    reopenJob: ReturnType<typeof vi.fn>;
  };
  let trigger: { enqueue: ReturnType<typeof vi.fn> };
  let service: JobsService;

  beforeEach(() => {
    repo = {
      findJobByIdWithCount: vi.fn(),
      createJob: vi.fn(),
      closeJob: vi.fn(),
      reopenJob: vi.fn(),
    };
    trigger = { enqueue: vi.fn() };
    service = new JobsService(
      repo as unknown as JobsRepository,
      trigger as unknown as JobAnalysisTrigger,
    );
  });

  describe('create', () => {
    it('creates a job and enqueues background JD analysis without blocking response', async () => {
      repo.createJob.mockResolvedValue(prismaJob());

      const job = await service.create(HR_ID, {
        title: 'Backend NestJS',
        description: 'Xây dựng API',
        requiredSkills: ['NestJS'],
        preferredSkills: [],
        minYearsExperience: 2,
        level: 'MIDDLE',
        cvPassThreshold: 85,
        interviewQuestionCount: 4,
        rubricWeights: { technical: 50, communication: 20, relevance: 20, evidence: 10 },
      });

      expect(trigger.enqueue).toHaveBeenCalledWith(JOB_ID);
      expect(job.id).toBe(JOB_ID);
    });
  });

  describe('findMineById', () => {
    it('returns the HR view with AI config for the owner, including closed jobs', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(prismaJob({ status: JobStatus.CLOSED }));

      const job = await service.findMineById(HR_ID, JOB_ID);

      expect(job).toMatchObject({
        id: JOB_ID,
        status: JobStatus.CLOSED,
        cvPassThreshold: 85,
        rubricWeights: {
          technical: 50,
          communication: 20,
          relevance: 20,
          evidence: 10,
        },
        applicationCount: 3,
        isAnalyzed: false,
      });
      expect(job).not.toHaveProperty('parsedJd');
    });

    it('rejects a job owned by another HR with 403', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(prismaJob({ createdById: OTHER_HR_ID }));
      await expect(service.findMineById(HR_ID, JOB_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns 404 when the job does not exist', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(null);
      await expect(service.findMineById(HR_ID, JOB_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reopen', () => {
    it('reopens a closed job owned by the HR', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(prismaJob({ status: JobStatus.CLOSED }));
      repo.reopenJob.mockResolvedValue(prismaJob({ status: JobStatus.OPEN }));

      const job = await service.reopen(HR_ID, JOB_ID);

      expect(repo.reopenJob).toHaveBeenCalledWith(JOB_ID);
      expect(job.status).toBe(JobStatus.OPEN);
    });

    it('is idempotent for a job that is already open', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(prismaJob({ status: JobStatus.OPEN }));

      const job = await service.reopen(HR_ID, JOB_ID);

      expect(repo.reopenJob).not.toHaveBeenCalled();
      expect(job.status).toBe(JobStatus.OPEN);
    });

    it('rejects a job owned by another HR with 403', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(
        prismaJob({ status: JobStatus.CLOSED, createdById: OTHER_HR_ID }),
      );
      await expect(service.reopen(HR_ID, JOB_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.reopenJob).not.toHaveBeenCalled();
    });

    it('returns 404 when the job does not exist', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(null);
      await expect(service.reopen(HR_ID, JOB_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('close', () => {
    it('closes an open job owned by the HR', async () => {
      repo.findJobByIdWithCount.mockResolvedValue(prismaJob({ status: JobStatus.OPEN }));
      repo.closeJob.mockResolvedValue(prismaJob({ status: JobStatus.CLOSED }));

      const job = await service.close(HR_ID, JOB_ID);

      expect(repo.closeJob).toHaveBeenCalledWith(JOB_ID);
      expect(job.status).toBe(JobStatus.CLOSED);
    });
  });
});

describe('JobAnalysisTrigger', () => {
  it('enqueues JD analysis via JobAnalysisService and catches background errors safely', async () => {
    const enqueueAnalyzeJob = vi.fn().mockRejectedValue(new Error('Gemini unavailable'));
    const jobAnalysisService = {
      enqueueAnalyzeJob,
    } as unknown as JobAnalysisService;
    const trigger = new JobAnalysisTrigger(jobAnalysisService);

    expect(() => trigger.enqueue(JOB_ID)).not.toThrow();
    await Promise.resolve();
    expect(enqueueAnalyzeJob).toHaveBeenCalledWith(JOB_ID, { force: true });
  });
});
