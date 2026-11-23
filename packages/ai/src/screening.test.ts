import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import type { AiClient } from './client.js';
import { CvExtractionError } from './cv-text.js';
import { CvExtractionSchema } from './cv.js';
import { EMBEDDING_DIMENSIONS } from './embedding.js';
import { AiRateLimitError, AiTimeoutError } from './errors.js';
import { ExplanationResponseSchema, type ExplanationResponse } from './explanation.js';
import { PARSED_JD_SCHEMA_VERSION, type ParsedJd } from './jd.js';
import type { AiLogger } from './logger.js';
import { RelevanceSchema } from './scoring.js';
import { screenCv, ScreeningStepError, type ScreenCvInput } from './screening.js';

const CV_TEXT = `NGUYỄN VĂN A
Backend Developer tại Công ty ABC (01/2022 - nay)
Xây dựng RESTful API bằng NestJS và PostgreSQL.
Kỹ năng: NodeJS, TypeScript, Docker`;

const JD: ParsedJd = {
  schemaVersion: PARSED_JD_SCHEMA_VERSION,
  requiredSkills: ['NodeJS', 'NestJS', 'PostgreSQL', 'Kubernetes'],
  preferredSkills: [],
  minYearsExperience: 2,
  level: null,
  educationRequirement: null,
  responsibilities: ['Phát triển RESTful API'],
  domain: 'Backend Engineering',
};

const EXTRACTION = CvExtractionSchema.parse({
  summary: 'Backend developer.',
  skills: ['NodeJS', 'TypeScript', 'Docker'],
  experiences: [
    {
      company: 'Công ty ABC',
      title: 'Backend Developer',
      startDate: '2022-01',
      endDate: null,
      description: 'Xây dựng RESTful API.',
      technologies: ['NestJS', 'PostgreSQL'],
    },
  ],
});

const EXPLANATION: ExplanationResponse = {
  strengths: [
    {
      quote: 'Xây dựng RESTful API bằng NestJS và PostgreSQL',
      point: 'Ứng viên đã làm API với đúng công nghệ.',
    },
  ],
  gapNotes: [{ skill: 'Kubernetes', note: 'CV không nhắc Kubernetes.' }],
  summary: 'Ứng viên phù hợp phần lớn yêu cầu.',
};

/** Vector đơn vị EMBEDDING_DIMENSIONS chiều theo hướng trục `axis`. */
function unitVector(axis = 0): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[axis] = 1;
  return vector;
}

const INPUT: ScreenCvInput = { cvText: CV_TEXT, parsedJd: JD, jdEmbedding: unitVector() };
const REFERENCE_DATE = new Date('2026-11-01');

interface FakeOptions {
  failOn?: 'CV' | 'RELEVANCE' | 'EXPLANATION';
  embedError?: Error;
}

/** AI giả: trả kết quả theo schema được hỏi, ghi lại thứ tự các lần gọi. */
function fakeAi({ failOn, embedError }: FakeOptions = {}) {
  const calls: string[] = [];
  const failure = new AiRateLimitError();
  const responses = new Map<z.ZodType, [string, unknown]>([
    [CvExtractionSchema, ['CV', EXTRACTION]],
    [RelevanceSchema, ['RELEVANCE', { comment: 'Kinh nghiệm phù hợp.', score: 8 }]],
    [ExplanationResponseSchema, ['EXPLANATION', EXPLANATION]],
  ]);
  const generateStructured = vi.fn(
    async (_prompt: string, schema: z.ZodType, _options?: object) => {
      const [name, response] = responses.get(schema) ?? ['UNKNOWN', undefined];
      calls.push(name);
      if (name === failOn) throw failure;
      return response;
    },
  );
  const embed = vi.fn(async () => {
    calls.push('EMBED');
    if (embedError) throw embedError;
    return unitVector();
  });
  const ai = { generateStructured, embed } as unknown as AiClient;
  return { ai, calls, failure, generateStructured };
}

function fakeLogger(): AiLogger {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

async function stepErrorOf(promise: Promise<unknown>): Promise<ScreeningStepError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ScreeningStepError);
  return error as ScreeningStepError;
}

describe('screenCv', () => {
  it('chạy parse → embed → chấm điểm → giải thích và trả đủ kết quả', async () => {
    const { ai, calls } = fakeAi();
    const result = await screenCv(ai, INPUT, {
      referenceDate: REFERENCE_DATE,
      logger: fakeLogger(),
    });

    expect(calls).toEqual(['CV', 'EMBED', 'RELEVANCE', 'EXPLANATION']);
    expect(result.parsedCv.skills).toEqual(
      expect.arrayContaining(['NodeJS', 'NestJS', 'PostgreSQL']),
    );
    expect(result.parsedCv.totalYearsExperience).toBeGreaterThan(4);
    expect(result.cvEmbedding).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(Number.isInteger(result.total)).toBe(true);
    expect(result.breakdown.requiredSkills.missing).toEqual(['Kubernetes']);
    expect(result.explanation).toEqual({
      strengths: [
        {
          point: 'Ứng viên đã làm API với đúng công nghệ.',
          quote: 'Xây dựng RESTful API bằng NestJS và PostgreSQL',
        },
      ],
      gaps: [{ skill: 'Kubernetes', note: 'CV không nhắc Kubernetes.' }],
      summary: 'Ứng viên phù hợp phần lớn yêu cầu.',
    });
  });

  it('timings đủ 5 bước, là số nguyên ≥ 0, tổng bao các bước', async () => {
    const { ai } = fakeAi();
    const { timings } = await screenCv(ai, INPUT, { logger: fakeLogger() });

    expect(Object.keys(timings).sort()).toEqual(
      ['embedMs', 'explainMs', 'parseCvMs', 'scoreMs', 'totalMs'].sort(),
    );
    for (const value of Object.values(timings)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    const steps = timings.parseCvMs + timings.embedMs + timings.scoreMs + timings.explainMs;
    // Mỗi bước làm tròn riêng nên cho lệch tối đa 2 ms.
    expect(timings.totalMs).toBeGreaterThanOrEqual(steps - 2);
  });

  it('truyền CallOptions xuống từng lần gọi, temperature 0', async () => {
    const { ai, generateStructured } = fakeAi();
    await screenCv(ai, INPUT, { timeoutMs: 1234, logger: fakeLogger() });
    for (const call of generateStructured.mock.calls) {
      expect(call[2]).toMatchObject({ timeoutMs: 1234, temperature: 0 });
    }
  });

  it('truyền config chấm điểm xuống scoreCv', async () => {
    const { ai } = fakeAi();
    const result = await screenCv(ai, INPUT, {
      logger: fakeLogger(),
      scoring: { weights: { requiredSkills: 45, relevance: 15 } },
    });
    expect(result.breakdown.requiredSkills.weight).toBe(45);
    expect(result.breakdown.relevance.weight).toBe(15);
  });

  it('cvText rỗng → lỗi bước PARSE, cause là CvExtractionError, không gọi Gemini', async () => {
    const { ai, calls } = fakeAi();
    const error = await stepErrorOf(screenCv(ai, { ...INPUT, cvText: '   ' }));
    expect(error.step).toBe('PARSE');
    expect(error.cause).toBeInstanceOf(CvExtractionError);
    expect(calls).toEqual([]);
  });

  it('Gemini lỗi khi phân tích CV → PARSE, giữ lỗi gốc', async () => {
    const { ai, failure } = fakeAi({ failOn: 'CV' });
    const error = await stepErrorOf(screenCv(ai, INPUT));
    expect(error.step).toBe('PARSE');
    expect(error.cause).toBe(failure);
    expect(error.message).toBe(`Screening failed at PARSE: ${failure.message}`);
  });

  it('embedding lỗi → EMBED', async () => {
    const { ai, calls } = fakeAi({ embedError: new AiTimeoutError(30000) });
    const error = await stepErrorOf(screenCv(ai, INPUT));
    expect(error.step).toBe('EMBED');
    expect(error.cause).toBeInstanceOf(AiTimeoutError);
    expect(calls).toEqual(['CV', 'EMBED']);
  });

  it('jdEmbedding sai số chiều → SCORE (trước khi gọi Gemini chấm liên quan)', async () => {
    const { ai, calls } = fakeAi();
    const error = await stepErrorOf(screenCv(ai, { ...INPUT, jdEmbedding: [1, 0] }));
    expect(error.step).toBe('SCORE');
    expect(error.cause).toBeInstanceOf(RangeError);
    expect(calls).toEqual(['CV', 'EMBED']);
  });

  it('Gemini lỗi khi chấm liên quan → SCORE', async () => {
    const { ai } = fakeAi({ failOn: 'RELEVANCE' });
    expect((await stepErrorOf(screenCv(ai, INPUT))).step).toBe('SCORE');
  });

  it('Gemini lỗi khi giải thích → EXPLAIN, không trả giải thích mặc định', async () => {
    const { ai, calls } = fakeAi({ failOn: 'EXPLANATION' });
    const error = await stepErrorOf(screenCv(ai, INPUT, { logger: fakeLogger() }));
    expect(error.step).toBe('EXPLAIN');
    expect(calls).toEqual(['CV', 'EMBED', 'RELEVANCE', 'EXPLANATION']);
  });

  it('message lỗi không chứa nội dung CV', async () => {
    const { ai } = fakeAi({ failOn: 'EXPLANATION' });
    const error = await stepErrorOf(screenCv(ai, INPUT, { logger: fakeLogger() }));
    expect(error.message).not.toContain('NGUYỄN');
    expect(error.message).not.toContain('RESTful');
    expect(error.name).toBe('ScreeningStepError');
  });
});
