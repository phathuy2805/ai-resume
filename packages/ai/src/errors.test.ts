import { describe, expect, it } from 'vitest';
import {
  AiConfigError,
  AiError,
  AiInvalidResponseError,
  AiRateLimitError,
  AiTimeoutError,
  isAiError,
} from './errors.js';

describe('các lớp lỗi', () => {
  it('lớp con vẫn là AiError và Error, name đúng tên lớp', () => {
    const errors = [
      new AiConfigError('bad config'),
      new AiRateLimitError(),
      new AiTimeoutError(1000),
      new AiInvalidResponseError(['x: wrong']),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(AiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(error.constructor.name);
    }
  });

  it('mỗi lớp có code riêng để BE switch', () => {
    expect(new AiConfigError('x').code).toBe('AI_CONFIG_INVALID');
    expect(new AiRateLimitError().code).toBe('AI_RATE_LIMIT');
    expect(new AiTimeoutError(1).code).toBe('AI_TIMEOUT');
    expect(new AiInvalidResponseError([]).code).toBe('AI_INVALID_RESPONSE');
    expect(new AiError('AI_REQUEST_FAILED', 'x').code).toBe('AI_REQUEST_FAILED');
  });

  it('AiRateLimitError mặc định status 429; giữ attempts và cause', () => {
    const cause = new Error('sdk');
    const error = new AiRateLimitError({ attempts: 4, cause });

    expect(error).toMatchObject({ status: 429, attempts: 4 });
    expect(error.cause).toBe(cause);
  });

  it('attempts mặc định là 1, status mặc định không có', () => {
    expect(new AiError('AI_REQUEST_FAILED', 'x')).toMatchObject({ attempts: 1, status: undefined });
  });

  it('AiTimeoutError và AiInvalidResponseError giữ thông tin riêng', () => {
    expect(new AiTimeoutError(30_000)).toMatchObject({
      timeoutMs: 30_000,
      message: 'Gemini request timed out after 30000ms',
    });
    expect(new AiInvalidResponseError(['a: b']).issues).toEqual(['a: b']);
  });
});

describe('isAiError', () => {
  it('true với lỗi của package', () => {
    expect(isAiError(new AiTimeoutError(1))).toBe(true);
    expect(isAiError(new AiError('AI_REQUEST_FAILED', 'x'))).toBe(true);
  });

  it('false với lỗi khác', () => {
    expect(isAiError(new Error('x'))).toBe(false);
    expect(isAiError({ code: 'AI_TIMEOUT' })).toBe(false);
    expect(isAiError(undefined)).toBe(false);
  });
});
