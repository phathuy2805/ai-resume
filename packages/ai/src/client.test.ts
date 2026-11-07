import {
  ApiError,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { buildAiClient, createAiClient, type GeminiModelsApi } from './client.js';
import { resolveConfig } from './config.js';
import { AiConfigError, AiError, AiRateLimitError, AiTimeoutError } from './errors.js';
import type { AiLogger } from './logger.js';

const API_KEY = 'test-secret-key';
const PROMPT = 'Nội dung CV bí mật của ứng viên Nguyễn Văn A';

/** Phản hồi giả có text và số token, giống GenerateContentResponse của SDK. */
function fakeResponse(text: string | undefined): GenerateContentResponse {
  return {
    text,
    candidates: [{ finishReason: text ? 'STOP' : 'SAFETY' }],
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3, totalTokenCount: 15 },
  } as unknown as GenerateContentResponse;
}

function apiError(status: number): ApiError {
  return new ApiError({ message: `{"error":{"code":${status}}}`, status });
}

/** Logger giả: gom tất cả các dòng log để kiểm tra. */
function fakeLogger() {
  const lines: string[] = [];
  const logger: AiLogger = {
    log: (m) => void lines.push(`log ${m}`),
    warn: (m) => void lines.push(`warn ${m}`),
    error: (m) => void lines.push(`error ${m}`),
  };
  return { logger, lines };
}

function setup(generateContent: GeminiModelsApi['generateContent']) {
  const { logger, lines } = fakeLogger();
  const config = resolveConfig({
    apiKey: API_KEY,
    models: { text: 'text-model', embedding: 'embed-model', audio: 'audio-model' },
    logger,
  });
  const api = { generateContent: vi.fn(generateContent) };
  const client = buildAiClient(config, api, { sleep: async () => {}, random: () => 0 });
  return { client, api, lines };
}

describe('createAiClient', () => {
  it('cấu hình sai thì báo lỗi ngay, không gọi mạng', () => {
    expect(() =>
      createAiClient({ apiKey: '', models: { text: 't', embedding: 'e', audio: 'a' } }),
    ).toThrow(AiConfigError);
  });
});

describe('generateText', () => {
  it('trả về text, dùng model text và truyền abortSignal cho SDK', async () => {
    const { client, api } = setup(async () => fakeResponse('xin chào'));

    await expect(client.generateText(PROMPT)).resolves.toBe('xin chào');
    const params = api.generateContent.mock.calls[0]![0] as GenerateContentParameters;
    expect(params.model).toBe('text-model');
    expect(params.config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('ghi log thành công kèm model, số retry, token; không lộ prompt hay API key', async () => {
    const { client, lines } = setup(async () => fakeResponse('ok'));

    await client.generateText(PROMPT);
    expect(lines).toEqual([
      expect.stringMatching(
        /^log ai\.generateText model=text-model ok durationMs=\d+ retries=0 tokens\(in\/out\/total\)=12\/3\/15$/,
      ),
    ]);
    expect(lines.join('\n')).not.toContain(PROMPT);
    expect(lines.join('\n')).not.toContain(API_KEY);
  });

  it('429 rồi thành công: retry 1 lần và ghi log warn', async () => {
    const { client, api, lines } = setup(async () => fakeResponse('ok'));
    api.generateContent.mockRejectedValueOnce(apiError(429));

    await expect(client.generateText(PROMPT)).resolves.toBe('ok');
    expect(api.generateContent).toHaveBeenCalledTimes(2);
    expect(lines[0]).toMatch(/^warn .* retry attempt=1 reason="status 429" delayMs=250$/);
    expect(lines[1]).toMatch(/ok .* retries=1 /);
  });

  it('429 liên tục: ném AiRateLimitError sau 4 lần gọi', async () => {
    const { client, api, lines } = setup(async () => {
      throw apiError(429);
    });

    const error = await client.generateText(PROMPT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiRateLimitError);
    expect(error).toMatchObject({ code: 'AI_RATE_LIMIT', status: 429, attempts: 4 });
    expect(api.generateContent).toHaveBeenCalledTimes(4);
    expect(lines.at(-1)).toMatch(/^error .* failed .* retries=3 code=AI_RATE_LIMIT status=429$/);
  });

  it('400: không retry, ném AI_REQUEST_FAILED kèm status', async () => {
    const { client, api } = setup(async () => {
      throw apiError(400);
    });

    const error = await client.generateText(PROMPT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ code: 'AI_REQUEST_FAILED', status: 400, attempts: 1 });
    expect(api.generateContent).toHaveBeenCalledTimes(1);
  });

  it('timeout: hủy request qua AbortSignal, retry, rồi ném AiTimeoutError', async () => {
    const signals: AbortSignal[] = [];
    const { client, api } = setup(
      (params) =>
        new Promise(() => {
          // Giả lập Gemini không bao giờ trả lời.
          signals.push(params.config!.abortSignal!);
        }),
    );

    const error = await client
      .generateText(PROMPT, { timeoutMs: 20, maxRetries: 1 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiTimeoutError);
    expect(error).toMatchObject({ code: 'AI_TIMEOUT', timeoutMs: 20, attempts: 2 });
    expect(api.generateContent).toHaveBeenCalledTimes(2);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });

  it('maxRetries theo từng lần gọi ghi đè cấu hình chung', async () => {
    const { client, api } = setup(async () => {
      throw apiError(503);
    });

    await expect(client.generateText(PROMPT, { maxRetries: 0 })).rejects.toMatchObject({
      attempts: 1,
    });
    expect(api.generateContent).toHaveBeenCalledTimes(1);
  });

  it('Gemini không trả text (bị chặn): ném AI_INVALID_RESPONSE', async () => {
    const { client } = setup(async () => fakeResponse(undefined));

    await expect(client.generateText(PROMPT)).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      issues: ['Gemini returned no text (finishReason=SAFETY)'],
    });
  });
});
