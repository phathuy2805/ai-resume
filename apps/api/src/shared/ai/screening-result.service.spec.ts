import {
  EMBEDDING_DIMENSIONS,
  type ParsedCv,
  type ScoreBreakdown,
  type ScreeningOutput,
} from '@hireflow/ai';
import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvConfig } from '../config/env.config.js';
import { AiRecommendation } from '../constants/application-status.enum.js';
import type { AiRepository } from './ai.repository.js';
import { computeAiRecommendation } from './ai.util.js';
import { ScreeningResultService } from './screening-result.service.js';

const APP_ID = 'a1000000-0000-4000-8000-000000000001';
const VALID_VECTOR = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.01);

const SAMPLE_PARSED_CV: ParsedCv = {
  schemaVersion: 1,
  summary: 'Backend developer 3 năm kinh nghiệm',
  skills: ['NodeJS', 'NestJS'],
  experiences: [],
  education: [],
  projects: [],
  totalYearsExperience: 3,
  languages: ['Vietnamese'],
};

const SAMPLE_BREAKDOWN: ScoreBreakdown = {
  requiredSkills: { score: 100, weight: 35, matched: ['NodeJS', 'NestJS'], missing: [] },
  preferredSkills: { score: 50, weight: 10, matched: ['Redis'], missing: ['Docker'] },
  experienceYears: { score: 100, weight: 15, candidateYears: 3, requiredYears: 2 },
  relevance: { score: 80, weight: 25, comment: 'Kinh nghiệm phù hợp' },
  similarity: { score: 75, weight: 15, cosine: 0.88 },
  capped: false,
};

function makeScreeningOutput(overrides: Partial<ScreeningOutput> = {}): ScreeningOutput {
  return {
    parsedCv: SAMPLE_PARSED_CV,
    cvEmbedding: VALID_VECTOR,
    total: 82,
    breakdown: SAMPLE_BREAKDOWN,
    explanation: {
      strengths: [
        {
          point: 'Thành thạo NodeJS và NestJS',
          quote: '3 năm kinh nghiệm NodeJS và NestJS',
        },
      ],
      gaps: [],
      summary: 'Ứng viên đáp ứng đầy đủ kỹ năng bắt buộc và số năm kinh nghiệm.',
    },
    timings: {
      parseCvMs: 420,
      embedMs: 180,
      scoreMs: 310,
      explainMs: 250,
      totalMs: 1160,
    },
    ...overrides,
  };
}

describe('computeAiRecommendation', () => {
  it('classifies PASS, CONSIDER, and REJECT around cvPassThreshold with margin=10', () => {
    expect(computeAiRecommendation(70, 70, 10)).toBe(AiRecommendation.PASS);
    expect(computeAiRecommendation(85, 70, 10)).toBe(AiRecommendation.PASS);
    expect(computeAiRecommendation(69, 70, 10)).toBe(AiRecommendation.CONSIDER);
    expect(computeAiRecommendation(60, 70, 10)).toBe(AiRecommendation.CONSIDER);
    expect(computeAiRecommendation(59, 70, 10)).toBe(AiRecommendation.REJECT);
  });

  it('respects custom consider margin from config', () => {
    expect(computeAiRecommendation(64, 70, 5)).toBe(AiRecommendation.REJECT);
    expect(computeAiRecommendation(65, 70, 5)).toBe(AiRecommendation.CONSIDER);
  });
});

describe('ScreeningResultService', () => {
  let aiRepo: {
    findApplicationForScreening: ReturnType<typeof vi.fn>;
    saveScreeningResult: ReturnType<typeof vi.fn>;
  };
  let service: ScreeningResultService;

  beforeEach(() => {
    aiRepo = {
      findApplicationForScreening: vi.fn(),
      saveScreeningResult: vi.fn().mockResolvedValue(undefined),
    };
    const config = { get: vi.fn().mockReturnValue(10) } as unknown as ConfigService<EnvConfig, true>;
    service = new ScreeningResultService(aiRepo as unknown as AiRepository, config);
  });

  it('saves ScreeningOutput (parsedCv, cvEmbedding, aiRecommendation, and ScreeningResult)', async () => {
    aiRepo.findApplicationForScreening.mockResolvedValue({
      id: APP_ID,
      job: { cvPassThreshold: 70 },
    });
    const output = makeScreeningOutput({ total: 65 });

    const summary = await service.saveScreeningResult(APP_ID, output);

    expect(summary).toEqual({
      applicationId: APP_ID,
      totalScore: 65,
      aiRecommendation: AiRecommendation.CONSIDER,
    });
    expect(aiRepo.saveScreeningResult).toHaveBeenCalledWith({
      applicationId: APP_ID,
      output,
      aiRecommendation: AiRecommendation.CONSIDER,
    });
  });

  it('rejects invalid embedding dimension before touching DB', async () => {
    await expect(
      service.saveScreeningResult(APP_ID, makeScreeningOutput({ cvEmbedding: [0.1, 0.2] })),
    ).rejects.toThrow(`${EMBEDDING_DIMENSIONS}`);
    expect(aiRepo.findApplicationForScreening).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when application does not exist', async () => {
    aiRepo.findApplicationForScreening.mockResolvedValue(null);

    await expect(
      service.saveScreeningResult(APP_ID, makeScreeningOutput()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aiRepo.saveScreeningResult).not.toHaveBeenCalled();
  });
});
