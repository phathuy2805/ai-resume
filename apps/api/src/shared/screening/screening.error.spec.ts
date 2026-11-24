import { ScreeningStepError } from '@hireflow/ai';
import { describe, expect, it } from 'vitest';
import { SCREENING_ERROR_MAX_LENGTH } from './screening.constant.js';
import { ScreeningPipelineError } from './screening.error.js';

/** Giống lỗi thật: AiError("...status 404", cause = ApiError(message = body JSON của Gemini)). */
function geminiError(status: number, body: unknown): Error {
  const apiError = new Error(JSON.stringify(body));
  return new Error(`Gemini request failed with status ${status}`, { cause: apiError });
}

describe('ScreeningPipelineError', () => {
  it('kèm lý do Gemini (status + message) khi lỗi phân tích JD', () => {
    const cause = geminiError(404, {
      error: {
        code: 404,
        message: 'This model models/gemini-2.5-flash-lite is no longer available to new users.',
        status: 'NOT_FOUND',
      },
    });

    expect(ScreeningPipelineError.wrap('JOB_ANALYSIS', cause).message).toBe(
      'JOB_ANALYSIS: Gemini request failed with status 404 (NOT_FOUND: This model models/gemini-2.5-flash-lite is no longer available to new users.)',
    );
  });

  it('giữ bước của screenCv và lấy lý do Gemini qua nhiều tầng cause', () => {
    const cause = geminiError(400, {
      error: {
        code: 400,
        message: 'API key not valid.\nPlease pass a valid API key.',
        status: 'INVALID_ARGUMENT',
      },
    });
    const error = ScreeningPipelineError.wrap('PARSE', new ScreeningStepError('EMBED', cause));

    expect(error.step).toBe('EMBED');
    expect(error.message).toBe(
      'EMBED: Gemini request failed with status 400 (INVALID_ARGUMENT: API key not valid. Please pass a valid API key.)',
    );
  });

  it('lỗi không phải của Gemini → giữ nguyên message', () => {
    expect(ScreeningPipelineError.wrap('SAVE', new Error('DB down')).message).toBe('SAVE: DB down');
    expect(ScreeningPipelineError.wrap('SAVE', new Error('{not json')).message).toBe(
      'SAVE: {not json',
    );
  });

  it('cắt message dài về tối đa SCREENING_ERROR_MAX_LENGTH ký tự', () => {
    const cause = geminiError(400, {
      error: { message: 'x'.repeat(2000), status: 'INVALID_ARGUMENT' },
    });

    const message = ScreeningPipelineError.wrap('JOB_ANALYSIS', cause).message;
    expect(message.length).toBe(SCREENING_ERROR_MAX_LENGTH);
    expect(message.endsWith('…')).toBe(true);
  });
});
