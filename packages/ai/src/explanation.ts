import { z } from 'zod';
import type { AiClient, CallOptions } from './client.js';
import type { ParsedCv } from './cv.js';
import type { ParsedJd } from './jd.js';
import { consoleLogger, type AiLogger } from './logger.js';
import type { ScoreBreakdown } from './scoring.js';
import { normalizeSkill, skillKey } from './skills.js';
import { normalizeForMatch } from './text.js';

// Giải thích điểm CV cho HR (W2-AI-03), hiển thị ở trang chi tiết ứng viên (W2-FE-02).
// - Điểm mạnh do Gemini viết, mỗi ý kèm trích dẫn nguyên văn từ CV; trích dẫn được kiểm chứng bằng code.
// - Danh sách kỹ năng thiếu lấy từ breakdown (tính bằng code), Gemini chỉ viết nhận xét.

// ── Kết quả: BE lưu nguyên vào cột ScreeningResult.explanation ──────────

export interface ExplanationStrength {
  /** Một câu nhận xét điểm mạnh, tiếng Việt. */
  point: string;
  /** Trích dẫn nguyên văn từ CV; null nếu không kiểm chứng được (không tìm thấy trong CV). */
  quote: string | null;
}

export interface ExplanationGap {
  /** Tên kỹ năng bắt buộc còn thiếu (tên chuẩn theo JD, lấy từ breakdown.requiredSkills.missing). */
  skill: string;
  note: string;
}

export interface Explanation {
  /** 0–4 điểm mạnh (Gemini được yêu cầu 2–4), quan trọng nhất trước. */
  strengths: ExplanationStrength[];
  /** Đúng thứ tự breakdown.requiredSkills.missing; rỗng nếu không thiếu kỹ năng bắt buộc nào. */
  gaps: ExplanationGap[];
  /** 2–3 câu tóm tắt mức độ phù hợp. */
  summary: string;
}

export interface ExplainScoreInput {
  /** Text CV đã lưu lúc nộp (Application.cvText), dùng để Gemini trích dẫn và để kiểm chứng trích dẫn. */
  cvText: string;
  parsedCv: ParsedCv;
  parsedJd: ParsedJd;
  breakdown: ScoreBreakdown;
}

export interface ExplainScoreOptions extends CallOptions {
  /** Nơi ghi log số trích dẫn bị bỏ. Mặc định console. */
  logger?: AiLogger;
}

export const MAX_STRENGTHS = 4;
/** Prompt yêu cầu dưới 25 từ; code nới đến 30 rồi mới bỏ. */
export const MAX_QUOTE_WORDS = 30;

/** Nhận xét khi Gemini không viết note cho một kỹ năng thiếu. */
export function defaultGapNote(skill: string): string {
  return `CV chưa thể hiện kỹ năng ${skill}.`;
}

// ── Kiểm chứng trích dẫn ────────────────────────────────────────────────

/**
 * Ngoặc kép, dấu ba chấm, khoảng trắng ở hai đầu trích dẫn (Gemini hay tự thêm).
 * Đầu chuỗi chỉ bỏ "..." (từ 2 dấu chấm) để giữ ".NET"; cuối chuỗi bỏ cả dấu câu (. , ; :).
 */
const QUOTE_START = /^(?:[\s"'“”‘’«»„…]|\.{2,})+/u;
const QUOTE_END = /[\s"'“”‘’«»„….,;:]+$/u;

/**
 * Trả trích dẫn đã làm sạch nếu nó xuất hiện trong CV, ngược lại null.
 * `normalizedCvText` phải là kết quả của normalizeForMatch(cvText).
 * So khớp sau NFC + chữ thường + gộp khoảng trắng, nên khác chữ hoa / dấu cách / xuống dòng vẫn khớp,
 * nhưng sai dấu tiếng Việt thì không.
 */
export function verifyQuote(quote: string, normalizedCvText: string): string | null {
  const cleaned = quote.replace(QUOTE_START, '').replace(QUOTE_END, '');
  if (cleaned === '') return null;
  if (cleaned.split(/\s+/u).length > MAX_QUOTE_WORDS) return null;
  return normalizedCvText.includes(normalizeForMatch(cleaned)) ? cleaned : null;
}

export interface VerifiedStrengths {
  strengths: ExplanationStrength[];
  /** Số trích dẫn Gemini đưa ra (không tính trích dẫn rỗng). */
  checked: number;
  /** Số trích dẫn không tìm thấy trong CV, đã đổi thành null. */
  dropped: number;
}

/** Kiểm chứng trích dẫn của từng điểm mạnh; giữ `point`, trích dẫn không tìm thấy thì thành null. */
export function verifyStrengths(
  strengths: readonly { point: string; quote: string | null }[],
  cvText: string,
): VerifiedStrengths {
  const normalizedCv = normalizeForMatch(cvText);
  let checked = 0;
  let dropped = 0;
  const verified = strengths.map(({ point, quote }) => {
    if (!quote?.trim()) return { point, quote: null };
    checked += 1;
    const kept = verifyQuote(quote, normalizedCv);
    if (kept === null) dropped += 1;
    return { point, quote: kept };
  });
  return { strengths: verified, checked, dropped };
}

// ── Kỹ năng thiếu ───────────────────────────────────────────────────────

/**
 * Ghép nhận xét của Gemini vào danh sách kỹ năng thiếu do code tính.
 * Đi theo `missing` (thứ tự + tên theo JD); so khớp tên theo normalizeSkill + skillKey.
 * Kỹ năng Gemini tự thêm thì bỏ, kỹ năng Gemini bỏ sót thì dùng defaultGapNote.
 */
export function mergeGaps(
  missing: readonly string[],
  gapNotes: readonly { skill: string; note: string }[],
): ExplanationGap[] {
  const notes = new Map<string, string>();
  for (const { skill, note } of gapNotes) {
    const key = skillKey(normalizeSkill(skill));
    const text = note.trim();
    if (key && text && !notes.has(key)) notes.set(key, text);
  }
  return missing.map((skill) => ({
    skill,
    note: notes.get(skillKey(normalizeSkill(skill))) ?? defaultGapNote(skill),
  }));
}

// ── Phần Gemini ─────────────────────────────────────────────────────────

/** Trích dẫn đứng trước nhận xét để Gemini tìm bằng chứng trước rồi mới viết; tóm tắt để cuối. */
export const ExplanationResponseSchema = z.object({
  strengths: z
    .array(
      z.object({
        quote: z
          .string()
          .describe(
            'Short excerpt (under 25 words) copied character for character from the CV TEXT, or "" if none.',
          ),
        point: z
          .string()
          .describe('One short neutral sentence in Vietnamese explaining the strength.'),
      }),
    )
    .max(MAX_STRENGTHS)
    .describe('2 to 4 strengths that matter for this job, most important first.'),
  gapNotes: z
    .array(
      z.object({
        skill: z.string().describe('Skill name exactly as listed in MISSING REQUIRED SKILLS.'),
        note: z.string().describe('One short sentence in Vietnamese about this missing skill.'),
      }),
    )
    .default([])
    .describe('One item for each skill in MISSING REQUIRED SKILLS, and no other skills.'),
  summary: z
    .string()
    .min(1)
    .describe('2 to 3 sentences in Vietnamese on how well the candidate fits the job.'),
});
export type ExplanationResponse = z.infer<typeof ExplanationResponseSchema>;

export const EXPLANATION_SYSTEM_INSTRUCTION = `You are a recruiter explaining an automated CV screening result to an HR colleague.
You receive the job requirements, the score breakdown computed by the system, the list of missing required skills and the CV text.
Write in Vietnamese with correct diacritics, in a neutral and factual tone. Refer to the person as "ứng viên".
Rules:
- strengths: 2 to 4 strengths that matter for this job, most important first. For each one:
  - quote: a short excerpt (under 25 words) copied character for character from the CV TEXT. Keep the original language, spelling, letter case and diacritics. Do not translate, paraphrase, fix typos, join separate lines or add words or quotation marks. If there is no exact excerpt, use "".
  - point: one short sentence explaining why this matters for the job, supported by the quote.
- gapNotes: exactly one item for each skill in MISSING REQUIRED SKILLS, with the skill name written exactly as listed, and one short sentence on what the CV shows or lacks for that skill. Do not add other skills. If the list is empty, return an empty list.
- summary: 2 to 3 sentences on how well the candidate fits the job, consistent with the scores. If the score is capped, say that the candidate lacks more than half of the required skills.
- Use only what is written in the CV and in the scores. Do not guess.
- Never mention or hint at the candidate's name, age, date of birth, gender, marital status, hometown, address, nationality or photo, or whether a school or company is famous. Do not use them to judge.
- Do not mention weights or field names of the breakdown.`;

function list(items: readonly string[]): string {
  return items.length ? items.join(', ') : 'none';
}

/** Prompt giải thích: yêu cầu JD, chi tiết điểm, danh sách kỹ năng thiếu, text CV. */
export function buildExplanationPrompt(input: ExplainScoreInput): string {
  const { parsedJd, parsedCv, breakdown: b } = input;

  const job = [
    `Domain: ${parsedJd.domain}`,
    parsedJd.level ? `Level: ${parsedJd.level}` : '',
    `Required skills: ${list(parsedJd.requiredSkills)}`,
    `Preferred skills: ${list(parsedJd.preferredSkills)}`,
    parsedJd.responsibilities.length
      ? `Responsibilities:\n${parsedJd.responsibilities.map((item) => `- ${item}`).join('\n')}`
      : '',
  ];

  const years =
    b.experienceYears.requiredYears === null
      ? `candidate ${b.experienceYears.candidateYears} years, no minimum required`
      : `candidate ${b.experienceYears.candidateYears} years, required ${b.experienceYears.requiredYears} years`;
  const scores = [
    `- Required skills: ${b.requiredSkills.score}. Matched: ${list(b.requiredSkills.matched)}. Missing: ${list(b.requiredSkills.missing)}`,
    `- Preferred skills: ${b.preferredSkills.score}. Matched: ${list(b.preferredSkills.matched)}. Missing: ${list(b.preferredSkills.missing)}`,
    `- Years of experience: ${b.experienceYears.score} (${years})`,
    `- Relevance of experience and projects: ${b.relevance.score}. Reviewer comment: ${b.relevance.comment}`,
    `- Semantic similarity to the job: ${b.similarity.score}`,
    `- Capped because more than half of the required skills are missing: ${b.capped ? 'yes' : 'no'}`,
    `- Skills found in the CV: ${list(parsedCv.skills)}`,
  ];

  const missing = b.requiredSkills.missing.length
    ? b.requiredSkills.missing.map((skill) => `- ${skill}`).join('\n')
    : 'none';

  return [
    `JOB\n${job.filter(Boolean).join('\n')}`,
    `SCORES (each 0-100)\n${scores.join('\n')}`,
    `MISSING REQUIRED SKILLS\n${missing}`,
    `CV TEXT\n${input.cvText.trim()}`,
  ].join('\n\n');
}

/**
 * Giải thích điểm CV: 2–4 điểm mạnh kèm trích dẫn đã kiểm chứng, kỹ năng bắt buộc còn thiếu kèm nhận xét, tóm tắt.
 * Gọi Gemini 1 lần (temperature 0). Gemini lỗi thì ném lỗi, không trả giải thích mặc định.
 * Trích dẫn không tìm thấy trong CV bị đổi thành null và được ghi log (chỉ số lượng, không ghi nội dung).
 *
 * @example
 * const explanation = await explainScore(ai, { cvText, parsedCv, parsedJd, breakdown });
 * // BE lưu vào ScreeningResult.explanation
 */
export async function explainScore(
  ai: AiClient,
  input: ExplainScoreInput,
  options: ExplainScoreOptions = {},
): Promise<Explanation> {
  const { logger = consoleLogger, ...callOptions } = options;
  const response = await ai.generateStructured(
    buildExplanationPrompt(input),
    ExplanationResponseSchema,
    { ...callOptions, temperature: 0, systemInstruction: EXPLANATION_SYSTEM_INSTRUCTION },
  );

  const candidates = response.strengths
    .map((item) => ({ point: item.point.trim(), quote: item.quote }))
    .filter((item) => item.point !== '')
    .slice(0, MAX_STRENGTHS);
  const { strengths, checked, dropped } = verifyStrengths(candidates, input.cvText);
  if (dropped > 0) {
    logger.warn(`explainScore: dropped ${dropped}/${checked} quotes not found in CV`);
  }

  return {
    strengths,
    gaps: mergeGaps(input.breakdown.requiredSkills.missing, response.gapNotes),
    summary: response.summary.trim(),
  };
}
