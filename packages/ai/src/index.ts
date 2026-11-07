export { resolveConfig, DEFAULT_TIMEOUT_MS, DEFAULT_MAX_RETRIES } from './config.js';
export type { AiClientOptions, AiModels, ResolvedAiConfig } from './config.js';
export { consoleLogger } from './logger.js';
export type { AiLogger } from './logger.js';
export {
  AiError,
  AiConfigError,
  AiRateLimitError,
  AiTimeoutError,
  AiInvalidResponseError,
  isAiError,
} from './errors.js';
export type { AiErrorCode, AiErrorOptions } from './errors.js';

export function helloAI(): string {
  return 'Hello from @hireflow/ai package!';
}
