import { ScreeningStepError } from '@hireflow/ai';
import { SCREENING_ERROR_MAX_LENGTH } from './screening.constant.js';

/**
 * Các bước của pipeline phía BE. PARSE / EMBED / SCORE / EXPLAIN lấy từ `ScreeningStepError.step`
 * của `screenCv` (@hireflow/ai), các bước còn lại do BE tự đặt.
 */
export type ScreeningPipelineStep =
  'LOAD' | 'TRANSITION' | 'JOB_ANALYSIS' | 'PARSE' | 'EMBED' | 'SCORE' | 'EXPLAIN' | 'SAVE';

/**
 * Lỗi ở một bước của pipeline. `message` dạng `"<STEP>: <lý do>"`, đã cắt gọn,
 * dùng thẳng cho `Application.screeningError` và cột `reason` của lịch sử trạng thái.
 * Lý do lấy từ message của lỗi gốc, không bao giờ chứa nội dung CV.
 */
export class ScreeningPipelineError extends Error {
  readonly step: ScreeningPipelineStep;

  constructor(step: ScreeningPipelineStep, cause: unknown) {
    super(truncate(`${step}: ${describeCause(cause)}`), { cause });
    this.name = 'ScreeningPipelineError';
    this.step = step;
  }

  /** Bọc lỗi của một bước; lỗi của `screenCv` giữ đúng bước hỏng (PARSE / EMBED / SCORE / EXPLAIN). */
  static wrap(step: ScreeningPipelineStep, error: unknown): ScreeningPipelineError {
    if (error instanceof ScreeningPipelineError) {
      return error;
    }
    if (error instanceof ScreeningStepError) {
      return new ScreeningPipelineError(error.step, error.cause);
    }
    return new ScreeningPipelineError(step, error);
  }
}

/** Số tầng `cause` tối đa đi xuống để tìm lỗi gốc của Gemini (AiError → ApiError). */
const MAX_CAUSE_DEPTH = 5;

/**
 * Lý do lỗi: message của lỗi, kèm lý do Gemini trả về nếu có trong chuỗi `cause`.
 * VD: "Gemini request failed with status 404 (NOT_FOUND: This model ... is no longer available ...)".
 */
function describeCause(cause: unknown): string {
  const base = cause instanceof Error ? cause.message || cause.name : String(cause);
  const detail = findGeminiDetail(cause);
  if (!detail || base.includes(detail)) {
    return base;
  }
  return `${base} (${detail})`;
}

/**
 * `ApiError` của @google/genai giữ nguyên body lỗi dạng JSON trong `message`:
 * `{"error":{"code":404,"message":"...","status":"NOT_FOUND"}}`. Lấy `status` + `message` để dễ đọc.
 * Lỗi của Gemini chỉ mô tả request (key, model, quota), không chứa nội dung CV.
 */
function findGeminiDetail(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    const detail = parseGeminiErrorBody(current.message);
    if (detail) {
      return detail;
    }
    current = current.cause;
  }
  return null;
}

function parseGeminiErrorBody(message: string): string | null {
  if (!message.trimStart().startsWith('{')) {
    return null;
  }
  try {
    const body = JSON.parse(message) as { error?: { message?: unknown; status?: unknown } };
    const reason = body.error?.message;
    if (typeof reason !== 'string' || !reason.trim()) {
      return null;
    }
    const status = typeof body.error?.status === 'string' ? `${body.error.status}: ` : '';
    return `${status}${reason.replace(/\s+/g, ' ').trim()}`;
  } catch {
    return null;
  }
}

function truncate(message: string): string {
  return message.length > SCREENING_ERROR_MAX_LENGTH
    ? `${message.slice(0, SCREENING_ERROR_MAX_LENGTH - 1)}…`
    : message;
}
