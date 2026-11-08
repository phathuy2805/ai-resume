import { ApiError } from '@google/genai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiError, AiRateLimitError, AiTimeoutError } from './errors.js';
import {
  AttemptTimeoutError,
  describeRetryReason,
  formatUsage,
  isRetryableGeminiError,
  runWithTimeout,
  toAiError,
} from './gemini.js';

const apiError = (status: number) => new ApiError({ message: '{}', status });

afterEach(() => {
  vi.useRealTimers();
});

describe('runWithTimeout', () => {
  it('xong trước hạn: trả kết quả và hủy bộ đếm giờ (không để timer treo)', async () => {
    vi.useFakeTimers();

    await expect(runWithTimeout(1000, async () => 'ok')).resolves.toBe('ok');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lỗi trước hạn: ném nguyên lỗi đó và hủy bộ đếm giờ', async () => {
    vi.useFakeTimers();
    const error = apiError(500);

    await expect(
      runWithTimeout(1000, async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('quá hạn: ném AttemptTimeoutError và abort signal đã truyền vào', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;

    const promise = runWithTimeout(1000, (s) => {
      signal = s;
      return new Promise(() => {});
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(AttemptTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);

    await assertion;
    expect(signal?.aborted).toBe(true);
  });
});

describe('isRetryableGeminiError', () => {
  it.each([429, 500, 503])('retry với ApiError %i', (status) => {
    expect(isRetryableGeminiError(apiError(status))).toBe(true);
  });

  it('retry với timeout', () => {
    expect(isRetryableGeminiError(new AttemptTimeoutError(1))).toBe(true);
  });

  it.each([
    ['ApiError 400', apiError(400)],
    ['ApiError 403', apiError(403)],
    ['lỗi mạng (fetch failed)', new TypeError('fetch failed')],
    [
      'lỗi bất kỳ có status 503 nhưng không phải ApiError',
      Object.assign(new Error(), { status: 503 }),
    ],
  ])('không retry: %s', (_label, error) => {
    expect(isRetryableGeminiError(error)).toBe(false);
  });
});

describe('toAiError', () => {
  it('giữ nguyên lỗi đã là AiError', () => {
    const error = new AiTimeoutError(1);
    expect(toAiError(error, 3)).toBe(error);
  });

  it('timeout → AiTimeoutError kèm số lần gọi', () => {
    expect(toAiError(new AttemptTimeoutError(500), 4)).toMatchObject({
      constructor: AiTimeoutError,
      timeoutMs: 500,
      attempts: 4,
    });
  });

  it('429 → AiRateLimitError', () => {
    expect(toAiError(apiError(429), 4)).toBeInstanceOf(AiRateLimitError);
  });

  it('ApiError khác → AI_REQUEST_FAILED kèm status, lỗi gốc nằm trong cause', () => {
    const cause = apiError(403);
    const error = toAiError(cause, 1);

    expect(error).toMatchObject({ code: 'AI_REQUEST_FAILED', status: 403, attempts: 1 });
    expect(error.cause).toBe(cause);
  });

  it('lỗi mạng → AI_REQUEST_FAILED không có status', () => {
    const error = toAiError(new TypeError('fetch failed'), 1);

    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ code: 'AI_REQUEST_FAILED', status: undefined });
  });
});

describe('describeRetryReason / formatUsage', () => {
  it('mô tả lý do retry', () => {
    expect(describeRetryReason(new AttemptTimeoutError(1))).toBe('timeout');
    expect(describeRetryReason(apiError(503))).toBe('status 503');
    expect(describeRetryReason(new Error('x'))).toBe('unknown');
  });

  it('định dạng số token', () => {
    expect(formatUsage({ promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 })).toBe(
      '1/2/3',
    );
    expect(formatUsage({ promptTokenCount: 1 })).toBe('1/?/?');
    expect(formatUsage(undefined)).toBe('n/a');
  });
});
