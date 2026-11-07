import { ApiError, type GenerateContentResponseUsageMetadata } from '@google/genai';
import { AiError, AiRateLimitError, AiTimeoutError } from './errors.js';
import { isRetryableStatus } from './retry.js';

/**
 * Lỗi nội bộ: MỘT lần gọi vượt quá thời gian cho phép.
 * Chỉ dùng bên trong package; hết lượt retry sẽ được đổi thành AiTimeoutError.
 */
export class AttemptTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Gemini attempt timed out after ${timeoutMs}ms`);
    this.name = 'AttemptTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Chạy `run` với giới hạn thời gian.
 * - Truyền AbortSignal cho SDK để SDK hủy request HTTP khi hết giờ.
 * - Đồng thời "đua" với một bộ đếm giờ, nên kể cả khi SDK không dừng kịp,
 *   hàm này vẫn trả lỗi đúng lúc.
 */
export async function runWithTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AttemptTimeoutError(timeoutMs));
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Quy tắc retry của thẻ W1-AI-02: timeout, 429, 500, 503. */
export function isRetryableGeminiError(error: unknown): boolean {
  if (error instanceof AttemptTimeoutError) return true;
  return error instanceof ApiError && isRetryableStatus(error.status);
}

/** Đổi lỗi bất kỳ (từ SDK, mạng, timeout) thành lỗi của @hireflow/ai. */
export function toAiError(error: unknown, attempts: number): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof AttemptTimeoutError) {
    return new AiTimeoutError(error.timeoutMs, { attempts, cause: error });
  }
  if (error instanceof ApiError) {
    if (error.status === 429) return new AiRateLimitError({ attempts, cause: error });
    return new AiError('AI_REQUEST_FAILED', `Gemini request failed with status ${error.status}`, {
      status: error.status,
      attempts,
      cause: error,
    });
  }
  return new AiError('AI_REQUEST_FAILED', 'Gemini request failed', { attempts, cause: error });
}

/** Mô tả ngắn lý do retry để ghi log. */
export function describeRetryReason(error: unknown): string {
  if (error instanceof AttemptTimeoutError) return 'timeout';
  if (error instanceof ApiError) return `status ${error.status}`;
  return 'unknown';
}

/** Chuỗi token dạng "in/out/total", hoặc "n/a" nếu SDK không trả về. */
export function formatUsage(usage: GenerateContentResponseUsageMetadata | undefined): string {
  if (!usage) return 'n/a';
  const show = (n: number | undefined) => (n === undefined ? '?' : String(n));
  return `${show(usage.promptTokenCount)}/${show(usage.candidatesTokenCount)}/${show(usage.totalTokenCount)}`;
}
