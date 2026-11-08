import { AiConfigError } from './errors.js';
import { consoleLogger, type AiLogger } from './logger.js';

/** Tên model theo mục đích. BE đọc từ biến môi trường rồi truyền vào. */
export interface AiModels {
  text: string;
  embedding: string;
  audio: string;
}

/** Tham số của createAiClient(). */
export interface AiClientOptions {
  apiKey: string;
  models: AiModels;
  /** Thời gian chờ tối đa cho mỗi request (ms). Mặc định 30000. */
  timeoutMs?: number;
  /** Số lần retry tối đa cho lỗi 429/500/503/timeout. Mặc định 3. */
  maxRetries?: number;
  /** Mặc định là console. */
  logger?: AiLogger;
}

/** Cấu hình sau khi đã kiểm tra và điền giá trị mặc định. */
export interface ResolvedAiConfig {
  readonly apiKey: string;
  readonly models: Readonly<AiModels>;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly logger: AiLogger;
}

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 3;
const MAX_ALLOWED_RETRIES = 10;

function requireNonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AiConfigError(`${name} is required`);
  }
  return value.trim();
}

/** Kiểm tra tham số và điền mặc định. Không bao giờ đọc process.env. */
export function resolveConfig(options: AiClientOptions): ResolvedAiConfig {
  const apiKey = requireNonEmpty(options.apiKey, 'apiKey');
  const models = Object.freeze({
    text: requireNonEmpty(options.models?.text, 'models.text'),
    embedding: requireNonEmpty(options.models?.embedding, 'models.embedding'),
    audio: requireNonEmpty(options.models?.audio, 'models.audio'),
  });

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new AiConfigError('timeoutMs must be a positive integer');
  }

  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > MAX_ALLOWED_RETRIES) {
    throw new AiConfigError(`maxRetries must be an integer from 0 to ${MAX_ALLOWED_RETRIES}`);
  }

  return Object.freeze({
    apiKey,
    models,
    timeoutMs,
    maxRetries,
    logger: options.logger ?? consoleLogger,
  });
}
