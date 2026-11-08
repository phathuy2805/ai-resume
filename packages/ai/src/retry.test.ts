import { describe, expect, it, vi } from 'vitest';
import { computeDelay, isRetryableStatus, withRetry } from './retry.js';

/** Tạo lỗi giả có HTTP status, giống lỗi mà SDK Gemini ném ra. */
function httpError(status: number): Error & { status: number } {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

/** Lỗi timeout giống lỗi mà AbortSignal.timeout() tạo ra. */
function timeoutError(): Error {
  const error = new Error('The operation was aborted due to timeout');
  error.name = 'TimeoutError';
  return error;
}

/** Quy tắc retry của thẻ: 429, 500, 503 và timeout. */
function shouldRetry(error: unknown): boolean {
  if (error instanceof Error && error.name === 'TimeoutError') return true;
  return isRetryableStatus((error as { status?: number }).status);
}

/** Tùy chọn mặc định cho test: không chờ thật, random cố định = 0. */
function setup(maxRetries = 3) {
  const sleep = vi.fn(async (_ms: number) => {});
  return { sleep, options: { maxRetries, shouldRetry, sleep, random: () => 0 } };
}

describe('isRetryableStatus', () => {
  it.each([429, 500, 503])('retry với status %i', (status) => {
    expect(isRetryableStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 502, 504])('không retry với status %i', (status) => {
    expect(isRetryableStatus(status)).toBe(false);
  });

  it('không retry khi không có status', () => {
    expect(isRetryableStatus(undefined)).toBe(false);
  });
});

describe('computeDelay', () => {
  it('mốc chờ tăng gấp đôi sau mỗi lần retry', () => {
    const almostOne = () => 0.999999;
    expect([0, 1, 2].map((i) => computeDelay(i, 500, 8000, almostOne))).toEqual([500, 1000, 2000]);
  });

  it('jitter nằm trong khoảng 50%–100% của mốc', () => {
    expect(computeDelay(0, 500, 8000, () => 0)).toBe(250);
    expect(computeDelay(0, 500, 8000, () => 0.5)).toBe(375);
  });

  it('không vượt quá maxDelayMs', () => {
    expect(computeDelay(20, 500, 8000, () => 0.999999)).toBe(8000);
  });
});

describe('withRetry', () => {
  it('thành công ngay lần đầu thì không chờ', async () => {
    const { sleep, options } = setup();
    const fn = vi.fn(async () => 'ok');

    await expect(withRetry(fn, options)).resolves.toEqual({ value: 'ok', attempts: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('lỗi 429 rồi thành công: gọi 2 lần', async () => {
    const { sleep, options } = setup();
    const fn = vi.fn().mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce('ok');

    await expect(withRetry(fn, options)).resolves.toEqual({ value: 'ok', attempts: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('timeout rồi thành công: có retry', async () => {
    const { options } = setup();
    const fn = vi.fn().mockRejectedValueOnce(timeoutError()).mockResolvedValueOnce('ok');

    await expect(withRetry(fn, options)).resolves.toEqual({ value: 'ok', attempts: 2 });
  });

  it('lỗi 503 liên tục: gọi 1 + maxRetries lần, thời gian chờ tăng dần', async () => {
    const { sleep, options } = setup(3);
    const fn = vi.fn().mockRejectedValue(httpError(503));

    await expect(withRetry(fn, options)).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([250, 500, 1000]);
  });

  it('lỗi 400: ném ngay, không retry', async () => {
    const { sleep, options } = setup();
    const fn = vi.fn().mockRejectedValue(httpError(400));

    await expect(withRetry(fn, options)).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('maxRetries = 0: không retry', async () => {
    const { options } = setup(0);
    const fn = vi.fn().mockRejectedValue(httpError(429));

    await expect(withRetry(fn, options)).rejects.toMatchObject({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('toFinalError nhận lỗi cuối và tổng số lần gọi', async () => {
    const { options } = setup(2);
    const fn = vi.fn().mockRejectedValue(httpError(429));
    const toFinalError = vi.fn(
      (_error: unknown, attempts: number) => new Error(`gave up after ${attempts}`),
    );

    await expect(withRetry(fn, { ...options, toFinalError })).rejects.toThrow('gave up after 3');
    expect(toFinalError).toHaveBeenCalledWith(expect.objectContaining({ status: 429 }), 3);
  });

  it('onRetry được gọi trước mỗi lần chờ', async () => {
    const { options } = setup(2);
    const fn = vi.fn().mockRejectedValue(httpError(500));
    const onRetry = vi.fn();

    await expect(withRetry(fn, { ...options, onRetry })).rejects.toBeDefined();
    expect(onRetry.mock.calls.map(([info]) => [info.attempt, info.delayMs])).toEqual([
      [1, 250],
      [2, 500],
    ]);
  });

  it('truyền số thứ tự lần gọi vào fn', async () => {
    const { options } = setup();
    const fn = vi.fn().mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce('ok');

    await withRetry(fn, options);
    expect(fn.mock.calls).toEqual([[1], [2]]);
  });

  it('không truyền sleep/random: dùng setTimeout và Math.random thật', async () => {
    const fn = vi.fn().mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce('ok');

    await expect(
      withRetry(fn, { maxRetries: 1, shouldRetry, baseDelayMs: 1, maxDelayMs: 1 }),
    ).resolves.toEqual({ value: 'ok', attempts: 2 });
  });
});
