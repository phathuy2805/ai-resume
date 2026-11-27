import { z } from 'zod';
import type { AiClient, CallOptions } from './client.js';
import type { ParsedCv } from './cv.js';
import { AiInvalidResponseError } from './errors.js';
import type { ParsedJd } from './jd.js';
import { consoleLogger, type AiLogger } from './logger.js';
import { mentionsSkill, normalizeSkill, normalizeSkills, skillKey } from './skills.js';
import { normalizeForMatch } from './text.js';

// Sinh bộ câu hỏi phỏng vấn (W3-AI-01). BE gọi 1 lần khi ứng viên bắt đầu phiên (W3-BE-01),
// lưu mỗi câu thành một InterviewTurn (question, questionType, targetSkill).
// - Gemini viết câu hỏi; số câu, thứ tự và tên kỹ năng được chỉnh lại bằng code để ít phải gọi lại.
// - Chỉ gửi phần JD / CV cần cho việc đặt câu hỏi (không gửi học vấn, chứng chỉ, ngôn ngữ) để tiết kiệm token.

// ── Kết quả: BE lưu vào InterviewTurn ───────────────────────────────────

export const QUESTION_TYPES = ['TECHNICAL', 'SITUATIONAL', 'EXPERIENCE'] as const;
/** TECHNICAL: chuyên môn; SITUATIONAL: tình huống; EXPERIENCE: kinh nghiệm thực tế trong CV. */
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface QuestionPlanItem {
  /** Số thứ tự câu hỏi, liên tục từ 1. */
  order: number;
  /** Câu hỏi tiếng Việt, đọc thành tiếng được. */
  question: string;
  type: QuestionType;
  /** Kỹ năng / năng lực câu hỏi muốn kiểm tra; trùng tên chuẩn của JD nếu khớp. */
  targetSkill: string;
}

export interface GenerateQuestionPlanInput {
  parsedJd: ParsedJd;
  parsedCv: ParsedCv;
  /** Kỹ năng bắt buộc còn thiếu ở vòng CV (ScreeningResult.breakdown.requiredSkills.missing). */
  missingSkills: readonly string[];
  /** Số câu hỏi (Job.interviewQuestionCount), từ 3 đến 5. */
  count: number;
  /** Tên vị trí (Job.title); parsedJd không có trường này. */
  jobTitle?: string | null;
}

export interface GenerateQuestionPlanOptions extends CallOptions {
  /** Nơi ghi log cảnh báo (câu quá dài, phải gọi lại...). Mặc định console. */
  logger?: AiLogger;
}

export const MIN_INTERVIEW_QUESTIONS = 3;
export const MAX_INTERVIEW_QUESTIONS = 5;
/** Prompt yêu cầu dưới 30 từ; câu dài hơn chỉ ghi log, không bỏ (để giữ đủ số câu). */
export const MAX_QUESTION_WORDS = 30;
/** Thấp vừa phải: câu hỏi tự nhiên nhưng ổn định giữa các lần sinh. */
export const QUESTION_PLAN_TEMPERATURE = 0.4;
/** Lần đầu + 1 lần gọi lại khi thiếu câu hoặc không có câu về kỹ năng còn thiếu. */
export const QUESTION_PLAN_MAX_ATTEMPTS = 2;

const MAX_PROMPT_SKILLS = 40;
const MAX_PROMPT_ITEMS = 6;
const MAX_PROMPT_DESCRIPTION_CHARS = 300;

/** Số câu gợi ý theo loại: khoảng một nửa TECHNICAL, phần còn lại chia đều (EXPERIENCE nhận phần lẻ). */
export function questionTypeMix(count: number): Record<QuestionType, number> {
  const technical = Math.round(count / 2);
  const rest = count - technical;
  return {
    TECHNICAL: technical,
    SITUATIONAL: Math.floor(rest / 2),
    EXPERIENCE: Math.ceil(rest / 2),
  };
}

// ── Phần Gemini ─────────────────────────────────────────────────────────

/** targetSkill và type đứng trước để Gemini chọn kỹ năng trước rồi mới viết câu hỏi. */
export const QuestionPlanResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        targetSkill: z
          .string()
          .describe('Skill or competency assessed. Exact name from the job if it matches.'),
        type: z.enum(QUESTION_TYPES),
        question: z.string().describe('One question in Vietnamese, under 30 words.'),
      }),
    )
    .describe('Questions in the order they will be asked.'),
});
export type QuestionPlanResponse = z.infer<typeof QuestionPlanResponseSchema>;

export const QUESTION_PLAN_SYSTEM_INSTRUCTION = `You are an experienced interviewer preparing a short first-round voice interview for one candidate.
You receive the job requirements, the candidate's skills, work experience and projects, and the required skills that the candidate's CV does not show.
Rules:
- Return exactly the requested number of questions, in the order they will be asked. Follow the suggested mix of types.
- type: TECHNICAL = knowledge or skill needed for this job; SITUATIONAL = how the candidate would handle a realistic situation in this role; EXPERIENCE = what the candidate actually did in a specific job or project listed in the CV.
- If MISSING REQUIRED SKILLS is not "none", at least one question must assess one of those skills, with targetSkill written exactly as listed. Ask it fairly (understanding, or how they would approach it) without saying the CV lacks it.
- At least one EXPERIENCE question must name a specific job or project from the CV.
- Each question: Vietnamese with correct diacritics, under 30 words, one single question with one idea, addressing the candidate as "bạn". It will be read aloud: no lists, code, markdown, brackets or special symbols.
- Do not ask two questions about the same idea.
- targetSkill: the skill or competency the question assesses, never a job title, company or project name. Use the exact name from the job skills or MISSING REQUIRED SKILLS when it matches; otherwise a short name, e.g. "Giải quyết vấn đề".
- Never ask about age, gender, marital status, family, children, hometown, nationality, religion, health or appearance.
- Do not mention scores, the CV screening or any assessment.`;

function list(items: readonly string[]): string {
  return items.length ? items.join(', ') : 'none';
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function describeItem(
  name: string,
  technologies: readonly string[],
  description: string | null,
): string {
  const tech = technologies.length ? ` [${technologies.join(', ')}]` : '';
  const text = description?.trim() ? `: ${clip(description, MAX_PROMPT_DESCRIPTION_CHARS)}` : '';
  return `- ${name}${tech}${text}`;
}

/**
 * Prompt sinh câu hỏi: số câu + tỷ lệ loại câu, yêu cầu JD, kỹ năng còn thiếu, kỹ năng / công việc / dự án của CV.
 * `reminder` (khi gọi lại) nhắc Gemini lỗi của lần trước.
 */
export function buildQuestionPlanPrompt(input: GenerateQuestionPlanInput, reminder = ''): string {
  const { parsedJd, parsedCv, count } = input;
  const mix = questionTypeMix(count);

  const job = [
    input.jobTitle?.trim() ? `Title: ${input.jobTitle.trim()}` : '',
    `Domain: ${parsedJd.domain}`,
    parsedJd.level ? `Level: ${parsedJd.level}` : '',
    `Required skills: ${list(parsedJd.requiredSkills)}`,
    `Preferred skills: ${list(parsedJd.preferredSkills)}`,
    parsedJd.responsibilities.length
      ? `Responsibilities:\n${parsedJd.responsibilities.map((item) => `- ${item}`).join('\n')}`
      : '',
  ];

  const jobs = parsedCv.experiences
    .slice(0, MAX_PROMPT_ITEMS)
    .map((item) =>
      describeItem(
        [item.title ?? 'Untitled role', item.company].filter(Boolean).join(' at '),
        item.technologies,
        item.description,
      ),
    );
  const projects = parsedCv.projects
    .slice(0, MAX_PROMPT_ITEMS)
    .map((item) =>
      describeItem(
        [item.name, item.role].filter(Boolean).join(' – ') || 'Untitled project',
        item.technologies,
        item.description,
      ),
    );
  const candidate = [
    `Skills: ${list(parsedCv.skills.slice(0, MAX_PROMPT_SKILLS))}`,
    `Years of experience: ${parsedCv.totalYearsExperience}`,
    jobs.length ? `Work experience:\n${jobs.join('\n')}` : 'Work experience: none',
    projects.length ? `Projects:\n${projects.join('\n')}` : 'Projects: none',
  ];

  const missing = normalizeSkills(input.missingSkills);
  const sections = [
    `QUESTIONS\nNumber of questions: ${count}\nSuggested mix: ${mix.TECHNICAL} TECHNICAL, ${mix.SITUATIONAL} SITUATIONAL, ${mix.EXPERIENCE} EXPERIENCE`,
    `JOB\n${job.filter(Boolean).join('\n')}`,
    `MISSING REQUIRED SKILLS\n${missing.length ? missing.map((skill) => `- ${skill}`).join('\n') : 'none'}`,
    `CANDIDATE\n${candidate.join('\n')}`,
  ];
  if (reminder) sections.push(`NOTE\n${reminder}`);
  return sections.join('\n\n');
}

// ── Chỉnh kết quả bằng code ─────────────────────────────────────────────

export interface SelectedQuestions {
  /** Tối đa `count` câu, order đánh lại 1..n. */
  plan: QuestionPlanItem[];
  /** Số câu dùng được (không rỗng, không trùng) Gemini trả về, trước khi cắt. */
  usable: number;
  /** Có câu nào trong `plan` kiểm tra kỹ năng còn thiếu không (luôn true nếu không thiếu kỹ năng nào). */
  coversMissingSkill: boolean;
}

/**
 * Bỏ câu rỗng / trùng, chuẩn hóa targetSkill, cắt về `count` câu (giữ câu về kỹ năng còn thiếu), đánh lại order.
 * Không gọi Gemini.
 */
export function selectQuestions(
  questions: QuestionPlanResponse['questions'],
  input: GenerateQuestionPlanInput,
): SelectedQuestions {
  const missing = normalizeSkills(input.missingSkills);
  const missingKeys = new Set(missing.map(skillKey));

  // Tên chuẩn để đưa targetSkill về: ưu tiên kỹ năng còn thiếu, rồi kỹ năng của JD.
  const canonical = new Map<string, string>();
  for (const skill of [
    ...missing,
    ...normalizeSkills(input.parsedJd.requiredSkills),
    ...normalizeSkills(input.parsedJd.preferredSkills),
  ]) {
    const key = skillKey(skill);
    if (!canonical.has(key)) canonical.set(key, skill);
  }

  const seen = new Set<string>();
  const cleaned: Omit<QuestionPlanItem, 'order'>[] = [];
  for (const item of questions) {
    const question = item.question.replace(/\s+/g, ' ').trim();
    const dedupeKey = normalizeForMatch(question);
    if (question === '' || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const skill = normalizeSkill(item.targetSkill);
    const targetSkill = canonical.get(skillKey(skill)) ?? (skill || input.parsedJd.domain);
    cleaned.push({ question, type: item.type, targetSkill });
  }

  const targetsMissing = (item: Omit<QuestionPlanItem, 'order'>) =>
    missingKeys.has(skillKey(item.targetSkill)) ||
    missing.some((skill) => mentionsSkill(item.question, skill));

  const chosen = cleaned.slice(0, input.count);
  let coversMissingSkill = missing.length === 0 || chosen.some(targetsMissing);
  if (!coversMissingSkill && chosen.length === input.count) {
    // Câu về kỹ năng còn thiếu nằm ở phần bị cắt: thay câu cuối bằng câu đó.
    const extra = cleaned.slice(input.count).find(targetsMissing);
    if (extra) {
      chosen[chosen.length - 1] = extra;
      coversMissingSkill = true;
    }
  }

  return {
    plan: chosen.map((item, index) => ({ order: index + 1, ...item })),
    usable: cleaned.length,
    coversMissingSkill,
  };
}

function countWords(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length;
}

function warnLongQuestions(plan: readonly QuestionPlanItem[], logger: AiLogger): void {
  const long = plan.filter((item) => countWords(item.question) > MAX_QUESTION_WORDS).length;
  if (long > 0) {
    logger.warn(
      `generateQuestionPlan: ${long}/${plan.length} questions over ${MAX_QUESTION_WORDS} words`,
    );
  }
}

// ── Hàm chính ───────────────────────────────────────────────────────────

/**
 * Sinh trước toàn bộ câu hỏi cho một phiên phỏng vấn: đúng `count` câu (3–5), order 1..count.
 * Thường gọi Gemini 1 lần. Gọi lại tối đa 1 lần nếu thiếu câu, hoặc nếu có kỹ năng còn thiếu
 * mà không câu nào hỏi về nó (lần 2 vẫn không có thì vẫn dùng, chỉ ghi log).
 *
 * @throws RangeError nếu `count` ngoài 3–5 (không gọi Gemini).
 * @throws AiInvalidResponseError nếu sau 2 lần vẫn không đủ `count` câu.
 * @throws các lỗi AiError khác của client (429, timeout...).
 *
 * @example
 * const plan = await generateQuestionPlan(ai, {
 *   parsedJd: job.parsedJd,
 *   parsedCv: application.parsedCv,
 *   missingSkills: screening.breakdown.requiredSkills.missing,
 *   count: job.interviewQuestionCount,
 *   jobTitle: job.title,
 * });
 * // Mỗi phần tử → một InterviewTurn { order, question, questionType: type, targetSkill }
 */
export async function generateQuestionPlan(
  ai: AiClient,
  input: GenerateQuestionPlanInput,
  options: GenerateQuestionPlanOptions = {},
): Promise<QuestionPlanItem[]> {
  const { count } = input;
  if (
    !Number.isInteger(count) ||
    count < MIN_INTERVIEW_QUESTIONS ||
    count > MAX_INTERVIEW_QUESTIONS
  ) {
    throw new RangeError(
      `count must be an integer from ${MIN_INTERVIEW_QUESTIONS} to ${MAX_INTERVIEW_QUESTIONS} (got ${count})`,
    );
  }

  const { logger = consoleLogger, ...callOptions } = options;
  let reminder = '';
  let withoutMissingSkill: QuestionPlanItem[] | null = null;
  let usable = 0;

  for (let attempt = 1; attempt <= QUESTION_PLAN_MAX_ATTEMPTS; attempt++) {
    const response = await ai.generateStructured(
      buildQuestionPlanPrompt(input, reminder),
      QuestionPlanResponseSchema,
      {
        ...callOptions,
        temperature: QUESTION_PLAN_TEMPERATURE,
        systemInstruction: QUESTION_PLAN_SYSTEM_INSTRUCTION,
      },
    );
    const selected = selectQuestions(response.questions, input);
    usable = selected.usable;

    if (selected.plan.length < count) {
      logger.warn(
        `generateQuestionPlan: attempt=${attempt} got ${selected.usable}/${count} usable questions`,
      );
      reminder = `The previous answer had only ${selected.usable} usable questions. Return exactly ${count} different questions.`;
      continue;
    }
    if (!selected.coversMissingSkill) {
      logger.warn(
        `generateQuestionPlan: attempt=${attempt} no question on a missing required skill`,
      );
      withoutMissingSkill = selected.plan;
      reminder =
        'The previous answer had no question assessing a skill in MISSING REQUIRED SKILLS. Include at least one.';
      continue;
    }

    warnLongQuestions(selected.plan, logger);
    return selected.plan;
  }

  if (withoutMissingSkill) {
    logger.warn('generateQuestionPlan: using questions without a missing required skill question');
    warnLongQuestions(withoutMissingSkill, logger);
    return withoutMissingSkill;
  }
  throw new AiInvalidResponseError(
    [`questions: expected ${count} usable questions, got ${usable}`],
    {
      attempts: QUESTION_PLAN_MAX_ATTEMPTS,
    },
  );
}
