import { EMBEDDING_DIMENSIONS } from '@hireflow/ai';
import { AiRecommendation } from '../constants/application-status.enum.js';
import { DEFAULT_AI_CONSIDER_MARGIN } from './ai.constant.js';

/** Kiểm tra vector có đúng 768 chiều và toàn bộ phần tử là số hữu hạn trước khi lưu pgvector. */
export function assertValidEmbeddingVector(vector: readonly number[]): void {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Vector embedding phải có đúng ${EMBEDDING_DIMENSIONS} chiều (nhận ${vector.length})`,
    );
  }
  if (!vector.every(Number.isFinite)) {
    throw new Error('Vector embedding chứa giá trị không hợp lệ (NaN hoặc Infinity)');
  }
}

/** Chuyển vector `number[]` thành chuỗi literal `[...]` để ép kiểu `::vector(768)` trong SQL. */
export function toPgVectorLiteral(vector: readonly number[]): string {
  assertValidEmbeddingVector(vector);
  return `[${vector.join(',')}]`;
}

/** Parse chuỗi `[0.1,0.2,...]` đọc từ cột `vector(768)` về `number[]`; trả `null` nếu không hợp lệ. */
export function parsePgVectorLiteral(raw: string | null | undefined): number[] | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null;
  }

  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return null;
  }

  const values = body.split(',').map((item) => Number(item));
  if (values.length !== EMBEDDING_DIMENSIONS || !values.every(Number.isFinite)) {
    return null;
  }

  return values;
}

/**
 * Xếp loại đề xuất AI dựa trên `cvPassThreshold` của job và khoảng đệm `considerMargin` (mặc định 10):
 * - `PASS`: `totalScore >= threshold`
 * - `CONSIDER`: `threshold - margin <= totalScore < threshold`
 * - `REJECT`: `totalScore < threshold - margin`
 */
export function computeAiRecommendation(
  totalScore: number,
  cvPassThreshold: number,
  considerMargin = DEFAULT_AI_CONSIDER_MARGIN,
): AiRecommendation {
  if (totalScore >= cvPassThreshold) {
    return AiRecommendation.PASS;
  }
  if (totalScore >= cvPassThreshold - considerMargin) {
    return AiRecommendation.CONSIDER;
  }
  return AiRecommendation.REJECT;
}
