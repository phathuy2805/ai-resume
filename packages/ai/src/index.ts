// Public API của @hireflow/ai. Chỉ export những gì BE cần để tạo client, gọi hàm và bắt lỗi.
// Các file khác (retry, gemini, structured, config) là chi tiết nội bộ, có thể đổi mà không ảnh hưởng BE.

// Tạo client
export { createAiClient } from './client.js';
export type {
  AiClient,
  CallOptions,
  GenerateTextOptions,
  GenerateStructuredOptions,
  EmbedOptions,
  InlineFile,
  StructuredPrompt,
} from './client.js';
export type { AiClientOptions, AiModels } from './config.js';
export type { AiLogger } from './logger.js';

// Lỗi
export {
  AiError,
  AiConfigError,
  AiRateLimitError,
  AiTimeoutError,
  AiInvalidResponseError,
  isAiError,
} from './errors.js';
export type { AiErrorCode } from './errors.js';

// Chuẩn hóa kỹ năng và cấp độ (dùng chung cho JD W1-AI-05 và CV W1-AI-04)
export { normalizeSkill, normalizeSkills } from './skills.js';
export { normalizeLevel } from './level.js';
export type { JobLevel } from './level.js';

// Phân tích JD
export { parseJd, ParsedJdSchema } from './jd.js';
export type { ParsedJd, ParseJdInput, ParseJdOptions } from './jd.js';

// Phân tích CV (W1-AI-04)
export { parseCv, ParsedCvSchema } from './cv.js';
export type { ParsedCv, ParseCvOptions } from './cv.js';
export { calculateTotalYearsExperience } from './experience.js';
export type { ExperiencePeriod, TotalYearsOptions } from './experience.js';

// Trích chữ từ CV PDF (W1-AI-03)
export {
  extractCvText,
  CvExtractionError,
  isCvExtractionError,
  CV_EXTRACTION_MESSAGES_VI,
} from './cv-text.js';
export type {
  CvExtractionResult,
  CvExtractionErrorCode,
  CvTextSource,
  ExtractCvTextOptions,
} from './cv-text.js';

// Embedding CV / JD và độ tương đồng (W2-AI-01)
export {
  embedText,
  embedCv,
  embedJd,
  buildCvEmbeddingText,
  buildJdEmbeddingText,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_TASK_TYPE,
} from './embedding.js';
export type { EmbedTextOptions } from './embedding.js';

// Chấm điểm CV 0–100 (W2-AI-02)
export { scoreCv, DEFAULT_SCORING_CONFIG } from './scoring.js';
export type {
  ScoreBreakdown,
  ScoreCvInput,
  ScoreCvOptions,
  ScoreCvResult,
  ScoringConfig,
  ScoringConfigInput,
  ScoringWeights,
} from './scoring.js';

// Sàng lọc CV trọn gói: parse → embed → chấm điểm → giải thích (W2-AI-03)
export { screenCv, ScreeningStepError } from './screening.js';
export type {
  ScreeningOutput,
  ScreeningTimings,
  ScreeningStep,
  ScreenCvInput,
  ScreenCvOptions,
} from './screening.js';
export type { Explanation, ExplanationStrength, ExplanationGap } from './explanation.js';

// Sinh bộ câu hỏi phỏng vấn (W3-AI-01)
export {
  generateQuestionPlan,
  QUESTION_TYPES,
  MIN_INTERVIEW_QUESTIONS,
  MAX_INTERVIEW_QUESTIONS,
} from './interview-questions.js';
export type {
  QuestionPlanItem,
  QuestionType,
  GenerateQuestionPlanInput,
  GenerateQuestionPlanOptions,
} from './interview-questions.js';

// Chuyển giọng nói thành chữ (W3-BE-02 Phần 1)
export {
  transcribe,
  SttError,
  isSttError,
  SUPPORTED_AUDIO_MIME_TYPES,
  MAX_AUDIO_BYTES,
} from './stt.js';
export type { SttErrorCode, SupportedAudioMimeType, TranscribeOptions } from './stt.js';
