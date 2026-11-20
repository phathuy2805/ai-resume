import type { AiClient, CallOptions } from './client.js';
import type { ParsedCv } from './cv.js';
import { AiInvalidResponseError } from './errors.js';
import type { ParsedJd } from './jd.js';

/** Số chiều vector, khớp cột `vector(768)` của Job.embedding và Application.embedding. */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Dùng chung cho CV và JD để hai vector so sánh được với nhau.
 * SEMANTIC_SIMILARITY vì đây là so sánh hai văn bản ngang hàng (không phải truy vấn ↔ tài liệu).
 */
export const EMBEDDING_TASK_TYPE = 'SEMANTIC_SIMILARITY';

/** Giới hạn để văn bản embedding ngắn gọn, tập trung vào phần quan trọng nhất. */
const MAX_ITEMS = 5;
const MAX_DESCRIPTION_CHARS = 200;

export type EmbedTextOptions = CallOptions;

// ── Vector ──────────────────────────────────────────────────────────────

function norm(vector: readonly number[]): number {
  let sum = 0;
  for (const value of vector) sum += value * value;
  return Math.sqrt(sum);
}

/** Chia cho độ dài để vector có độ dài 1. Bắt buộc khi đã cắt xuống 768 chiều. */
function normalizeVector(vector: readonly number[]): number[] {
  if (!vector.every(Number.isFinite)) {
    throw new AiInvalidResponseError(['embedding contains non-finite values']);
  }
  const length = norm(vector);
  if (length === 0) throw new AiInvalidResponseError(['embedding is a zero vector']);
  return vector.map((value) => value / length);
}

/**
 * Độ tương đồng cosine của hai vector, kẹp trong khoảng 0–1 (giá trị âm coi là 0).
 * Vector toàn số 0 trả 0. Hai vector khác số chiều là lỗi lập trình nên ném RangeError.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new RangeError(
      `cosineSimilarity needs two vectors of the same non-zero length (got ${a.length} and ${b.length})`,
    );
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  const lengths = norm(a) * norm(b);
  if (lengths === 0) return 0;
  return Math.min(1, Math.max(0, dot / lengths));
}

/**
 * Embedding của một đoạn text: 768 chiều, đã chuẩn hóa về độ dài 1, taskType cố định.
 * Gemini trả sai số chiều thì ném AiInvalidResponseError.
 */
export async function embedText(
  ai: AiClient,
  text: string,
  options: EmbedTextOptions = {},
): Promise<number[]> {
  const input = text.trim();
  if (input === '') throw new RangeError('embedText needs a non-empty text');

  const values = await ai.embed(input, {
    ...options,
    taskType: EMBEDDING_TASK_TYPE,
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new AiInvalidResponseError([
      `expected ${EMBEDDING_DIMENSIONS} embedding dimensions, got ${values.length}`,
    ]);
  }
  return normalizeVector(values);
}

// ── Văn bản đầu vào ─────────────────────────────────────────────────────
// CV và JD dùng chung bộ nhãn (Lĩnh vực / Kỹ năng / Công việc / Dự án) để hai vector so sánh được.
// Không đưa số năm kinh nghiệm, cấp độ (đã có thành phần điểm riêng tính bằng code),
// không đưa tên công ty, trường học, chứng chỉ (tránh thông tin nhận diện, ít liên quan nội dung chuyên môn).

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function list(items: readonly (string | null | undefined)[]): string {
  return items
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(', ');
}

/** "<tên> (<công nghệ>): <mô tả>", bỏ phần trống. */
function describeItem(
  name: string,
  technologies: readonly string[],
  description: string | null,
): string {
  const tech = list(technologies);
  let text = name;
  if (tech) text = text ? `${text} (${tech})` : tech;
  if (description?.trim()) {
    const clipped = clip(description, MAX_DESCRIPTION_CHARS);
    text = text ? `${text}: ${clipped}` : clipped;
  }
  return text;
}

function joinLines(lines: readonly [label: string, value: string][]): string {
  return lines
    .filter(([, value]) => value.trim() !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

/** Văn bản ngắn có cấu trúc đại diện cho CV: tóm tắt, kỹ năng, vị trí + công nghệ đã làm, dự án. */
export function buildCvEmbeddingText(parsedCv: ParsedCv): string {
  const jobs = parsedCv.experiences
    .slice(0, MAX_ITEMS)
    .map((job) => describeItem(job.title ?? '', job.technologies, job.description))
    .filter(Boolean);
  const projects = parsedCv.projects
    .slice(0, MAX_ITEMS)
    .map((project) =>
      describeItem(
        [project.name, project.role].filter(Boolean).join(' – '),
        project.technologies,
        project.description,
      ),
    )
    .filter(Boolean);

  return joinLines([
    ['Lĩnh vực', clip(parsedCv.summary ?? '', MAX_DESCRIPTION_CHARS * 2)],
    ['Kỹ năng', list(parsedCv.skills)],
    ['Công việc', jobs.join('; ')],
    ['Dự án', projects.join('; ')],
  ]);
}

/** Văn bản ngắn có cấu trúc đại diện cho JD: lĩnh vực, kỹ năng bắt buộc, ưu tiên, trách nhiệm chính. */
export function buildJdEmbeddingText(parsedJd: ParsedJd): string {
  return joinLines([
    ['Lĩnh vực', parsedJd.domain],
    ['Kỹ năng', list(parsedJd.requiredSkills)],
    ['Kỹ năng ưu tiên', list(parsedJd.preferredSkills)],
    [
      'Công việc',
      parsedJd.responsibilities.map((item) => clip(item, MAX_DESCRIPTION_CHARS)).join('; '),
    ],
  ]);
}

/**
 * Vector của CV (BE lưu vào Application.embedding).
 *
 * @example
 * const vector = await embedCv(ai, parsedCv);
 * await prisma.$executeRaw`UPDATE applications SET embedding = ${JSON.stringify(vector)}::vector WHERE id = ${id}`;
 */
export function embedCv(
  ai: AiClient,
  parsedCv: ParsedCv,
  options: EmbedTextOptions = {},
): Promise<number[]> {
  return embedText(ai, buildCvEmbeddingText(parsedCv), options);
}

/** Vector của JD (BE lưu vào Job.embedding). */
export function embedJd(
  ai: AiClient,
  parsedJd: ParsedJd,
  options: EmbedTextOptions = {},
): Promise<number[]> {
  return embedText(ai, buildJdEmbeddingText(parsedJd), options);
}
