import { describe, expect, it } from 'vitest';
import * as publicApi from './index.js';

describe('public API (src/index.ts)', () => {
  it('chỉ export đúng danh sách đã thống nhất', () => {
    // Thêm/bớt export là thay đổi với BE: phải cập nhật danh sách này một cách có chủ đích.
    expect(Object.keys(publicApi).sort()).toEqual([
      'AiConfigError',
      'AiError',
      'AiInvalidResponseError',
      'AiRateLimitError',
      'AiTimeoutError',
      'CV_EXTRACTION_MESSAGES_VI',
      'CvExtractionError',
      'DEFAULT_SCORING_CONFIG',
      'EMBEDDING_DIMENSIONS',
      'EMBEDDING_TASK_TYPE',
      'MAX_AUDIO_BYTES',
      'MAX_INTERVIEW_QUESTIONS',
      'MIN_INTERVIEW_QUESTIONS',
      'ParsedCvSchema',
      'ParsedJdSchema',
      'QUESTION_TYPES',
      'SUPPORTED_AUDIO_MIME_TYPES',
      'ScreeningStepError',
      'SttError',
      'buildCvEmbeddingText',
      'buildJdEmbeddingText',
      'calculateTotalYearsExperience',
      'cosineSimilarity',
      'createAiClient',
      'embedCv',
      'embedJd',
      'embedText',
      'extractCvText',
      'generateQuestionPlan',
      'isAiError',
      'isCvExtractionError',
      'isSttError',
      'normalizeLevel',
      'normalizeSkill',
      'normalizeSkills',
      'parseCv',
      'parseJd',
      'scoreCv',
      'screenCv',
      'transcribe',
    ]);
  });
});
