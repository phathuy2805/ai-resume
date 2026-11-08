// Public API của @hireflow/ai. Chỉ export những gì BE cần để tạo client, gọi hàm và bắt lỗi.
// Các file khác (retry, gemini, structured, config) là chi tiết nội bộ, có thể đổi mà không ảnh hưởng BE.

// Tạo client
export { createAiClient } from './client.js';
export type {
  AiClient,
  CallOptions,
  GenerateTextOptions,
  GenerateStructuredOptions,
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

/**
 * @deprecated Chỉ còn để apps/api (AppService) không bị lỗi.
 * Sẽ xóa khi BE tích hợp createAiClient (W2-BE-02).
 */
export function helloAI(): string {
  return 'Hello World!';
}
