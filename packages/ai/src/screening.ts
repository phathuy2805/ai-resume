import type { AiClient, CallOptions } from './client.js';
import { parseCv, type ParsedCv } from './cv.js';
import { embedCv } from './embedding.js';
import type { TotalYearsOptions } from './experience.js';
import { explainScore, type Explanation } from './explanation.js';
import type { ParsedJd } from './jd.js';
import type { AiLogger } from './logger.js';
import { scoreCv, type ScoreBreakdown, type ScoringConfigInput } from './scoring.js';

// Hàm tổng sàng lọc CV (W2-AI-03): BE gọi 1 lần cho mỗi hồ sơ (W2-BE-01 / W2-BE-02).
// parseCv → embedCv → scoreCv → explainScore, chạy tuần tự vì bước sau cần kết quả bước trước.

export const SCREENING_STEPS = ['PARSE', 'EMBED', 'SCORE', 'EXPLAIN'] as const;
export type ScreeningStep = (typeof SCREENING_STEPS)[number];

/** Thời gian từng bước (ms, số nguyên). BE lưu vào ScreeningResult.timings. */
export interface ScreeningTimings {
  parseCvMs: number;
  embedMs: number;
  /** Gồm cả lần gọi Gemini chấm mức độ liên quan. */
  scoreMs: number;
  explainMs: number;
  /** Cả pipeline. BE lưu thêm vào ScreeningResult.processingDurationMs. */
  totalMs: number;
}

/**
 * Kết quả sàng lọc một CV. Cách BE lưu:
 * - parsedCv → Application.parsedCv; cvEmbedding → Application.embedding (::vector)
 * - total → ScreeningResult.totalScore (và so với cvPassThreshold để ra PASS / CONSIDER / REJECT)
 * - breakdown, explanation, timings → cột Json cùng tên của ScreeningResult
 * - timings.totalMs → ScreeningResult.processingDurationMs
 */
export interface ScreeningOutput {
  parsedCv: ParsedCv;
  cvEmbedding: number[];
  /** Điểm tổng, số nguyên 0–100. */
  total: number;
  breakdown: ScoreBreakdown;
  explanation: Explanation;
  timings: ScreeningTimings;
}

export interface ScreenCvInput {
  /** Text CV đã lưu lúc nộp (Application.cvText), không trích lại từ PDF. */
  cvText: string;
  /** Job.parsedJd (ensureJobAnalyzed đảm bảo đã có). */
  parsedJd: ParsedJd;
  /** Job.embedding. */
  jdEmbedding: readonly number[];
}

export interface ScreenCvOptions extends CallOptions, TotalYearsOptions {
  /** Ghi đè trọng số / điểm chặn / mốc cosine của scoreCv. */
  scoring?: ScoringConfigInput;
  /** Nơi ghi log của bước giải thích (số trích dẫn bị bỏ). Mặc định console. */
  logger?: AiLogger;
}

/**
 * Lỗi ở một bước của screenCv. `step` cho biết bước hỏng, `cause` giữ lỗi gốc
 * (AiError, CvExtractionError, RangeError...). `message` không chứa nội dung CV,
 * BE lưu thẳng vào Application.screeningError.
 */
export class ScreeningStepError extends Error {
  readonly step: ScreeningStep;

  constructor(step: ScreeningStep, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Screening failed at ${step}: ${reason}`, { cause });
    this.name = 'ScreeningStepError';
    this.step = step;
  }
}

async function runStep<T>(
  step: ScreeningStep,
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const startedAt = performance.now();
  try {
    const value = await fn();
    return { value, ms: elapsedMs(startedAt) };
  } catch (error) {
    throw new ScreeningStepError(step, error);
  }
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

/**
 * Sàng lọc một CV so với JD: phân tích CV, embedding, chấm điểm 0–100, giải thích.
 * Không tự thử lại cả pipeline (client đã retry từng lần gọi Gemini; BE chạy lại cả pipeline khi cần).
 * Mỗi CV gọi Gemini khoảng 4 lần (parse, embed, chấm liên quan, giải thích).
 *
 * @throws ScreeningStepError khi một bước lỗi (step = PARSE | EMBED | SCORE | EXPLAIN).
 *
 * @example
 * try {
 *   const result = await screenCv(ai, { cvText, parsedJd, jdEmbedding }, { logger });
 * } catch (error) {
 *   if (error instanceof ScreeningStepError) application.screeningError = error.message;
 * }
 */
export async function screenCv(
  ai: AiClient,
  input: ScreenCvInput,
  options: ScreenCvOptions = {},
): Promise<ScreeningOutput> {
  const { referenceDate, scoring, logger, ...callOptions } = options;
  const { cvText, parsedJd, jdEmbedding } = input;
  const startedAt = performance.now();

  const parse = await runStep('PARSE', () =>
    parseCv(ai, cvText, { ...callOptions, referenceDate }),
  );
  const parsedCv = parse.value;

  const embed = await runStep('EMBED', () => embedCv(ai, parsedCv, callOptions));
  const cvEmbedding = embed.value;

  const score = await runStep('SCORE', () =>
    scoreCv(
      ai,
      { parsedCv, parsedJd, cvEmbedding, jdEmbedding },
      { ...callOptions, config: scoring },
    ),
  );
  const { total, breakdown } = score.value;

  const explain = await runStep('EXPLAIN', () =>
    explainScore(ai, { cvText, parsedCv, parsedJd, breakdown }, { ...callOptions, logger }),
  );

  return {
    parsedCv,
    cvEmbedding,
    total,
    breakdown,
    explanation: explain.value,
    timings: {
      parseCvMs: parse.ms,
      embedMs: embed.ms,
      scoreMs: score.ms,
      explainMs: explain.ms,
      totalMs: elapsedMs(startedAt),
    },
  };
}
