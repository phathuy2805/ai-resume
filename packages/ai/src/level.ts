import { toWords } from './text.js';

/** 4 cấp độ chuẩn, xếp từ thấp đến cao. */
export const JOB_LEVELS = ['intern', 'junior', 'middle', 'senior'] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

/** Các cách viết của từng cấp độ (đã bỏ dấu, chữ thường), tiếng Việt và tiếng Anh. */
const LEVEL_PATTERNS: Record<JobLevel, RegExp> = {
  intern: /\b(intern|internship|trainee|thuc tap|thuc tap sinh)\b/,
  junior: /\b(junior|jr|fresher|entry|entry level|moi tot nghiep)\b/,
  middle: /\b(middle|mid|mid level|intermediate|trung cap)\b/,
  senior: /\b(senior|sr|lead|leader|principal|staff|truong nhom|chuyen gia)\b/,
};

/**
 * Đọc cấp độ từ chữ tự do (HR nhập hoặc trong JD).
 * Có nhiều cấp thì lấy cấp THẤP NHẤT, vì đó là yêu cầu tối thiểu để ứng tuyển.
 * Không nhận ra thì trả về undefined.
 *
 * @example normalizeLevel('Middle / Senior') // 'middle'
 * @example normalizeLevel('Thực tập sinh') // 'intern'
 */
export function normalizeLevel(text: string | null | undefined): JobLevel | undefined {
  if (!text) return undefined;
  const words = toWords(text);
  return JOB_LEVELS.find((level) => LEVEL_PATTERNS[level].test(words));
}
