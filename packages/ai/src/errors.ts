/** Mã lỗi ổn định để BE `switch` và chuyển thành HTTP status phù hợp. */
export type AiErrorCode =
  | 'AI_CONFIG_INVALID'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_RESPONSE'
  | 'AI_REQUEST_FAILED';

export interface AiErrorOptions {
  /** HTTP status từ Gemini, nếu có. */
  status?: number;
  /** Tổng số lần đã gọi (lần đầu + số lần retry). */
  attempts?: number;
  /** Lỗi gốc (từ SDK) để debug; không đưa ra ngoài API. */
  cause?: unknown;
}

/** Lớp gốc cho mọi lỗi của @hireflow/ai. */
export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status?: number;
  readonly attempts: number;

  constructor(code: AiErrorCode, message: string, options: AiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = options.status;
    this.attempts = options.attempts ?? 1;
  }
}

/** Cấu hình truyền vào createAiClient không hợp lệ. */
export class AiConfigError extends AiError {
  constructor(message: string) {
    super('AI_CONFIG_INVALID', message);
  }
}

/** Gemini trả 429 và đã hết lượt retry. */
export class AiRateLimitError extends AiError {
  constructor(options: AiErrorOptions = {}) {
    super('AI_RATE_LIMIT', 'Gemini rate limit exceeded', {
      ...options,
      status: options.status ?? 429,
    });
  }
}

/** Request vượt quá thời gian cho phép và đã hết lượt retry. */
export class AiTimeoutError extends AiError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options: AiErrorOptions = {}) {
    super('AI_TIMEOUT', `Gemini request timed out after ${timeoutMs}ms`, options);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Gemini trả về dữ liệu sai schema (kể cả sau khi đã gọi lại).
 * `issues` chỉ chứa đường dẫn + mô tả lỗi, KHÔNG chứa nội dung trả về
 * (có thể là dữ liệu CV của ứng viên).
 */
export class AiInvalidResponseError extends AiError {
  readonly issues: string[];

  constructor(issues: string[], options: AiErrorOptions = {}) {
    super('AI_INVALID_RESPONSE', 'Gemini response does not match the expected schema', options);
    this.issues = issues;
  }
}

/** Kiểm tra một lỗi bất kỳ có phải lỗi của @hireflow/ai không. */
export function isAiError(error: unknown): error is AiError {
  return error instanceof AiError;
}
