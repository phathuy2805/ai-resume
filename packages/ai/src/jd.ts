import { z } from 'zod';
import type { AiClient, CallOptions } from './client.js';
import { JOB_LEVELS, normalizeLevel } from './level.js';
import { mentionsSkill, normalizeSkills, skillKey } from './skills.js';

export const PARSED_JD_SCHEMA_VERSION = 1;

const MAX_RESPONSIBILITIES = 8;
const JobLevelSchema = z.enum(JOB_LEVELS);

/**
 * Kết quả phân tích JD, BE lưu vào cột Job.parsedJd.
 * schemaVersion tăng khi đổi cấu trúc, để BE nhận ra dữ liệu cũ.
 */
export const ParsedJdSchema = z.object({
  schemaVersion: z.literal(PARSED_JD_SCHEMA_VERSION),
  requiredSkills: z.array(z.string().min(1)),
  preferredSkills: z.array(z.string().min(1)),
  minYearsExperience: z.number().int().min(0).nullable(),
  level: JobLevelSchema.nullable(),
  educationRequirement: z.string().min(1).nullable(),
  responsibilities: z.array(z.string().min(1)).max(MAX_RESPONSIBILITIES),
  domain: z.string().min(1),
});
export type ParsedJd = z.infer<typeof ParsedJdSchema>;

/** Phần Gemini trả về (chưa gộp với dữ liệu HR). Mô tả của từng trường được gửi kèm cho Gemini. */
export const JdExtractionSchema = z.object({
  requiredSkills: z
    .array(z.string())
    .describe(
      'Must-have skills explicitly mentioned in the job posting. Short names, one per item.',
    ),
  preferredSkills: z
    .array(z.string())
    .describe('Nice-to-have skills explicitly mentioned (preferred, plus, ưu tiên, là lợi thế).'),
  minYearsExperience: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe('Minimum years of experience stated in the posting, or null if not stated.'),
  level: JobLevelSchema.nullable().describe(
    'Seniority stated or clearly implied by the title. If a range is given, choose the lowest. Null if unknown.',
  ),
  educationRequirement: z
    .string()
    .nullable()
    .describe('Education requirement as a short phrase in the posting language, or null.'),
  responsibilities: z
    .array(z.string())
    .max(MAX_RESPONSIBILITIES)
    .describe(
      `Up to ${MAX_RESPONSIBILITIES} key responsibilities, short, in the posting language.`,
    ),
  domain: z
    .string()
    .describe('Field of the position as a short English name, e.g. "Backend Engineering".'),
});
export type JdExtraction = z.infer<typeof JdExtractionSchema>;

/** Các trường của form tạo job. requirements và level là tùy chọn (form hiện chưa có). */
export interface ParseJdInput {
  title: string;
  description: string;
  requirements?: string | null;
  requiredSkills?: readonly string[];
  preferredSkills?: readonly string[];
  minYearsExperience?: number | null;
  /** Chữ tự do, vd. "Middle / Senior"; được quy về intern/junior/middle/senior. */
  level?: string | null;
}

export type ParseJdOptions = CallOptions;

export const JD_SYSTEM_INSTRUCTION = `You extract structured hiring requirements from a job posting written in Vietnamese or English.
Rules:
- Only list skills that are explicitly mentioned in the title, description or requirements. Never infer or invent skills.
- requiredSkills are must-haves; preferredSkills are nice-to-haves (preferred, plus, "ưu tiên", "là lợi thế", "điểm cộng").
- Include both tools/technologies (e.g. "NodeJS", "PostgreSQL", "Google Ads") and professional competencies or methods named in the posting (e.g. "RESTful API", "Data Analysis", "Statistics", "Content Marketing").
- Use short, common English skill names, one skill per item, without proficiency words.
- minYearsExperience: the minimum number of years if stated, otherwise null.
- level: one of intern, junior, middle, senior if stated or clearly implied by the title; for a range choose the lowest; otherwise null.
- educationRequirement: a short phrase in the posting language, or null if not stated.
- responsibilities: at most ${MAX_RESPONSIBILITIES} key responsibilities, short, in the posting language.
- domain: the field of the position as a short English name.`;

/** Ghép các trường của form thành prompt. */
export function buildJdPrompt(input: ParseJdInput): string {
  const parts = [`Job title: ${input.title.trim()}`, `Description:\n${input.description.trim()}`];
  if (input.requirements?.trim()) parts.push(`Requirements:\n${input.requirements.trim()}`);
  return parts.join('\n\n');
}

/**
 * Gộp dữ liệu HR nhập với kết quả AI. Quy tắc (W1-AI-05):
 * - Kỹ năng HR nhập luôn được giữ, đứng đầu, giữ đúng nhóm (bắt buộc / ưu tiên) HR đã chọn.
 * - AI chỉ BỔ SUNG kỹ năng thật sự được nhắc trong tiêu đề / mô tả / yêu cầu.
 * - Một kỹ năng chỉ nằm ở một nhóm; nếu ở cả hai thì giữ ở nhóm bắt buộc.
 * - Số năm kinh nghiệm và cấp độ HR đã nhập thì dùng của HR, AI không ghi đè.
 */
export function mergeParsedJd(input: ParseJdInput, extracted: JdExtraction): ParsedJd {
  const sourceText = [input.title, input.description, input.requirements ?? ''].join('\n');
  const foundInText = (skills: readonly string[]) =>
    skills.filter((skill) => mentionsSkill(sourceText, skill));
  const keysOf = (skills: readonly string[]) => new Set(skills.map(skillKey));

  const hrRequired = normalizeSkills(input.requiredSkills ?? []);
  const hrPreferred = normalizeSkills(input.preferredSkills ?? []);
  const hrPreferredKeys = keysOf(hrPreferred);

  const requiredSkills = normalizeSkills([
    ...hrRequired,
    ...normalizeSkills(foundInText(extracted.requiredSkills)).filter(
      (skill) => !hrPreferredKeys.has(skillKey(skill)),
    ),
  ]);
  const requiredKeys = keysOf(requiredSkills);
  const preferredSkills = normalizeSkills([
    ...hrPreferred,
    ...foundInText(extracted.preferredSkills),
  ]).filter((skill) => !requiredKeys.has(skillKey(skill)));

  const responsibilities = [
    ...new Set(extracted.responsibilities.map((item) => item.trim()).filter(Boolean)),
  ].slice(0, MAX_RESPONSIBILITIES);

  return ParsedJdSchema.parse({
    schemaVersion: PARSED_JD_SCHEMA_VERSION,
    requiredSkills,
    preferredSkills,
    minYearsExperience: input.minYearsExperience ?? extracted.minYearsExperience ?? null,
    level: normalizeLevel(input.level) ?? extracted.level ?? null,
    educationRequirement: extracted.educationRequirement?.trim() || null,
    responsibilities,
    domain: extracted.domain.trim() || input.title.trim(),
  });
}

/**
 * Phân tích JD từ các trường của form tạo job.
 * Gọi Gemini qua generateStructured (temperature 0), rồi gộp với dữ liệu HR theo mergeParsedJd.
 *
 * @example
 * const parsed = await parseJd(ai, { title, description, requiredSkills, minYearsExperience });
 * await prisma.job.update({ where: { id }, data: { parsedJd: parsed } });
 */
export async function parseJd(
  ai: AiClient,
  input: ParseJdInput,
  options: ParseJdOptions = {},
): Promise<ParsedJd> {
  const extracted = await ai.generateStructured(buildJdPrompt(input), JdExtractionSchema, {
    ...options,
    temperature: 0,
    systemInstruction: JD_SYSTEM_INSTRUCTION,
  });
  return mergeParsedJd(input, extracted);
}
