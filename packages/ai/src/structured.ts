import { z } from 'zod';
import { AiConfigError } from './errors.js';

/** Số lần gọi Gemini tối đa khi kết quả sai schema (lần đầu + 1 lần gọi lại). */
export const STRUCTURED_MAX_ATTEMPTS = 2;

/** Giới hạn số lỗi giữ lại, tránh mảng issues quá dài khi Gemini trả sai hoàn toàn. */
const MAX_ISSUES = 10;

export type StructuredParseResult<T> =
  { success: true; data: T } | { success: false; issues: string[] };

/**
 * Đổi Zod schema sang JSON Schema để gửi cho Gemini (config.responseJsonSchema).
 * Dùng io: 'input' vì JSON Gemini trả về là ĐẦU VÀO của schema.safeParse():
 * ví dụ trường có .default() thì Gemini được phép bỏ trống.
 */
export function toGeminiJsonSchema(schema: z.ZodType): unknown {
  try {
    return z.toJSONSchema(schema, { io: 'input' });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AiConfigError(`Schema cannot be converted to JSON Schema: ${reason}`);
  }
}

/**
 * Đọc text Gemini trả về: JSON.parse rồi kiểm tra bằng Zod.
 * `issues` chỉ gồm đường dẫn + mô tả lỗi, KHÔNG chứa giá trị Gemini trả về.
 */
export function parseStructuredResponse<T extends z.ZodType>(
  text: string | undefined,
  schema: T,
): StructuredParseResult<z.output<T>> {
  if (!text) return { success: false, issues: ['response is empty'] };

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, issues: ['response is not valid JSON'] };
  }

  const result = schema.safeParse(json);
  if (result.success) return { success: true, data: result.data };

  return {
    success: false,
    issues: result.error.issues
      .slice(0, MAX_ISSUES)
      .map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`),
  };
}
