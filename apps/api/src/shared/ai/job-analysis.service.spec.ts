import { EMBEDDING_DIMENSIONS, type AiClient, type ParsedJd } from '@hireflow/ai';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiRepository } from './ai.repository.js';
import { AiQueueService } from './ai-queue.service.js';
import { JobAnalysisService } from './job-analysis.service.js';

const aiMocks = vi.hoisted(() => ({
  parseJd: vi.fn(),
  embedJd: vi.fn(),
}));

vi.mock('@hireflow/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hireflow/ai')>();
  return {
    ...actual,
    parseJd: aiMocks.parseJd,
    embedJd: aiMocks.embedJd,
  };
});

const JOB_ID = '22222222-2222-4222-8222-222222222222';
const SAMPLE_VECTOR = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i === 0 ? 1 : 0));
const SAMPLE_VECTOR_TEXT = `[${SAMPLE_VECTOR.join(',')}]`;

const SAMPLE_PARSED_JD: ParsedJd = {
  schemaVersion: 1,
  requiredSkills: ['NodeJS', 'NestJS'],
  preferredSkills: ['Redis'],
  minYearsExperience: 2,
  level: 'middle',
  educationRequirement: null,
  responsibilities: ['Xây dựng REST API'],
  domain: 'Backend Engineering',
};

function makeJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    title: 'Backend Engineer',
    description: 'Xây dựng hệ thống API với NestJS',
    requirements: null,
    requiredSkills: ['NodeJS', 'NestJS'],
    preferredSkills: ['Redis'],
    minYearsExperience: 2,
    level: 'MIDDLE',
    parsedJd: null,
    embeddingText: null,
    ...overrides,
  };
}

describe('JobAnalysisService', () => {
  let aiClient: AiClient;
  let aiQueue: AiQueueService;
  let aiRepo: {
    findJobForAnalysis: ReturnType<typeof vi.fn>;
    saveJobAnalysis: ReturnType<typeof vi.fn>;
  };
  let service: JobAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    aiClient = { models: { text: 't', embedding: 'e', audio: 'a' } } as unknown as AiClient;
    aiQueue = new AiQueueService();
    aiRepo = {
      findJobForAnalysis: vi.fn(),
      saveJobAnalysis: vi.fn().mockResolvedValue(undefined),
    };
    service = new JobAnalysisService(aiClient, aiQueue, aiRepo as unknown as AiRepository);
  });

  describe('analyzeJob', () => {
    it('parses JD, computes embedding, and persists both atomically', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(makeJobRow());
      aiMocks.parseJd.mockResolvedValue(SAMPLE_PARSED_JD);
      aiMocks.embedJd.mockResolvedValue(SAMPLE_VECTOR);

      const result = await service.analyzeJob(JOB_ID);

      expect(aiMocks.parseJd).toHaveBeenCalledWith(aiClient, expect.objectContaining({ title: 'Backend Engineer' }));
      expect(aiMocks.embedJd).toHaveBeenCalledWith(aiClient, SAMPLE_PARSED_JD);
      expect(aiRepo.saveJobAnalysis).toHaveBeenCalledWith(JOB_ID, SAMPLE_PARSED_JD, SAMPLE_VECTOR);
      expect(result).toEqual({ parsedJd: SAMPLE_PARSED_JD, embedding: SAMPLE_VECTOR });
    });

    it('keeps parsedJd null (does not save) when AI fails', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(makeJobRow());
      aiMocks.parseJd.mockRejectedValue(new Error('Gemini rate limit'));

      await expect(service.analyzeJob(JOB_ID)).rejects.toThrow('Gemini rate limit');
      expect(aiMocks.embedJd).not.toHaveBeenCalled();
      expect(aiRepo.saveJobAnalysis).not.toHaveBeenCalled();
    });

    it('returns null without calling AI when job does not exist', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(null);

      const result = await service.analyzeJob(JOB_ID);

      expect(result).toBeNull();
      expect(aiMocks.parseJd).not.toHaveBeenCalled();
    });
  });

  describe('ensureJobAnalyzed', () => {
    it('returns cached parsedJd and embedding immediately without calling AI', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(
        makeJobRow({
          parsedJd: SAMPLE_PARSED_JD,
          embeddingText: SAMPLE_VECTOR_TEXT,
        }),
      );
      const addSpy = vi.spyOn(aiQueue, 'add');

      const result = await service.ensureJobAnalyzed(JOB_ID);

      expect(result).toEqual({ parsedJd: SAMPLE_PARSED_JD, embedding: SAMPLE_VECTOR });
      expect(addSpy).not.toHaveBeenCalled();
      expect(aiMocks.parseJd).not.toHaveBeenCalled();
    });

    it('re-analyzes via queue when parsedJd is null or embedding is missing', async () => {
      aiRepo.findJobForAnalysis
        .mockResolvedValueOnce(makeJobRow({ parsedJd: SAMPLE_PARSED_JD, embeddingText: null }))
        .mockResolvedValueOnce(makeJobRow({ parsedJd: SAMPLE_PARSED_JD, embeddingText: null }));
      aiMocks.parseJd.mockResolvedValue(SAMPLE_PARSED_JD);
      aiMocks.embedJd.mockResolvedValue(SAMPLE_VECTOR);

      const result = await service.ensureJobAnalyzed(JOB_ID);

      expect(aiRepo.saveJobAnalysis).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ parsedJd: SAMPLE_PARSED_JD, embedding: SAMPLE_VECTOR });
    });

    it('deduplicates concurrent ensureJobAnalyzed calls for the same jobId', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(makeJobRow());
      aiMocks.parseJd.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(SAMPLE_PARSED_JD), 30)),
      );
      aiMocks.embedJd.mockResolvedValue(SAMPLE_VECTOR);

      const [first, second] = await Promise.all([
        service.ensureJobAnalyzed(JOB_ID),
        service.ensureJobAnalyzed(JOB_ID),
      ]);

      expect(first).toEqual(second);
      expect(aiMocks.parseJd).toHaveBeenCalledTimes(1);
      expect(aiMocks.embedJd).toHaveBeenCalledTimes(1);
      expect(aiRepo.saveJobAnalysis).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when job does not exist', async () => {
      aiRepo.findJobForAnalysis.mockResolvedValue(null);

      await expect(service.ensureJobAnalyzed(JOB_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
