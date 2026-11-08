# @hireflow/ai

Thư viện gọi Gemini dùng chung cho mọi tính năng AI của HireFlow (parse CV, phân tích JD, chấm điểm, phỏng vấn).
Có sẵn timeout, retry, log an toàn và kiểm tra kết quả JSON bằng Zod.

## Dùng trong BE

```ts
import { createAiClient, isAiError } from '@hireflow/ai';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

const ai = createAiClient({
  apiKey: process.env.GEMINI_API_KEY!, // package KHÔNG tự đọc process.env
  models: {
    text: process.env.GEMINI_MODEL_TEXT!,
    embedding: process.env.GEMINI_MODEL_EMBEDDING!,
    audio: process.env.GEMINI_MODEL_AUDIO!,
  },
  logger: new Logger('AI'), // không bắt buộc, mặc định là console
  timeoutMs: 30_000, // không bắt buộc, mặc định 30s cho mỗi lần gọi
  maxRetries: 3, // không bắt buộc, mặc định 3 (tổng tối đa 4 lần gọi)
});

const JdSchema = z.object({ title: z.string(), requiredSkills: z.array(z.string()) });

const text = await ai.generateText('...');
const jd = await ai.generateStructured('...', JdSchema); // jd có kiểu { title: string; requiredSkills: string[] }

// Ghi đè cho riêng một lần gọi (vd. phỏng vấn trực tiếp cần phản hồi nhanh):
await ai.generateText('...', { timeoutMs: 10_000, maxRetries: 1 });
```

Cấu hình sai (thiếu key, thiếu tên model...) ném `AiConfigError` ngay khi gọi `createAiClient`,
nên lỗi lộ ra lúc app khởi động.

## Xử lý lỗi

Mọi lỗi ném ra đều là `AiError` (kiểm tra bằng `isAiError(e)`), phân biệt bằng `e.code`:

| `code`                | Khi nào                                                  | HTTP gợi ý cho BE |
| --------------------- | -------------------------------------------------------- | ----------------- |
| `AI_RATE_LIMIT`       | Gemini trả 429, đã hết lượt retry                        | 503               |
| `AI_TIMEOUT`          | Quá `timeoutMs`, đã hết lượt retry                       | 504               |
| `AI_INVALID_RESPONSE` | Kết quả sai schema sau 2 lần gọi, hoặc Gemini trả rỗng   | 502               |
| `AI_REQUEST_FAILED`   | Lỗi khác: 400, 403, 404, 500 sau retry, lỗi mạng         | 502               |
| `AI_CONFIG_INVALID`   | Cấu hình sai, hoặc Zod schema không đổi được JSON Schema | Lỗi khởi động     |

Mỗi lỗi có `attempts` (tổng số lần đã gọi) và `status` (HTTP status từ Gemini, nếu có).
Lỗi gốc nằm trong `cause` để debug: **không trả `cause` về cho client**.

## Retry và timeout

- Retry với exponential backoff + jitter (chờ khoảng 0,25–0,5s, 0,5–1s, 1–2s), chỉ cho **429, 500, 503 và timeout**.
  Lỗi khác (400, 403, 404, lỗi mạng) ném ngay.
- Timeout tính cho **từng lần gọi**; hết giờ thì request HTTP bị hủy thật (AbortSignal).
- `generateStructured`: Gemini trả JSON sai schema thì gọi lại 1 lần, vẫn sai thì ném `AiInvalidResponseError`
  (`issues` liệt kê đường dẫn và mô tả lỗi). Lượt gọi lại này tách riêng với retry lỗi mạng.

## Log

Mỗi lần gọi ghi 1 dòng qua logger, chỉ có metadata:

```
ai.generateStructured model=<model> ok durationMs=812 retries=0 tokens(in/out/total)=120/45/165
ai.generateText model=<model> retry attempt=1 reason="status 429" delayMs=446
ai.generateText model=<model> failed durationMs=1146 retries=2 code=AI_TIMEOUT status=n/a
```

Log không bao giờ chứa prompt, nội dung CV/transcript, kết quả trả về hay API key (có test kiểm tra).

## Scripts

Chạy từ thư mục gốc repo:

| Lệnh                                               | Việc                                                     |
| -------------------------------------------------- | -------------------------------------------------------- |
| `npm run build -w packages/ai`                     | Build ra `dist/` (ESM + CJS + `.d.ts`)                   |
| `npm run dev -w packages/ai`                       | Build lại khi sửa code (đã có trong `npm run dev` ở gốc) |
| `npm run test -w packages/ai`                      | Unit test (không gọi Gemini thật)                        |
| `npm run test:cov -w packages/ai`                  | Test + độ phủ (báo cáo HTML ở `coverage/`)               |
| `npm run typecheck -w packages/ai`                 | Kiểm tra kiểu, kể cả kiểu trong test                     |
| `npm run try -w packages/ai [-- text\|structured]` | Chạy thử với Gemini thật                                 |

`npm run try` đọc `packages/ai/.env`: copy từ `.env.example` rồi điền `GEMINI_API_KEY` và `GEMINI_MODEL_TEXT`.
