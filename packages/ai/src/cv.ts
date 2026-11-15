import { z } from 'zod';
import type { AiClient, CallOptions } from './client.js';
import { CvExtractionError } from './cv-text.js';
import {
  calculateTotalYearsExperience,
  YEAR_MONTH_PATTERN,
  type ExperiencePeriod,
  type TotalYearsOptions,
} from './experience.js';
import { normalizeSkills } from './skills.js';
import { fold } from './text.js';

export const PARSED_CV_SCHEMA_VERSION = 1;

const MIN_YEAR = 1950;
const MAX_YEAR = 2100;

// ── Kết quả cuối: BE lưu vào cột Application.parsedCv ──────────────────

const OptionalText = z.string().min(1).nullable().default(null);
const YearMonth = z.string().regex(YEAR_MONTH_PATTERN).nullable().default(null);
const TextList = z.array(z.string().min(1)).default([]);

export const CvExperienceSchema = z.object({
  company: OptionalText,
  title: OptionalText,
  /** "YYYY-MM" */
  startDate: YearMonth,
  /** "YYYY-MM"; null nếu đang làm hoặc không rõ. */
  endDate: YearMonth,
  description: OptionalText,
  technologies: TextList,
});

export const CvEducationSchema = z.object({
  school: OptionalText,
  major: OptionalText,
  degree: OptionalText,
  graduationYear: z.number().int().min(MIN_YEAR).max(MAX_YEAR).nullable().default(null),
});

export const CvProjectSchema = z.object({
  name: OptionalText,
  role: OptionalText,
  technologies: TextList,
  description: OptionalText,
});

/**
 * Kết quả phân tích CV. Không chứa thông tin cá nhân (họ tên, email, SĐT, địa chỉ...).
 * Mảng mặc định [], trường đơn có thể null. schemaVersion tăng khi đổi cấu trúc.
 */
export const ParsedCvSchema = z.object({
  schemaVersion: z.literal(PARSED_CV_SCHEMA_VERSION),
  summary: OptionalText,
  /** Đã chuẩn hóa bằng normalizeSkill, gồm cả công nghệ trong experiences và projects. */
  skills: TextList,
  experiences: z.array(CvExperienceSchema).default([]),
  education: z.array(CvEducationSchema).default([]),
  projects: z.array(CvProjectSchema).default([]),
  certifications: TextList,
  languages: TextList,
  /** Tính bằng code từ experiences (không do AI đoán), làm tròn 1 chữ số thập phân. */
  totalYearsExperience: z.number().min(0),
});
export type ParsedCv = z.infer<typeof ParsedCvSchema>;

// ── Phần Gemini trả về (chưa chuẩn hóa). Mô tả từng trường được gửi kèm cho Gemini. ──
// Cố ý dễ dãi (ngày là chuỗi tự do, trường nào cũng có mặc định) để ít bị lỗi schema;
// việc kiểm tra chặt làm ở mergeParsedCv.

const nullableText = (description: string) =>
  z.string().nullable().default(null).describe(description);
const textList = (description: string) => z.array(z.string()).default([]).describe(description);

export const CvExtractionSchema = z.object({
  summary: nullableText(
    'One or two sentences describing the candidate profile, in the CV language, without the name.',
  ),
  skills: textList(
    'Every skill, tool, technology or professional competency named anywhere in the CV. Short English names.',
  ),
  experiences: z
    .array(
      z.object({
        company: nullableText('Company or organization name.'),
        title: nullableText('Job title.'),
        startDate: nullableText('Start month as "YYYY-MM", or "YYYY" if only the year is written.'),
        endDate: nullableText(
          'End month as "YYYY-MM", or "YYYY" if only the year is written. Null if this is the current job.',
        ),
        description: nullableText('Short summary of the work, in the CV language.'),
        technologies: textList('Tools and technologies used in this job.'),
      }),
    )
    .default([])
    .describe('Work experience, one item per job, most recent first.'),
  education: z
    .array(
      z.object({
        school: nullableText('School or university name.'),
        major: nullableText('Major or field of study.'),
        degree: nullableText('Degree, e.g. "Bachelor", "Cử nhân", "Kỹ sư".'),
        graduationYear: z
          .number()
          .int()
          .nullable()
          .default(null)
          .describe('Graduation year (the end year if a range is written), or null.'),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: nullableText('Project name.'),
        role: nullableText('Role of the candidate in the project.'),
        technologies: textList('Tools and technologies used in the project.'),
        description: nullableText('Short summary of the project, in the CV language.'),
      }),
    )
    .default([])
    .describe('Projects listed separately from jobs.'),
  certifications: textList('Certificate names, with score if written (e.g. "IELTS 7.0").'),
  languages: textList('Spoken languages, with level if written.'),
});
export type CvExtraction = z.output<typeof CvExtractionSchema>;

export interface ParseCvOptions extends CallOptions, TotalYearsOptions {}

export const CV_SYSTEM_INSTRUCTION = `You extract structured information from a candidate's CV (résumé) written in Vietnamese or English.
The text was extracted from a PDF.
Rules:
- Only use information explicitly written in the CV. Never guess, infer or invent. If something is not in the CV, use null or an empty list.
- Never output personal data: full name, email, phone number, address, date of birth, age, gender, marital status, photo, or links to personal profiles (GitHub, LinkedIn, Facebook, personal websites). Do not put them in any field, including summary and descriptions.
- The CV may use a two-column layout, so lines from different sections can be interleaved or out of order. Use section headings and the dates written next to each job title to match every date range to the correct job. Do not merge unrelated lines.
- summary: 1-2 sentences about the candidate's profile in the CV language. Refer to the person as "the candidate" or "ứng viên", never by name.
- skills: include skills from the skills section and every skill, technology or method named in job bullet points and projects (e.g. "Integrated REST APIs" gives "REST API"; "phân tích dữ liệu bán hàng" gives "Data Analysis"). Use short, common English names, one skill per item, without proficiency words (e.g. "NodeJS", "PostgreSQL", "Google Ads", "Data Analysis").
- technologies (in experiences and projects): the same kind of names, limited to what is written for that job or project.
- experiences: dates as "YYYY-MM" (e.g. "03/2024" becomes "2024-03"); if only the year is written, use "YYYY". endDate is null when the job is current ("Present", "Now", "Hiện tại", "nay").
- education: graduationYear is the end year when a range such as "2017 - 2021" is written.
- Free-text fields (summary, description) are short and keep the CV language.`;

/** Ghép text CV thành prompt. */
export function buildCvPrompt(cvText: string): string {
  return `CV text:\n\n${cvText.trim()}`;
}

// ── Chuẩn hóa ngày ─────────────────────────────────────────────────────

const PRESENT_WORDS = new Set([
  'present',
  'current',
  'currently',
  'now',
  'today',
  'ongoing',
  'hien tai',
  'hien nay',
  'nay',
  'den nay',
  'den hien tai',
]);

const MONTH_NAMES: Readonly<Record<string, number>> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

type ParsedDate = { kind: 'month'; value: string } | { kind: 'present' } | { kind: 'invalid' };

function yearMonth(year: number, month: number): ParsedDate {
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) return { kind: 'invalid' };
  return { kind: 'month', value: `${year}-${String(month).padStart(2, '0')}` };
}

/**
 * Đọc ngày Gemini trả về thành "YYYY-MM".
 * Nhận: "2024-03", "2024/3", "03/2024", "T3/2024", "Tháng 3/2024", "Mar 2024", "March 2024", "2024".
 * Chỉ có năm: ngày bắt đầu lấy tháng 01, ngày kết thúc lấy tháng 12.
 * Ngày kết thúc null hoặc "Present"/"Hiện tại" là đang làm.
 */
export function parseCvDate(raw: string | null, edge: 'start' | 'end'): ParsedDate {
  const text = fold(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') return edge === 'end' ? { kind: 'present' } : { kind: 'invalid' };
  if (PRESENT_WORDS.has(text)) return edge === 'end' ? { kind: 'present' } : { kind: 'invalid' };

  let match = /^(\d{4}) ?[-/.] ?(\d{1,2})$/.exec(text);
  if (match) return yearMonth(Number(match[1]), Number(match[2]));

  match = /^(?:thang ?|t ?)?(\d{1,2}) ?[-/.] ?(\d{4})$/.exec(text);
  if (match) return yearMonth(Number(match[2]), Number(match[1]));

  match = /^([a-z]{3,9})\.? ,?(\d{4})$/.exec(text);
  if (match) {
    const month = MONTH_NAMES[match[1]!] ?? MONTH_NAMES[match[1]!.slice(0, 3)];
    return month ? yearMonth(Number(match[2]), month) : { kind: 'invalid' };
  }

  match = /^(\d{4})$/.exec(text);
  if (match) return yearMonth(Number(match[1]), edge === 'start' ? 1 : 12);

  return { kind: 'invalid' };
}

// ── Gộp, chuẩn hóa ─────────────────────────────────────────────────────

/** Gọn khoảng trắng; chuỗi rỗng thành null. */
function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.normalize('NFC').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned : null;
}

/** Gọn khoảng trắng, bỏ rỗng, bỏ trùng (không phân biệt hoa thường); giữ thứ tự. */
function cleanList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanText(value);
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    result.push(cleaned);
  }
  return result;
}

function toYear(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR
    ? value
    : null;
}

/**
 * Chuẩn hóa kết quả Gemini thành ParsedCv (W1-AI-04):
 * - Ngày về "YYYY-MM"; không đọc được thì null.
 * - Kỹ năng và công nghệ chạy normalizeSkills (bảng alias dùng chung với JD), bỏ trùng.
 *   `skills` gộp thêm công nghệ của experiences và projects để tuần 2 so khớp đủ.
 * - Bỏ mục rỗng (công việc, học vấn, dự án không có thông tin gì).
 * - totalYearsExperience tính bằng code từ experiences, gộp khoảng trùng nhau.
 *   Công việc có ngày kết thúc không đọc được thì không tính vào tổng (tránh tính nhầm là đang làm).
 */
export function mergeParsedCv(extracted: CvExtraction, options: TotalYearsOptions = {}): ParsedCv {
  const periods: ExperiencePeriod[] = [];
  const experiences = extracted.experiences.flatMap((item) => {
    const start = parseCvDate(item.startDate, 'start');
    const end = parseCvDate(item.endDate, 'end');
    const experience = {
      company: cleanText(item.company),
      title: cleanText(item.title),
      startDate: start.kind === 'month' ? start.value : null,
      endDate: end.kind === 'month' ? end.value : null,
      description: cleanText(item.description),
      technologies: normalizeSkills(item.technologies),
    };
    if (!experience.company && !experience.title && !experience.description) return [];

    if (start.kind === 'month' && end.kind !== 'invalid') {
      periods.push({ startDate: start.value, endDate: experience.endDate });
    }
    return [experience];
  });

  const education = extracted.education
    .map((item) => ({
      school: cleanText(item.school),
      major: cleanText(item.major),
      degree: cleanText(item.degree),
      graduationYear: toYear(item.graduationYear),
    }))
    .filter((item) => item.school || item.major || item.degree);

  const projects = extracted.projects
    .map((item) => ({
      name: cleanText(item.name),
      role: cleanText(item.role),
      technologies: normalizeSkills(item.technologies),
      description: cleanText(item.description),
    }))
    .filter((item) => item.name || item.description);

  const skills = normalizeSkills([
    ...extracted.skills,
    ...experiences.flatMap((item) => item.technologies),
    ...projects.flatMap((item) => item.technologies),
  ]);

  return ParsedCvSchema.parse({
    schemaVersion: PARSED_CV_SCHEMA_VERSION,
    summary: cleanText(extracted.summary),
    skills,
    experiences,
    education,
    projects,
    certifications: cleanList(extracted.certifications),
    languages: cleanList(extracted.languages),
    totalYearsExperience: calculateTotalYearsExperience(periods, options),
  });
}

/**
 * Phân tích text CV (kết quả của extractCvText) thành ParsedCv.
 * Gọi Gemini qua generateStructured (temperature 0), rồi chuẩn hóa bằng mergeParsedCv.
 * Thời gian và token được client ghi log; nội dung CV không bị ghi log.
 *
 * @throws CvExtractionError('EMPTY') nếu text rỗng (không gọi Gemini).
 * @throws AiError khi gọi Gemini lỗi (rate limit, timeout, sai schema...).
 *
 * @example
 * const parsedCv = await parseCv(ai, application.cvText);
 * await prisma.application.update({ where: { id }, data: { parsedCv } });
 */
export async function parseCv(
  ai: AiClient,
  cvText: string,
  options: ParseCvOptions = {},
): Promise<ParsedCv> {
  const { referenceDate, ...callOptions } = options;
  const text = cvText.trim();
  if (text === '') throw new CvExtractionError('EMPTY', { charCount: 0 });

  const extracted = await ai.generateStructured(buildCvPrompt(text), CvExtractionSchema, {
    ...callOptions,
    temperature: 0,
    systemInstruction: CV_SYSTEM_INSTRUCTION,
  });
  return mergeParsedCv(extracted, { referenceDate });
}
