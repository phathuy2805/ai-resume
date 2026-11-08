import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS, resolveConfig } from './config.js';
import { AiConfigError } from './errors.js';
import type { AiLogger } from './logger.js';

const models = { text: 'text-model', embedding: 'embed-model', audio: 'audio-model' };

describe('resolveConfig', () => {
  it('điền giá trị mặc định: timeout 30s, retry 3 lần, logger là console', () => {
    const config = resolveConfig({ apiKey: 'key', models });

    expect(config).toMatchObject({ apiKey: 'key', models, timeoutMs: 30_000, maxRetries: 3 });
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
    expect(DEFAULT_MAX_RETRIES).toBe(3);
    expect(config.logger).toBe(console);
  });

  it('giữ logger và giá trị BE truyền vào', () => {
    const logger: AiLogger = { log() {}, warn() {}, error() {} };
    const config = resolveConfig({ apiKey: 'key', models, logger, timeoutMs: 5000, maxRetries: 0 });

    expect(config).toMatchObject({ timeoutMs: 5000, maxRetries: 0 });
    expect(config.logger).toBe(logger);
  });

  it('cắt khoảng trắng/xuống dòng thừa ở API key và tên model (lỗi hay gặp khi copy vào .env)', () => {
    const config = resolveConfig({
      apiKey: '  key\r\n',
      models: { text: ' text-model ', embedding: 'embed-model\n', audio: 'audio-model' },
    });

    expect(config.apiKey).toBe('key');
    expect(config.models).toEqual(models);
  });

  it.each([
    ['apiKey rỗng', { apiKey: '', models }, 'apiKey is required'],
    ['apiKey chỉ có khoảng trắng', { apiKey: '   ', models }, 'apiKey is required'],
    [
      'thiếu models.text',
      { apiKey: 'k', models: { ...models, text: '' } },
      'models.text is required',
    ],
    [
      'thiếu models.embedding',
      { apiKey: 'k', models: { ...models, embedding: undefined } },
      'models.embedding is required',
    ],
    ['thiếu cả models', { apiKey: 'k', models: undefined }, 'models.text is required'],
    [
      'timeoutMs = 0',
      { apiKey: 'k', models, timeoutMs: 0 },
      'timeoutMs must be a positive integer',
    ],
    [
      'timeoutMs lẻ',
      { apiKey: 'k', models, timeoutMs: 1.5 },
      'timeoutMs must be a positive integer',
    ],
    ['maxRetries âm', { apiKey: 'k', models, maxRetries: -1 }, 'maxRetries must be an integer'],
    [
      'maxRetries quá lớn',
      { apiKey: 'k', models, maxRetries: 11 },
      'maxRetries must be an integer',
    ],
  ])('%s → AiConfigError', (_label, options, message) => {
    // Ép kiểu vì đây là dữ liệu sai cố ý (giống biến môi trường bị thiếu lúc chạy).
    const run = () => resolveConfig(options as unknown as Parameters<typeof resolveConfig>[0]);

    expect(run).toThrow(AiConfigError);
    expect(run).toThrow(message);
  });

  it('cấu hình trả về không sửa được (Object.freeze)', () => {
    const config = resolveConfig({ apiKey: 'key', models });

    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.models)).toBe(true);
  });
});
