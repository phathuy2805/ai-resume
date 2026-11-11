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

## Chuẩn hóa kỹ năng (dùng chung JD và CV)

```ts
import { normalizeSkill, normalizeSkills, normalizeLevel } from '@hireflow/ai';

normalizeSkill('Node.js'); // 'NodeJS'
normalizeSkill('Power BI'); // 'PowerBI'
normalizeSkill('SQL cơ bản'); // 'SQL'  (bỏ từ chỉ mức độ)
normalizeSkill('Rust'); // 'Rust'  (không có trong bảng thì giữ nguyên, không bỏ)
normalizeSkills(['Node.js', 'NodeJS', 'Facebook Ads']); // ['NodeJS', 'Meta Ads']  (bỏ trùng)
normalizeLevel('Middle / Senior'); // 'middle'  (nhiều cấp thì lấy cấp thấp nhất)
```

- **Tên chuẩn** là tên trong `requiredSkills` / `preferredSkills` của 3 JD ở `fixtures/jds`
  (`labels.csv` cũng dùng đúng các tên này). So khớp không phân biệt hoa thường, dấu tiếng Việt,
  dấu chấm, gạch, khoảng trắng.
- **Thêm cách viết mới**: thêm vào mảng alias của kỹ năng trong `src/skills.ts` (`SKILL_ALIASES`).
  Thêm kỹ năng mới: thêm một dòng. Nếu một alias bị gán cho 2 kỹ năng, package báo lỗi ngay khi import.
- Test kiểm tra mọi kỹ năng trong 3 JD và mọi giá trị `missing_skills` của `labels.csv` đều là tên chuẩn:
  sửa JD hoặc bảng alias làm lệch nhau thì `npm run test -w packages/ai` báo ngay.

## Phân tích JD (`parseJd`)

```ts
import { parseJd, ParsedJdSchema, type ParsedJd } from '@hireflow/ai';

const parsed: ParsedJd = await parseJd(ai, {
  title: dto.title,
  description: dto.description,
  requirements: dto.requirements, // tùy chọn
  requiredSkills: dto.requiredSkills,
  preferredSkills: dto.preferredSkills,
  minYearsExperience: dto.minYearsExperience,
  level: dto.level, // tùy chọn, chữ tự do, vd. "Middle / Senior"
});
await prisma.job.update({ where: { id }, data: { parsedJd: parsed } });

// Đọc lại từ DB: kiểm tra trước khi dùng (dữ liệu cũ có thể khác schemaVersion)
const stored = ParsedJdSchema.safeParse(job.parsedJd);
```

Kết quả (`ParsedJd`, `schemaVersion: 1`): `requiredSkills`, `preferredSkills` (đã chuẩn hóa),
`minYearsExperience`, `level` (`intern | junior | middle | senior | null`), `educationRequirement`,
`responsibilities` (tối đa 8 ý), `domain`.

Quy tắc gộp dữ liệu HR với kết quả AI (viết bằng code, không phụ thuộc AI):

| Trường              | Quy tắc                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| Kỹ năng             | Kỹ năng HR nhập **luôn được giữ**, đứng đầu, đúng nhóm HR chọn. AI chỉ **bổ sung** |
| Kỹ năng AI thêm     | Chỉ giữ nếu tên hoặc alias **thật sự xuất hiện** trong tiêu đề / mô tả / yêu cầu   |
| Bắt buộc và ưu tiên | Một kỹ năng chỉ nằm ở một nhóm; ở cả hai thì giữ ở nhóm bắt buộc                   |
| Số năm, cấp độ      | HR đã nhập (kể cả số 0) thì dùng của HR; AI chỉ điền khi HR để trống               |

Gọi Gemini với `temperature: 0`. Lỗi từ AI (`AiError`) được ném nguyên vẹn để BE xử lý như các hàm khác.

## Scripts

Chạy từ thư mục gốc repo:

| Lệnh                                                   | Việc                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `npm run build -w packages/ai`                         | Build ra `dist/` (ESM + CJS + `.d.ts`)                                            |
| `npm run dev -w packages/ai`                           | Build lại khi sửa code (đã có trong `npm run dev` ở gốc)                          |
| `npm run test -w packages/ai`                          | Unit test (không gọi Gemini thật)                                                 |
| `npm run test:cov -w packages/ai`                      | Test + độ phủ (báo cáo HTML ở `coverage/`)                                        |
| `npm run typecheck -w packages/ai`                     | Kiểm tra kiểu, kể cả kiểu trong test                                              |
| `npm run try -w packages/ai [-- text\|structured\|jd]` | Chạy thử với Gemini thật (`jd`: `parseJd` trên 3 JD fixtures, có tự đánh dấu ✓/✗) |

`npm run try` đọc `packages/ai/.env`: copy từ `.env.example` rồi điền `GEMINI_API_KEY` và `GEMINI_MODEL_TEXT`.
