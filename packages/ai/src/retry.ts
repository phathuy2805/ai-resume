/** Thông tin về một lần gọi thất bại sắp được thử lại (dùng để ghi log). */
export interface RetryAttemptInfo {
  /** Lần gọi vừa thất bại, bắt đầu từ 1. */
  attempt: number;
  /** Thời gian sẽ chờ trước lần gọi tiếp theo (ms). */
  delayMs: number;
  error: unknown;
}

export interface RetryOptions {
  /** Số lần retry tối đa, KHÔNG tính lần gọi đầu tiên. */
  maxRetries: number;
  /** Trả về true nếu lỗi này đáng để thử lại. */
  shouldRetry: (error: unknown) => boolean;
  /** Đổi lỗi cuối cùng thành lỗi ném cho người gọi. Mặc định ném nguyên lỗi gốc. */
  toFinalError?: (error: unknown, attempts: number) => unknown;
  /** Gọi ngay trước mỗi lần chờ để retry. */
  onRetry?: (info: RetryAttemptInfo) => void;
  /** Mốc chờ của lần retry đầu tiên (ms). Mặc định 500. */
  baseDelayMs?: number;
  /** Thời gian chờ tối đa giữa hai lần gọi (ms). Mặc định 8000. */
  maxDelayMs?: number;
  /** Inject để test không phải chờ thật. */
  sleep?: (ms: number) => Promise<void>;
  /** Inject để test có kết quả cố định. Trả về số trong [0, 1). */
  random?: () => number;
}

export interface RetryResult<T> {
  value: T;
  /** Tổng số lần đã gọi (1 = thành công ngay lần đầu). */
  attempts: number;
}

export const DEFAULT_BASE_DELAY_MS = 500;
export const DEFAULT_MAX_DELAY_MS = 8_000;

/** Các HTTP status được phép retry, theo tiêu chí của thẻ W1-AI-02. */
const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([429, 500, 503]);

export function isRetryableStatus(status: number | undefined): boolean {
  return status !== undefined && RETRYABLE_STATUSES.has(status);
}

/**
 * Exponential backoff + jitter.
 * Mốc chờ tăng gấp đôi sau mỗi lần (500, 1000, 2000, ... tối đa maxDelayMs),
 * rồi chọn ngẫu nhiên trong khoảng [50%, 100%] của mốc đó.
 */
export function computeDelay(
  retryIndex: number,
  baseDelayMs: number,
  maxDelayMs: number,
  random: () => number,
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** retryIndex);
  const half = ceiling / 2;
  return Math.round(half + random() * half);
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gọi `fn`, nếu lỗi và `shouldRetry(lỗi)` là true thì chờ rồi gọi lại,
 * tối đa `maxRetries` lần. Không biết gì về Gemini: cách phân loại lỗi
 * do người gọi truyền vào.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<RetryResult<T>> {
  const {
    maxRetries,
    shouldRetry,
    toFinalError = (error) => error,
    onRetry,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    sleep = defaultSleep,
    random = Math.random,
  } = options;

  for (let attempt = 1; ; attempt++) {
    try {
      const value = await fn(attempt);
      return { value, attempts: attempt };
    } catch (error) {
      const retriesUsed = attempt - 1;
      if (retriesUsed >= maxRetries || !shouldRetry(error)) {
        throw toFinalError(error, attempt);
      }
      const delayMs = computeDelay(retriesUsed, baseDelayMs, maxDelayMs, random);
      onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs);
    }
  }
}
