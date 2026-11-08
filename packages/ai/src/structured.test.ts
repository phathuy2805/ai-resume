import {
  ApiError,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAiClient, type GeminiModelsApi } from './client.js';
import { resolveConfig } from './config.js';
import { AiConfigError, AiInvalidResponseError } from './errors.js';
import type { AiLogger } from './logger.js';
import { parseStructuredResponse, toGeminiJsonSchema } from './structured.js';

const CandidateSchema = z.object({
  fullName: z.string(),
  yearsOfExperience: z.number().int().min(0),
  skills: z.array(z.string()).default([]),
});

/** Tên ứng viên giả: dùng để kiểm tra dữ liệu CV không lọt vào lỗi hay log. */
const SECRET_NAME = 'Nguyễn Văn Bí Mật';

function fakeResponse(text: string | undefined): GenerateContentResponse {
  return {
    text,
    candidates: [{ finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
  } as unknown as GenerateContentResponse;
}

function setup(generateContent: GeminiModelsApi['generateContent']) {
  const lines: string[] = [];
  const logger: AiLogger = {
    log: (m) => void lines.push(`log ${m}`),
    warn: (m) => void lines.push(`warn ${m}`),
    error: (m) => void lines.push(`error ${m}`),
  };
  const config = resolveConfig({
    apiKey: 'test-key',
    models: { text: 'text-model', embedding: 'embed-model', audio: 'audio-model' },
    logger,
  });
  const api = { generateContent: vi.fn(generateContent) };
  const client = buildAiClient(config, api, { sleep: async () => {}, random: () => 0 });
  return { client, api, lines };
}

describe('toGeminiJsonSchema', () => {
  it('đổi Zod object sang JSON Schema; trường có default không bắt buộc', () => {
    expect(toGeminiJsonSchema(CandidateSchema)).toMatchObject({
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        yearsOfExperience: { type: 'integer', minimum: 0 },
        skills: { type: 'array', items: { type: 'string' } },
      },
      required: ['fullName', 'yearsOfExperience'],
    });
  });

  it('schema không đổi được (z.date) thì báo AiConfigError', () => {
    expect(() => toGeminiJsonSchema(z.object({ birthday: z.date() }))).toThrow(AiConfigError);
  });
});

describe('parseStructuredResponse', () => {
  it('JSON đúng schema: trả data đã qua Zod (có giá trị default)', () => {
    const result = parseStructuredResponse(
      '{"fullName":"A","yearsOfExperience":2}',
      CandidateSchema,
    );
    expect(result).toEqual({
      success: true,
      data: { fullName: 'A', yearsOfExperience: 2, skills: [] },
    });
  });

  it('text rỗng', () => {
    expect(parseStructuredResponse(undefined, CandidateSchema)).toEqual({
      success: false,
      issues: ['response is empty'],
    });
  });

  it('không phải JSON', () => {
    expect(parseStructuredResponse('Đây là kết quả: {', CandidateSchema)).toEqual({
      success: false,
      issues: ['response is not valid JSON'],
    });
  });

  it('sai schema: issues gồm đường dẫn + mô tả, không chứa giá trị', () => {
    const text = JSON.stringify({ fullName: 123, yearsOfExperience: -1, skills: [SECRET_NAME, 5] });
    const result = parseStructuredResponse(text, CandidateSchema);

    expect(result).toEqual({
      success: false,
      issues: [
        'fullName: Invalid input: expected string, received number',
        'yearsOfExperience: Too small: expected number to be >=0',
        'skills.1: Invalid input: expected string, received number',
      ],
    });
    expect(JSON.stringify(result)).not.toContain(SECRET_NAME);
  });

  it('lỗi ở gốc ghi là (root)', () => {
    const result = parseStructuredResponse('[]', CandidateSchema);
    expect(result).toMatchObject({
      success: false,
      issues: [expect.stringMatching(/^\(root\): /)],
    });
  });
});

describe('generateStructured', () => {
  const valid = JSON.stringify({ fullName: SECRET_NAME, yearsOfExperience: 3, skills: ['nestjs'] });
  const invalid = JSON.stringify({ fullName: SECRET_NAME, yearsOfExperience: 'ba năm' });

  it('gửi responseMimeType + responseJsonSchema, trả về dữ liệu đúng kiểu', async () => {
    const { client, api } = setup(async () => fakeResponse(valid));

    const data = await client.generateStructured('Trích thông tin CV', CandidateSchema);

    expect(data).toEqual({ fullName: SECRET_NAME, yearsOfExperience: 3, skills: ['nestjs'] });
    expectTypeOf(data).toEqualTypeOf<{
      fullName: string;
      yearsOfExperience: number;
      skills: string[];
    }>();
    const params = api.generateContent.mock.calls[0]![0] as GenerateContentParameters;
    expect(params.model).toBe('text-model');
    expect(params.config).toMatchObject({
      responseMimeType: 'application/json',
      responseJsonSchema: { type: 'object', required: ['fullName', 'yearsOfExperience'] },
    });
  });

  it('sai schema lần 1, đúng lần 2: gọi lại đúng 1 lần', async () => {
    const { client, api, lines } = setup(async () => fakeResponse(valid));
    api.generateContent.mockResolvedValueOnce(fakeResponse(invalid));

    await expect(client.generateStructured('p', CandidateSchema)).resolves.toMatchObject({
      yearsOfExperience: 3,
    });
    expect(api.generateContent).toHaveBeenCalledTimes(2);
    expect(lines.filter((l) => l.startsWith('warn'))).toEqual([
      'warn ai.generateStructured model=text-model invalid-response attempt=1 issues=1',
    ]);
  });

  it('sai schema cả 2 lần: ném AiInvalidResponseError, không lộ dữ liệu CV', async () => {
    const { client, api, lines } = setup(async () => fakeResponse(invalid));

    const error = await client.generateStructured('p', CandidateSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AiInvalidResponseError);
    expect(error).toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      attempts: 2,
      issues: ['yearsOfExperience: Invalid input: expected number, received string'],
    });
    expect(api.generateContent).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error)).not.toContain(SECRET_NAME);
    expect(String((error as Error).message)).not.toContain(SECRET_NAME);
    expect(lines.join('\n')).not.toContain(SECRET_NAME);
  });

  it('lỗi mạng (429) do withRetry xử lý, không tính vào lượt gọi lại vì sai schema', async () => {
    const { client, api, lines } = setup(async () => fakeResponse(valid));
    api.generateContent.mockRejectedValueOnce(new ApiError({ message: '{}', status: 429 }));

    await expect(client.generateStructured('p', CandidateSchema)).resolves.toBeDefined();
    expect(api.generateContent).toHaveBeenCalledTimes(2);
    expect(lines.some((l) => l.includes('invalid-response'))).toBe(false);
  });

  it('lỗi 400 từ Gemini: ném ngay, không gọi lại', async () => {
    const { client, api } = setup(async () => {
      throw new ApiError({ message: '{}', status: 400 });
    });

    await expect(client.generateStructured('p', CandidateSchema)).rejects.toMatchObject({
      code: 'AI_REQUEST_FAILED',
      status: 400,
    });
    expect(api.generateContent).toHaveBeenCalledTimes(1);
  });

  it('schema không đổi được: báo AiConfigError trước khi gọi Gemini', async () => {
    const { client, api } = setup(async () => fakeResponse(valid));

    await expect(
      client.generateStructured('p', z.object({ birthday: z.date() })),
    ).rejects.toBeInstanceOf(AiConfigError);
    expect(api.generateContent).not.toHaveBeenCalled();
  });
});
