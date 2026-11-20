import {
  GoogleGenAI,
  type EmbedContentParameters,
  type EmbedContentResponse,
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

export interface EmbedOptions extends CallOptions {
  /** Mục đích của vector, vd. "SEMANTIC_SIMILARITY". Hai vector muốn so sánh phải dùng cùng taskType. */
  taskType?: string;
  /** Số chiều muốn lấy (Gemini cắt bớt từ cuối). Không truyền thì lấy số chiều mặc định của model. */
  outputDimensionality?: number;
}

/** Câu lệnh để Gemini chép lại nguyên văn chữ trong file PDF (dùng cho CV dạng ảnh scan). */
export const READ_PDF_TEXT_INSTRUCTION = `Transcribe all readable text in this PDF exactly as written, in reading order.
Rules:
- Keep the original language and Vietnamese diacritics. Do not translate, summarize, correct or add anything.
- Keep line breaks between lines and a blank line between sections.
- Output plain text only, without markdown or comments.
- If there is no readable text, output nothing.`;

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
  /**
   * Nhờ Gemini đọc (OCR) chữ trong file PDF, vd. CV dạng ảnh scan. Trả '' nếu không đọc được chữ nào.
   * Lưu ý: kết quả do AI đọc, có thể sót hoặc sai chữ; không kiểm chứng lại được như text gốc của PDF.
   */
  readPdfText(pdf: Uint8Array, options?: CallOptions): Promise<string>;
  /**
   * Lấy vector embedding (chưa chuẩn hóa) của một đoạn text bằng model embedding.
   * Thường không gọi trực tiếp: dùng embedText / embedCv / embedJd (đã cố định taskType, số chiều, chuẩn hóa).
   */
  embed(text: string, options?: EmbedOptions): Promise<number[]>;
}

/** Phần nhỏ của SDK mà client cần. Tách ra để test truyền bản giả vào. */
export interface GeminiModelsApi {
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  embedContent(params: EmbedContentParameters): Promise<EmbedContentResponse>;
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

  /**
   * Mọi lần gọi Gemini đều đi qua đây: timeout + retry + log + đổi lỗi.
   * `describe` trả phần cuối của dòng log thành công (số token, số chiều...), không bao giờ chứa nội dung.
   */
  async function callGemini<R>(
    fn: string,
    model: string,
    run: (signal: AbortSignal) => Promise<R>,
    describe: (value: R) => string,
    options: CallOptions = {},
  ): Promise<R> {
    const timeoutMs = options.timeoutMs ?? config.timeoutMs;
    const maxRetries = options.maxRetries ?? config.maxRetries;
    const prefix = `ai.${fn} model=${model}`;
    const startedAt = performance.now();
    const elapsedMs = () => Math.round(performance.now() - startedAt);

    try {
      const { value, attempts } = await withRetry(() => runWithTimeout(timeoutMs, run), {
        ...retryTiming,
        maxRetries,
        shouldRetry: isRetryableGeminiError,
        toFinalError: toAiError,
        onRetry: ({ attempt, delayMs, error }) =>
          logger.warn(
            `${prefix} retry attempt=${attempt} reason="${describeRetryReason(error)}" delayMs=${delayMs}`,
          ),
      });
      logger.log(
        `${prefix} ok durationMs=${elapsedMs()} retries=${attempts - 1} ${describe(value)}`,
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

  function generateContent(
    fn: string,
    params: GenerateContentParameters,
    options: CallOptions = {},
  ): Promise<GenerateContentResponse> {
    return callGemini(
      fn,
      params.model,
      (signal) =>
        api.generateContent({ ...params, config: { ...params.config, abortSignal: signal } }),
      (response) => `tokens(in/out/total)=${formatUsage(response.usageMetadata)}`,
      options,
    );
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

    async readPdfText(pdf, options = {}) {
      const response = await generateContent(
        'readPdfText',
        {
          model: config.models.text,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: Buffer.from(pdf).toString('base64'),
                  },
                },
                { text: 'Transcribe the text of this document.' },
              ],
            },
          ],
          config: { systemInstruction: READ_PDF_TEXT_INSTRUCTION, temperature: 0 },
        },
        options,
      );
      return (response.text ?? '').trim();
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

    async embed(text, options = {}) {
      const { taskType, outputDimensionality, ...callOptions } = options;
      const model = config.models.embedding;
      const response = await callGemini(
        'embed',
        model,
        (signal) =>
          api.embedContent({
            model,
            contents: text,
            config: { taskType, outputDimensionality, abortSignal: signal },
          }),
        (result) => {
          const embedding = result.embeddings?.[0];
          // Gemini Developer API không trả số token cho embedding (chỉ Vertex có statistics).
          const tokens = embedding?.statistics?.tokenCount ?? 'n/a';
          return `dims=${embedding?.values?.length ?? 0} chars=${text.length} tokens=${tokens}`;
        },
        callOptions,
      );

      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new AiInvalidResponseError(['Gemini returned no embedding values']);
      }
      return values;
    },
  };
}
