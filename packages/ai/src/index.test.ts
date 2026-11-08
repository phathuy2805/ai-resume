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
      'createAiClient',
      'helloAI',
      'isAiError',
    ]);
  });
});
