import { z } from 'zod';
import type { AiClient, CallOptions } from './client.js';
import type { ParsedCv } from './cv.js';
import { cosineSimilarity } from './embedding.js';
import { AiConfigError } from './errors.js';
import type { ParsedJd } from './jd.js';
import { normalizeSkills, skillKey } from './skills.js';

// Chấm điểm CV 0–100 (W2-AI-02).
// Phần tính được bằng code (kỹ năng, số năm, độ tương đồng) không giao cho Gemini để điểm ít dao động;
// Gemini chỉ chấm mức độ liên quan của kinh nghiệm và dự án.
// Việc so điểm với ngưỡng của job (PASS / CONSIDER / REJECT) do BE làm (W2-BE-02).

// ── Config ──────────────────────────────────────────────────────────────

/** Trọng số (%) của từng thành phần, tổng phải bằng 100. */
export interface ScoringWeights {
  requiredSkills: number;
  preferredSkills: number;
  experienceYears: number;
  relevance: number;
  similarity: number;
}

export interface ScoringConfig {
  weights: ScoringWeights;
  /** Điểm tổng tối đa khi thiếu quá một nửa kỹ năng bắt buộc. */
  capScore: number;
  /**
   * Mốc quy đổi cosine CV–JD về 0–100: cosine ≤ min → 0, ≥ max → 100, ở giữa tuyến tính.
   * Cosine của gemini-embedding-001 dồn vào khoảng 0,72–0,92 nên không dùng thẳng cosine × 100
   * (số liệu ở README, mục "Kết quả chạy thử (W2-AI-01)").
   */
  similarity: { min: number; max: number };
}

/** Ghi đè một phần config; phần không truyền lấy theo mặc định. */
export interface ScoringConfigInput {
  weights?: Partial<ScoringWeights>;
  capScore?: number;
  similarity?: Partial<ScoringConfig['similarity']>;
}

export const DEFAULT_SCORING_CONFIG: Readonly<ScoringConfig> = Object.freeze({
  weights: Object.freeze({
    requiredSkills: 35,
    preferredSkills: 10,
    experienceYears: 15,
    relevance: 25,
    similarity: 15,
  }),
  capScore: 49,
  similarity: Object.freeze({ min: 0.75, max: 0.92 }),
});

const WEIGHT_KEYS = [
  'requiredSkills',
  'preferredSkills',
  'experienceYears',
  'relevance',
  'similarity',
] as const satisfies readonly (keyof ScoringWeights)[];

/** Gộp config truyền vào với mặc định và kiểm tra. Sai thì ném AiConfigError. */
export function resolveScoringConfig(input: ScoringConfigInput = {}): ScoringConfig {
  const config: ScoringConfig = {
    weights: { ...DEFAULT_SCORING_CONFIG.weights, ...input.weights },
    capScore: input.capScore ?? DEFAULT_SCORING_CONFIG.capScore,
    similarity: { ...DEFAULT_SCORING_CONFIG.similarity, ...input.similarity },
  };

  for (const key of WEIGHT_KEYS) {
    const weight = config.weights[key];
    if (!Number.isFinite(weight) || weight < 0) {
      throw new AiConfigError(`Scoring weight "${key}" must be a number ≥ 0 (got ${weight})`);
    }
  }
  const sum = WEIGHT_KEYS.reduce((total, key) => total + config.weights[key], 0);
  if (Math.abs(sum - 100) > 1e-9) {
    throw new AiConfigError(`Scoring weights must add up to 100 (got ${sum})`);
  }
  if (!Number.isInteger(config.capScore) || config.capScore < 0 || config.capScore > 100) {
    throw new AiConfigError(`capScore must be an integer from 0 to 100 (got ${config.capScore})`);
  }
  const { min, max } = config.similarity;
  if (!(min >= 0 && max <= 1 && min < max)) {
    throw new AiConfigError(`similarity needs 0 ≤ min < max ≤ 1 (got min=${min}, max=${max})`);
  }
  return config;
}

// ── Kết quả ─────────────────────────────────────────────────────────────

/**
 * Chi tiết điểm, BE lưu nguyên vào cột ScreeningResult.breakdown, FE (W2-FE-02) vẽ 5 thanh điểm.
 * Mọi `score` là số nguyên 0–100; `weight` là trọng số (%) đã dùng để tính.
 */
export interface ScoreBreakdown {
  requiredSkills: { score: number; weight: number; matched: string[]; missing: string[] };
  preferredSkills: { score: number; weight: number; matched: string[]; missing: string[] };
  /** requiredYears null khi JD không yêu cầu số năm. */
  experienceYears: {
    score: number;
    weight: number;
    candidateYears: number;
    requiredYears: number | null;
  };
  /** score = điểm Gemini 0–10 × 10; comment là nhận xét ngắn tiếng Việt. */
  relevance: { score: number; weight: number; comment: string };
  /** cosine CV–JD (0–1, làm tròn 3 chữ số). */
  similarity: { score: number; weight: number; cosine: number };
  /** true nếu điểm tổng bị chặn tối đa capScore do thiếu quá nửa kỹ năng bắt buộc. */
  capped: boolean;
}

export interface ScoreCvInput {
  parsedCv: ParsedCv;
  parsedJd: ParsedJd;
  cvEmbedding: readonly number[];
  jdEmbedding: readonly number[];
}

export interface ScoreCvResult {
  /** Điểm tổng, số nguyên 0–100. */
  total: number;
  breakdown: ScoreBreakdown;
}

export interface ScoreCvOptions extends CallOptions {
  config?: ScoringConfigInput;
}

// ── Phần tính bằng code ─────────────────────────────────────────────────
// Các hàm dưới trả `score` chưa làm tròn; combineScore làm tròn khi ghi vào breakdown.

export interface SkillMatch {
  score: number;
  matched: string[];
  missing: string[];
}

/**
 * Tỷ lệ kỹ năng của JD có trong CV (so sau normalizeSkill, theo skillKey).
 * matched / missing giữ thứ tự và tên chuẩn theo JD. JD không có kỹ năng nào → 100.
 */
export function scoreSkills(jdSkills: readonly string[], cvSkills: readonly string[]): SkillMatch {
  const wanted = normalizeSkills(jdSkills);
  const have = new Set(normalizeSkills(cvSkills).map(skillKey));
  const matched = wanted.filter((skill) => have.has(skillKey(skill)));
  const missing = wanted.filter((skill) => !have.has(skillKey(skill)));
  const score = wanted.length === 0 ? 100 : (matched.length / wanted.length) * 100;
  return { score, matched, missing };
}

/** Mọi kỹ năng của CV: mục kỹ năng + công nghệ ghi ở từng công việc và dự án. */
export function collectCvSkills(parsedCv: ParsedCv): string[] {
  return [
    ...parsedCv.skills,
    ...parsedCv.experiences.flatMap((job) => job.technologies),
    ...parsedCv.projects.flatMap((project) => project.technologies),
  ];
}

export interface ExperienceYearsMatch {
  score: number;
  candidateYears: number;
  requiredYears: number | null;
}

/** Số năm của ứng viên so với yêu cầu: đủ hoặc vượt → 100, thiếu → theo tỷ lệ. JD không yêu cầu → 100. */
export function scoreExperienceYears(
  candidateYears: number,
  requiredYears: number | null,
): ExperienceYearsMatch {
  const years = Math.max(0, candidateYears);
  const score =
    requiredYears === null || requiredYears <= 0 ? 100 : Math.min(1, years / requiredYears) * 100;
  return { score, candidateYears: years, requiredYears };
}

export interface SimilarityMatch {
  score: number;
  cosine: number;
}

/** Quy cosine về 0–100 theo mốc min / max của config, kẹp trong 0–100. */
export function scoreSimilarity(
  cosine: number,
  range: ScoringConfig['similarity'],
): SimilarityMatch {
  const ratio = (cosine - range.min) / (range.max - range.min);
  return { score: clamp(ratio * 100, 0, 100), cosine };
}

export interface RelevanceRating {
  /** 0–100 (= điểm Gemini 0–10 × 10). */
  score: number;
  comment: string;
}

export interface ScoreParts {
  requiredSkills: SkillMatch;
  preferredSkills: SkillMatch;
  experienceYears: ExperienceYearsMatch;
  relevance: RelevanceRating;
  similarity: SimilarityMatch;
}

/**
 * Gộp các thành phần thành điểm tổng.
 * - Tổng = Σ(score × weight) / 100 trên giá trị chưa làm tròn, rồi làm tròn số nguyên.
 * - Thiếu QUÁ một nửa kỹ năng bắt buộc (đúng một nửa thì không) → tổng tối đa capScore.
 */
export function combineScore(parts: ScoreParts, config: ScoringConfig): ScoreCvResult {
  const { weights } = config;
  const weighted = WEIGHT_KEYS.reduce((total, key) => total + parts[key].score * weights[key], 0);
  const required = parts.requiredSkills;
  const requiredCount = required.matched.length + required.missing.length;
  const capped = requiredCount > 0 && required.missing.length > requiredCount / 2;

  let total = Math.round(clamp(weighted / 100, 0, 100));
  if (capped) total = Math.min(total, config.capScore);

  const breakdown: ScoreBreakdown = {
    requiredSkills: {
      score: roundScore(required.score),
      weight: weights.requiredSkills,
      matched: required.matched,
      missing: required.missing,
    },
    preferredSkills: {
      score: roundScore(parts.preferredSkills.score),
      weight: weights.preferredSkills,
      matched: parts.preferredSkills.matched,
      missing: parts.preferredSkills.missing,
    },
    experienceYears: {
      score: roundScore(parts.experienceYears.score),
      weight: weights.experienceYears,
      candidateYears: parts.experienceYears.candidateYears,
      requiredYears: parts.experienceYears.requiredYears,
    },
    relevance: {
      score: roundScore(parts.relevance.score),
      weight: weights.relevance,
      comment: parts.relevance.comment,
    },
    similarity: {
      score: roundScore(parts.similarity.score),
      weight: weights.similarity,
      cosine: Math.round(parts.similarity.cosine * 1000) / 1000,
    },
    capped,
  };
  return { total, breakdown };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

// ── Phần Gemini: mức độ liên quan của kinh nghiệm và dự án ─────────────

/** `comment` đứng trước `score` để Gemini nhận xét xong mới cho điểm (điểm ổn định hơn). */
export const RelevanceSchema = z.object({
  comment: z
    .string()
    .min(1)
    .describe(
      'One or two neutral sentences in Vietnamese explaining the score, based only on the work experience and projects.',
    ),
  score: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe('Relevance score from 0 to 10, following the rubric.'),
});
export type RelevanceResponse = z.infer<typeof RelevanceSchema>;

export const RELEVANCE_SYSTEM_INSTRUCTION = `You are a recruiter. Rate how relevant a candidate's work experience and projects are to a job, on a scale from 0 to 10.
Rubric:
- 0-2: different field; the experience and projects have nothing to do with the job's responsibilities.
- 3-4: related field, but a different role; only a few tasks overlap with the job.
- 5-6: similar role, but little work that matches the job's main responsibilities, or only small, simple or study projects.
- 7-8: same role; real work or projects that match most of the job's main responsibilities.
- 9-10: same role; work that matches the main responsibilities at a similar or larger scale or complexity, and fits the job level.
Rules:
- Judge only the content of the work experience and projects against the job's domain, level and responsibilities.
- Do not score skill lists or years of experience; they are scored separately. Use skills only to understand what the work involved.
- Use only what is written. Do not guess or give credit for things that are not described.
- Ignore personal details, company names and schools.
- comment: one or two neutral sentences in Vietnamese with correct diacritics, explaining the score. Refer to the person as "ứng viên" (e.g. start with "Ứng viên có..."). Do not mention names, age, gender or hometown.`;

/** Giới hạn để prompt gọn. */
const MAX_PROMPT_ITEMS = 8;
const MAX_PROMPT_DESCRIPTION_CHARS = 400;

/** Nhận xét khi CV không có công việc hay dự án nào (không gọi Gemini). */
export const NO_EXPERIENCE_COMMENT =
  'CV không nêu kinh nghiệm làm việc hay dự án nào để đánh giá mức độ liên quan.';

/**
 * Prompt chấm mức độ liên quan. Chỉ dùng parsedCv (không có thông tin cá nhân) và parsedJd.
 * Không đưa tên công ty, số năm kinh nghiệm (đã có điểm riêng).
 */
export function buildRelevancePrompt(parsedCv: ParsedCv, parsedJd: ParsedJd): string {
  const job = [
    `Domain: ${parsedJd.domain}`,
    parsedJd.level ? `Level: ${parsedJd.level}` : '',
    parsedJd.requiredSkills.length ? `Required skills: ${parsedJd.requiredSkills.join(', ')}` : '',
    parsedJd.responsibilities.length
      ? `Responsibilities:\n${parsedJd.responsibilities.map((item) => `- ${item}`).join('\n')}`
      : '',
  ];

  const jobs = parsedCv.experiences.slice(0, MAX_PROMPT_ITEMS).map((item) => {
    const period = item.startDate ? ` (${item.startDate} – ${item.endDate ?? 'present'})` : '';
    return describePromptItem(
      `${item.title ?? 'Untitled role'}${period}`,
      item.technologies,
      item.description,
    );
  });
  const projects = parsedCv.projects
    .slice(0, MAX_PROMPT_ITEMS)
    .map((item) =>
      describePromptItem(
        [item.name, item.role].filter(Boolean).join(' – ') || 'Untitled project',
        item.technologies,
        item.description,
      ),
    );
  const candidate = [
    parsedCv.summary ? `Summary: ${clip(parsedCv.summary, MAX_PROMPT_DESCRIPTION_CHARS)}` : '',
    jobs.length ? `Work experience:\n${jobs.join('\n')}` : 'Work experience: none',
    projects.length ? `Projects:\n${projects.join('\n')}` : 'Projects: none',
  ];

  return [
    `JOB\n${job.filter(Boolean).join('\n')}`,
    `CANDIDATE\n${candidate.filter(Boolean).join('\n')}`,
  ].join('\n\n');
}

function describePromptItem(
  name: string,
  technologies: readonly string[],
  description: string | null,
): string {
  const tech = technologies.length ? ` [${technologies.join(', ')}]` : '';
  const text = description?.trim() ? `: ${clip(description, MAX_PROMPT_DESCRIPTION_CHARS)}` : '';
  return `- ${name}${tech}${text}`;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Gemini chấm mức độ liên quan 0–10 (temperature 0), quy về 0–100.
 * CV không có công việc lẫn dự án → 0, không gọi Gemini. Gemini lỗi thì ném lỗi, không cho điểm mặc định.
 */
export async function rateRelevance(
  ai: AiClient,
  parsedCv: ParsedCv,
  parsedJd: ParsedJd,
  options: CallOptions = {},
): Promise<RelevanceRating> {
  if (parsedCv.experiences.length === 0 && parsedCv.projects.length === 0) {
    return { score: 0, comment: NO_EXPERIENCE_COMMENT };
  }
  const response = await ai.generateStructured(
    buildRelevancePrompt(parsedCv, parsedJd),
    RelevanceSchema,
    { ...options, temperature: 0, systemInstruction: RELEVANCE_SYSTEM_INSTRUCTION },
  );
  return { score: response.score * 10, comment: response.comment.trim() };
}

// ── Hàm chính ───────────────────────────────────────────────────────────

/**
 * Chấm điểm CV 0–100 so với JD.
 * Kỹ năng, số năm, độ tương đồng embedding tính bằng code; mức độ liên quan do Gemini chấm (1 lần gọi).
 *
 * @example
 * const { total, breakdown } = await scoreCv(ai, { parsedCv, parsedJd, cvEmbedding, jdEmbedding });
 * // BE lưu total vào ScreeningResult.totalScore, breakdown vào ScreeningResult.breakdown
 */
export async function scoreCv(
  ai: AiClient,
  input: ScoreCvInput,
  options: ScoreCvOptions = {},
): Promise<ScoreCvResult> {
  const { config: configInput, ...callOptions } = options;
  const config = resolveScoringConfig(configInput);
  const { parsedCv, parsedJd } = input;

  // Tính trước phần không gọi AI: embedding sai số chiều thì ném lỗi trước khi tốn lượt gọi Gemini.
  const similarity = scoreSimilarity(
    cosineSimilarity(input.cvEmbedding, input.jdEmbedding),
    config.similarity,
  );
  const cvSkills = collectCvSkills(parsedCv);
  const requiredSkills = scoreSkills(parsedJd.requiredSkills, cvSkills);
  const preferredSkills = scoreSkills(parsedJd.preferredSkills, cvSkills);
  const experienceYears = scoreExperienceYears(
    parsedCv.totalYearsExperience,
    parsedJd.minYearsExperience,
  );

  const relevance = await rateRelevance(ai, parsedCv, parsedJd, callOptions);

  return combineScore(
    { requiredSkills, preferredSkills, experienceYears, relevance, similarity },
    config,
  );
}
