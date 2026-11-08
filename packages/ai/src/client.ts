import {
  GoogleGenAI,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import {
  resolveConfig,
  type AiClientOptions,
  type AiModels,
  type ResolvedAiConfig,
} from './config.js';
import { AiInvalidResponseError } from './errors.js';
import {
  describeRetryReason,
  formatUsage,
  isRetryableGeminiError,
  runWithTimeout,
  toAiError,
} from './gemini.js';
import { withRetry, type RetryOptions } from './retry.js';
import {
  parseStructuredResponse,
  STRUCTURED_MAX_ATTEMPTS,
  toGeminiJsonSchema,
} from './structured.js';
import type { z } from 'zod';

/** Ghi đè timeout / số lần retry cho riêng một lần gọi. */
export interface CallOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GenerateTextOptions extends CallOptions {
  systemInstruction?: string;
  temperature?: number;
}

export type GenerateStructuredOptions = GenerateTextOptions;

export interface AiClient {
  /** Tên model đang dùng (để BE lưu kèm kết quả chấm, phục vụ đối chiếu). */
  readonly models: Readonly<AiModels>;
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  /**
   * Yêu cầu Gemini trả JSON theo `schema`, kiểm tra bằng Zod và trả về dữ liệu đúng kiểu.
   * Sai schema thì gọi lại 1 lần; vẫn sai thì ném AiInvalidResponseError.
   */
  generateStructured<T extends z.ZodType>(
    prompt: string,
    schema: T,
    options?: GenerateStructuredOptions,
  ): Promise<z.output<T>>;
}

/** Phần nhỏ của SDK mà client cần. Tách ra để test truyền bản giả vào. */
export interface GeminiModelsApi {
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
}

/** Tùy chọn chỉ dùng trong test để retry không phải chờ thật. */
export type RetryTiming = Pick<RetryOptions, 'sleep' | 'random' | 'baseDelayMs' | 'maxDelayMs'>;

/** Hàm BE gọi để tạo client. */
export function createAiClient(options: AiClientOptions): AiClient {
  const config = resolveConfig(options);
  // Không truyền httpOptions.retryOptions: retry của SDK tắt, chỉ dùng withRetry của mình.
  const genai = new GoogleGenAI({ apiKey: config.apiKey });
  return buildAiClient(config, genai.models);
}

/** Lắp client từ cấu hình + SDK. Export để test, KHÔNG export ra index.ts. */
export function buildAiClient(
  config: ResolvedAiConfig,
  api: GeminiModelsApi,
  retryTiming: RetryTiming = {},
): AiClient {
  const { logger } = config;

  /** Mọi lần gọi Gemini đều đi qua đây: timeout + retry + log + đổi lỗi. */
  async function generateContent(
    fn: string,
    params: GenerateContentParameters,
    options: CallOptions = {},
  ): Promise<GenerateContentResponse> {
    const timeoutMs = options.timeoutMs ?? config.timeoutMs;
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const prefix = `ai.${fn} model=${params.model}`;
    const startedAt = performance.now();
    const elapsedMs = () => Math.round(performance.now() - startedAt);

    try {
      const { value, attempts } = await withRetry(
        () =>
          runWithTimeout(timeoutMs, (signal) =>
            api.generateContent({ ...params, config: { ...params.config, abortSignal: signal } }),
          ),
        {
          ...retryTiming,
          maxRetries,
          shouldRetry: isRetryableGeminiError,
          toFinalError: toAiError,
          onRetry: ({ attempt, delayMs, error }) =>
            logger.warn(
              `${prefix} retry attempt=${attempt} reason="${describeRetryReason(error)}" delayMs=${delayMs}`,
            ),
        },
      );
      logger.log(
        `${prefix} ok durationMs=${elapsedMs()} retries=${attempts - 1} tokens(in/out/total)=${formatUsage(value.usageMetadata)}`,
      );
      return value;
    } catch (error) {
      const aiError = toAiError(error, 1);
      logger.error(
        `${prefix} failed durationMs=${elapsedMs()} retries=${aiError.attempts - 1} code=${aiError.code} status=${aiError.status ?? 'n/a'}`,
      );
      throw aiError;
    }
  }

  return {
    models: config.models,

    async generateText(prompt, options = {}) {
      const { systemInstruction, temperature, ...callOptions } = options;
      const response = await generateContent(
        'generateText',
        { model: config.models.text, contents: prompt, config: { systemInstruction, temperature } },
        callOptions,
      );
      const text = response.text;
      if (!text) {
        const finishReason = response.candidates?.[0]?.finishReason ?? 'unknown';
        throw new AiInvalidResponseError([
          `Gemini returned no text (finishReason=${finishReason})`,
        ]);
      }
      return text;
    },

    async generateStructured(prompt, schema, options = {}) {
      const { systemInstruction, temperature, ...callOptions } = options;
      const params: GenerateContentParameters = {
        model: config.models.text,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiJsonSchema(schema),
        },
      };

      let issues: string[] = [];
      for (let attempt = 1; attempt <= STRUCTURED_MAX_ATTEMPTS; attempt++) {
        const response = await generateContent('generateStructured', params, callOptions);
        const result = parseStructuredResponse(response.text, schema);
        if (result.success) return result.data;

        issues = result.issues;
        logger.warn(
          `ai.generateStructured model=${params.model} invalid-response attempt=${attempt} issues=${issues.length}`,
        );
      }
      throw new AiInvalidResponseError(issues, { attempts: STRUCTURED_MAX_ATTEMPTS });
    },
  };
}
