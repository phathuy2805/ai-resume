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

## Trích chữ từ CV PDF (`extractCvText`)

Dùng khi ứng viên nộp CV (W1-BE-05). Chỉ nhận bytes của file, không tự tải file qua mạng.

```ts
import { extractCvText, isCvExtractionError } from '@hireflow/ai';

try {
  const cv = await extractCvText(file.buffer, { ocrFallback: { ai }, logger: new Logger('AI') });
  // cv = { text, pageCount, charCount, truncated, source: 'pdf-text' | 'ai-ocr' }
  // → lưu cv.text vào applications.cv_text, rồi upload ĐÚNG file.buffer lên S3
} catch (error) {
  if (isCvExtractionError(error)) {
    // 422 cho ứng viên, không lưu gì
    throw new UnprocessableEntityException({ code: error.code, message: error.messageVi });
  }
  throw error;
}
```

| Mã lỗi           | Khi nào                                                         |
| ---------------- | --------------------------------------------------------------- |
| `ENCRYPTED`      | PDF có mật khẩu mở file (chỉ khóa quyền sửa thì vẫn đọc được)   |
| `CORRUPTED`      | File hỏng, không phải PDF, hoặc 0 byte                          |
| `TOO_MANY_PAGES` | Quá 10 trang (kiểm tra trước khi trích chữ)                     |
| `SCANNED`        | Trung bình dưới 100 ký tự/trang, hoặc không có chữ nhưng có ảnh |
| `EMPTY`          | Không có chữ và không có ảnh (trang trắng)                      |

Câu thông báo tiếng Việt cho từng mã: `error.messageVi`, hoặc `CV_EXTRACTION_MESSAGES_VI` (để FE dùng chung).

- **Làm sạch chữ:** chuẩn hóa Unicode NFC (gộp dấu tiếng Việt bị tách), bỏ ký tự điều khiển / vô hình / lỗi `�`,
  gộp khoảng trắng, giữ xuống dòng. Chữ dài quá 20.000 ký tự thì cắt (ưu tiên ở chỗ xuống dòng), `truncated: true`.
- **Không làm hỏng `file.buffer`:** PDF.js chiếm mất mảng bytes truyền vào, nên hàm luôn đưa cho PDF.js một bản sao.
- **CV dạng ảnh scan:** mặc định bị từ chối `SCANNED`. Truyền `ocrFallback: { ai }` để nhờ Gemini đọc
  (khoảng 1–2 giây, ~750 token/trang). Gemini lỗi hoặc đọc không đủ chữ thì vẫn từ chối `SCANNED`.
  Chữ do Gemini đọc có `source: 'ai-ocr'` và **có thể bị AI sửa** (vd. tự thêm dấu), không chính xác tuyệt đối như `pdf-text`.
- **CV 2 cột:** chữ được trích **theo từng cột** (cột phụ như liên hệ, kỹ năng, học vấn trước; cột chính như mục tiêu,
  kinh nghiệm sau), không trộn lẫn giữa các dòng. Prompt của `parseCv` (W1-AI-04) có nêu điều này.
- **Log:** chỉ số trang, số ký tự, mã lỗi, nguồn, thời gian; không ghi nội dung CV.
- Chạy được từ cả bản ESM và CommonJS của package (Node 24).

## Phân tích CV (`parseCv`)

Biến text CV (kết quả của `extractCvText`, đã lưu ở `applications.cv_text`) thành dữ liệu có cấu trúc để chấm điểm ở tuần 2.

```ts
import { parseCv, ParsedCvSchema, type ParsedCv } from '@hireflow/ai';

const parsedCv: ParsedCv = await parseCv(ai, application.cvText);
await prisma.application.update({ where: { id }, data: { parsedCv } });

// Tùy chọn: timeoutMs, maxRetries (ghi đè cho riêng lần gọi này), referenceDate (xem dưới)
await parseCv(ai, cvText, { timeoutMs: 60_000 });

// Đọc lại từ DB: kiểm tra trước khi dùng (dữ liệu cũ có thể khác schemaVersion)
const stored = ParsedCvSchema.safeParse(application.parsedCv);
```

Kết quả (`ParsedCv`, `schemaVersion: 1`). Mảng mặc định `[]`, trường đơn có thể `null`:

| Trường                 | Nội dung                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `summary`              | Tóm tắt 1–2 câu, theo ngôn ngữ của CV, không nêu tên                                                                             |
| `skills`               | Kỹ năng đã chuẩn hóa (cùng bảng alias với JD), **gồm cả** công nghệ trong `experiences`, `projects`                              |
| `experiences`          | `company`, `title`, `startDate`, `endDate` (`YYYY-MM`; `endDate: null` là đang làm hoặc không rõ), `description`, `technologies` |
| `education`            | `school`, `major`, `degree`, `graduationYear`                                                                                    |
| `projects`             | `name`, `role`, `technologies`, `description`                                                                                    |
| `certifications`       | Tên chứng chỉ, kèm điểm nếu có (vd. `IELTS 7.0`)                                                                                 |
| `languages`            | Ngoại ngữ, kèm trình độ nếu có                                                                                                   |
| `totalYearsExperience` | Tổng số năm kinh nghiệm, **tính bằng code**, làm tròn 1 chữ số thập phân                                                         |

- **Không bịa, không lấy thông tin cá nhân:** prompt cấm trích họ tên, email, SĐT, địa chỉ, ngày sinh, giới tính,
  ảnh, link cá nhân. Thông tin không có trong CV thì để `null` / `[]`.
- **Số năm kinh nghiệm** (`calculateTotalYearsExperience`, cũng được export): tháng bắt đầu tính từ ngày 01, tháng kết thúc
  ghi cụ thể được tính hết tháng đó, đang làm thì tính đến đầu tháng của `referenceDate`. Các khoảng chồng nhau hoặc
  nối tiếp chỉ tính một lần. Công việc có ngày kết thúc không đọc được thì không tính vào tổng (để không bị tính nhầm là đang làm).
- **`referenceDate`:** mốc "hôm nay" cho công việc đang làm. BE không truyền (mặc định là lúc gọi hàm).
  Fixtures và test truyền `new Date('2026-11-01')` (ngày đánh giá cố định, xem `fixtures/README.md`).
- **Ngày tháng:** Gemini được yêu cầu trả `YYYY-MM`; code vẫn đọc được `03/2024`, `T3/2024`, `Mar 2024`, `2024`
  (chỉ có năm: bắt đầu tháng 01, kết thúc tháng 12).
- **Lỗi:** text rỗng ném `CvExtractionError('EMPTY')` (không gọi Gemini). Lỗi gọi Gemini là `AiError` như các hàm khác.
- Gọi Gemini với `temperature: 0`. Client ghi log thời gian và token, không ghi nội dung CV.

### Kết quả chạy thử (W1-AI-04)

Chạy bằng `npm run try -w packages/ai -- parse-cv [all]`, model `gemini-3.5-flash-lite`, ngày tham chiếu 01/11/2026.
Prompt chỉ được chỉnh dựa trên 11 CV **tập dev**; tập test chỉ chạy để xác nhận.

| Kiểm tra (30 CV)                                                                         | Kết quả                     |
| ---------------------------------------------------------------------------------------- | --------------------------- |
| Hợp lệ theo `ParsedCvSchema`, không phải gọi lại do sai schema                           | 30/30                       |
| Không chứa họ tên, email, SĐT, địa chỉ, link GitHub                                      | 30/30                       |
| `totalYearsExperience` đúng với mốc thời gian gốc của fixtures                           | 30/30                       |
| Số công việc trích được đúng                                                             | 30/30                       |
| Kỹ năng bắt buộc của JD mục tiêu không thấy trong CV = `missing_skills` của `labels.csv` | 30/30                       |
| Thời gian trung bình                                                                     | ~1,6 giây/CV (1,2–2,3 giây) |
| Token mỗi CV                                                                             | ~650–850 vào, ~300–500 ra   |

Ghi nhận khi chạy:

- `cv_be_08` (dev): câu "Integrated third-party REST APIs" chỉ nằm trong mô tả công việc, lần đầu không thành kỹ năng.
  Đã sửa prompt: kỹ năng nhắc trong các gạch đầu dòng công việc / dự án cũng phải đưa vào `skills`.
- Kỹ năng tiếng Việt **không có trong bảng alias** (vd. "Dự báo chuỗi thời gian", "Tổ chức sự kiện", "Kế toán thuế")
  được Gemini dịch sang tên tiếng Anh. Không ảnh hưởng so khớp với JD (mọi kỹ năng của 3 JD đều có trong bảng alias),
  nhưng nếu JD mới có kỹ năng tiếng Việt thì nên thêm alias vào `skills.ts`.
- Kỹ năng ghép như "CRM (HubSpot)" có thể bị tách thành `HubSpot` + "Client Relationship Management".

## Embedding (`embedCv`, `embedJd`, `cosineSimilarity`)

Biểu diễn CV và JD thành vector để đo độ tương đồng nội dung (thành phần `similarity`, 15% điểm ở W2-AI-02).

```ts
import { embedCv, embedJd, cosineSimilarity } from '@hireflow/ai';

const jdVector = await embedJd(ai, job.parsedJd); // number[768], độ dài 1
const cvVector = await embedCv(ai, application.parsedCv);
const cosine = cosineSimilarity(cvVector, jdVector); // 0–1

// Lưu vào cột vector(768): Prisma chưa hỗ trợ kiểu vector nên dùng $executeRaw
await prisma.$executeRaw`UPDATE applications SET embedding = ${JSON.stringify(cvVector)}::vector WHERE id = ${id}`;
```

- **Model:** `models.embedding` của `createAiClient` (biến môi trường `GEMINI_MODEL_EMBEDDING`, gợi ý `gemini-embedding-001`).
- **Cố định:** `taskType = SEMANTIC_SIMILARITY` cho cả CV và JD, `outputDimensionality = 768` (khớp cột `vector(768)`).
  Vector được chuẩn hóa về độ dài 1, nên cosine = tích vô hướng (pgvector: `1 - (a <=> b)`).
- **Văn bản đầu vào** (không dùng text CV thô), cùng bộ nhãn để hai vector so sánh được:
  - CV (`buildCvEmbeddingText`): `Lĩnh vực` (tóm tắt), `Kỹ năng`, `Công việc` (vị trí + công nghệ + mô tả ngắn, tối đa 5), `Dự án` (tối đa 5).
  - JD (`buildJdEmbeddingText`): `Lĩnh vực` (domain), `Kỹ năng` (bắt buộc), `Kỹ năng ưu tiên`, `Công việc` (trách nhiệm).
  - Không đưa tên công ty, trường học, chứng chỉ, ngoại ngữ; không đưa số năm / cấp độ (đã có điểm riêng tính bằng code).
- **Lỗi:** Gemini trả sai số chiều, vector rỗng / toàn 0 → `AiInvalidResponseError`. Text rỗng → `RangeError` (không gọi Gemini).
- Client ghi log thời gian, số chiều, độ dài text; Gemini Developer API không trả số token cho embedding (`tokens=n/a`).

### Kết quả chạy thử (W2-AI-01)

Chạy bằng `npm run try -w packages/ai -- embed [all]`, model `gemini-embedding-001` (văn bản đầu vào lấy từ
`parseCv` / `parseJd` với `gemini-3.5-flash-lite`). Mốc quy đổi chọn **chỉ trên 11 CV tập dev**; cả 30 CV chỉ chạy để xác nhận.

Cosine (min / trung bình / max):

| Nhóm                         | Tập dev (11 CV)            | Cả 30 CV                   |
| ---------------------------- | -------------------------- | -------------------------- |
| QUALIFIED ↔ JD mục tiêu      | 0,898 / 0,907 / 0,922 (4)  | 0,890 / 0,908 / 0,921 (12) |
| BORDERLINE ↔ JD mục tiêu     | 0,880 / 0,894 / 0,913 (4)  | 0,831 / 0,886 / 0,919 (9)  |
| REJECTED ↔ JD mục tiêu       | 0,738 / 0,757 / 0,782 (3)  | 0,732 / 0,759 / 0,781 (9)  |
| CV ↔ JD khác ngành           | 0,715 / 0,758 / 0,790 (22) | 0,717 / 0,769 / 0,841 (60) |
| `labels.csv` "phù hợp"       | 0,898 / 0,908 / 0,922 (5)  | 0,890 / 0,909 / 0,921 (15) |
| `labels.csv` "không phù hợp" | 0,738 / 0,807 / 0,898 (8)  | 0,732 / 0,792 / 0,896 (25) |
| Toàn bộ cặp CV ↔ JD          | 0,715 / 0,793 / 0,922 (33) | 0,717 / 0,798 / 0,921 (90) |

Ghi nhận:

- Cosine **dồn vào khoảng hẹp 0,72–0,92** (hai câu không liên quan backend ↔ marketing vẫn ~0,78),
  nên không dùng thẳng `cosine × 100`.
- Với mỗi JD, CV phù hợp có cosine trung bình cao hơn rõ so với CV ngành khác (30 CV: BE 0,912 vs 0,762;
  DA 0,911 vs 0,779; MKT 0,902 vs 0,765).
- CV REJECTED của bộ dữ liệu phần lớn lệch ngành, nên cosine ngang mức CV ngành khác (~0,73–0,78).
- Embedding phân biệt **đúng ngành / sai ngành**, nhưng **không** phân biệt đủ / thiếu một kỹ năng:
  BORDERLINE gần bằng QUALIFIED, và một số cặp nhãn "không phù hợp" (thiếu kỹ năng bắt buộc) vẫn tới ~0,90.
  Phần đó do điểm kỹ năng và số năm (tính bằng code) đảm nhận.
- Tập dev có khoảng trống sạch 0,79–0,88 giữa cùng ngành và khác ngành; trên 30 CV hai nhóm chồng nhau một chút
  (BORDERLINE thấp nhất 0,831, cặp khác ngành cao nhất 0,841), có thể do ngành gần nhau (Data ↔ Backend).

**Gợi ý quy đổi cho W2-AI-02** (mốc để trong config, chỉnh lại sau W2-AI-04):

```ts
const SIMILARITY_MIN = 0.75; // ≈ mức CV khác ngành / REJECTED
const SIMILARITY_MAX = 0.92; // ≈ mức CV phù hợp cao nhất
similarityScore = clamp(
  ((cosine - SIMILARITY_MIN) / (SIMILARITY_MAX - SIMILARITY_MIN)) * 100,
  0,
  100,
);
```

Trên 30 CV: QUALIFIED ~82–100, BORDERLINE ~48–100, REJECTED ~0–18, khác ngành ~0–54.
Similarity chỉ chiếm 15% nên phần chồng lấn làm lệch điểm tổng tối đa khoảng 8 điểm.

## Scripts

Chạy từ thư mục gốc repo:

| Lệnh                                                                       | Việc                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build -w packages/ai`                                             | Build ra `dist/` (ESM + CJS + `.d.ts`)                                                                                                                                                            |
| `npm run dev -w packages/ai`                                               | Build lại khi sửa code (đã có trong `npm run dev` ở gốc)                                                                                                                                          |
| `npm run test -w packages/ai`                                              | Unit test (không gọi Gemini thật)                                                                                                                                                                 |
| `npm run test:cov -w packages/ai`                                          | Test + độ phủ (báo cáo HTML ở `coverage/`)                                                                                                                                                        |
| `npm run typecheck -w packages/ai`                                         | Kiểm tra kiểu, kể cả kiểu trong test                                                                                                                                                              |
| `npm run try -w packages/ai [-- text\|structured\|jd\|cv]`                 | Chạy thử với Gemini thật (`jd`: `parseJd` trên 3 JD; `cv`: `extractCvText` trên 30 CV + 2 scan, có tự đánh dấu ✓/✗)                                                                               |
| `npm run try -w packages/ai -- cv <tên file>`                              | Như `cv`, in nội dung một CV chỉ định để kiểm tra bằng mắt (mặc định `cv_be_06.pdf`)                                                                                                              |
| `npm run try -w packages/ai -- parse-cv`                                   | `parseCv` trên 11 CV tập dev, in JSON + tự kiểm tra ✓/✗ (dùng để chỉnh prompt)                                                                                                                    |
| `npm run try -w packages/ai -- parse-cv all`                               | `parseCv` trên cả 30 CV, chỉ in kết quả kiểm tra (chỉ để xác nhận, không chỉnh prompt theo tập test)                                                                                              |
| `npm run try -w packages/ai -- parse-cv <tên file>`                        | `parseCv` trên một CV của fixtures, in JSON                                                                                                                                                       |
| `npm run try -w packages/ai -- parse-cv <đường dẫn...> [--jd be\|da\|mkt]` | `parseCv` trên CV tự thêm: file `.pdf` / `.txt` hoặc thư mục chứa chúng. In JSON, kiểm tra schema và email/SĐT/link; `--jd` liệt kê kỹ năng bắt buộc của JD còn thiếu. Ngày tham chiếu là hôm nay |

| `npm run try -w packages/ai -- embed quick` | Kiểm tra nhanh model embedding: 3 câu mẫu, 768 chiều, độ dài 1 |
| `npm run try -w packages/ai -- embed [all]` | `embedJd` 3 JD + `embedCv` 11 CV tập dev (`all`: 30 CV), in bảng cosine và khoảng cosine theo nhóm |

`npm run try` đọc `packages/ai/.env`: copy từ `.env.example` rồi điền `GEMINI_API_KEY` và `GEMINI_MODEL_TEXT` (demo `embed` cần thêm `GEMINI_MODEL_EMBEDDING`).
