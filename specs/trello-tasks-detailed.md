# Tổng hợp Chi tiết Task Trello Dự án AI Resume Screener

## Backlog Week 1 (17 tasks)

### Quy ước mức độ ưu tiên (đọc trước)
**Mô tả:**
Mỗi thẻ ghi mức ưu tiên ở dòng **Ưu tiên:** trong mô tả.

**Bắt buộc**
Thiếu thì hệ thống không chạy được luồng chính hoặc không demo được: HR tạo job → ứng viên nộp CV → AI chấm → HR duyệt → phỏng vấn voice AI → xem kết quả. Làm trước tiên, không được bỏ.

**Nên có**
Quan trọng, làm sản phẩm hoàn chỉnh và thuyết phục hơn, nhưng thiếu thì luồng chính vẫn chạy. Làm sau khi xong hết phần **Bắt buộc** của tuần.

**Có thể có**
Điểm cộng nếu còn thời gian. Bỏ mà không ảnh hưởng gì. Trong mô tả thẻ, các ý nhỏ thuộc mức này được ghi "(**Có thể có**)".

**Không làm**
Đã thống nhất để ngoài phạm vi đồ án lần này. Ghi lại để không ai làm nhầm và để nêu trong phần "**Hướng phát triển**" của báo cáo.

**Cách dùng**

- Đầu mỗi tuần: kéo thẻ **Bắt buộc** vào **In Progress** trước.
- Trễ tiến độ: cắt từ dưới lên (**Có thể có** → **Nên có**), không cắt **Bắt buộc**.

---

### [W1-AI-06] Bộ dữ liệu test: 30 CV giả + 3 JD, nhãn độc lập 2 người, tách tập dev/test
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI (TV1 (FE) hoặc TV2 (BE) gán nhãn thứ hai)
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Bộ dữ liệu chuẩn để kiểm thử pipeline và đo độ chính xác sàng lọc một cách khách quan.

**Tiêu chí hoàn thành**

- 3 JD thuộc 3 vị trí khác nhau, trùng với 3 job trong seed của W1-BE-01
- 30 CV giả, mỗi JD 10 CV, phân bổ:
  - 4 CV phù hợp rõ
  - 3 CV khó (thiếu 1 kỹ năng bắt buộc, kinh nghiệm sát ngưỡng, kỹ năng chuyển đổi từ ngành gần)
  - 3 CV không phù hợp rõ (lệch ngành, thiếu nhiều kỹ năng bắt buộc)
- Đa dạng định dạng: bố cục 1 cột và 2 cột, tiếng Việt và tiếng Anh
- Thêm 2 file ảnh scan riêng để thử nhánh lỗi của W1-AI-02 (không tính vào đánh giá)
- Thông tin cá nhân hoàn toàn giả, không dùng CV thật
- Nhãn: mỗi CV gán với JD mục tiêu, thêm 10 cặp chéo ngẫu nhiên để thử ca lệch hẳn
- Mỗi cặp có: nhãn phù hợp / không phù hợp, lý do 1 câu, kỹ năng bắt buộc còn thiếu
- 2 người gán nhãn độc lập, ghi tỷ lệ đồng thuận, các cặp lệch được thảo luận và chốt
- Tách tập: dev (1/3, dùng để chỉnh prompt) và test (2/3, chỉ dùng để báo cáo ở W2-AI-04), mỗi tập đủ cả 3 loại CV
- (Có thể có) Điểm kỳ vọng 0–100 cho từng cặp
- Lưu tại packages/ai/fixtures, có README mô tả cấu trúc

**Phụ thuộc:** không — dùng cho W1-AI-02/03/04 và W2-AI-04

#### JD:
- [ ] Chọn 3 vị trí khác ngành (VD: Backend Developer, Data Analyst, Digital Marketing)
- [ ] Viết 3 JD đầy đủ: mô tả, kỹ năng bắt buộc, kỹ năng ưu tiên, số năm kinh nghiệm
- [ ] Gửi TV2 (BE) dùng chung cho file seed của W1-BE-01

#### Tạo CV:
- [ ] Lên bảng kế hoạch 30 CV: JD mục tiêu, loại (phù hợp / khó / không phù hợp), điểm đặc biệt
- [ ] Viết nội dung 30 CV (thông tin cá nhân giả)
- [ ] Xuất PDF với nhiều bố cục: ít nhất 8 CV 2 cột, ít nhất 8 CV tiếng Anh
- [ ] Tạo 2 CV dạng ảnh scan (chụp hoặc in ra PDF ảnh)
- [ ] Đặt tên file theo mẫu: cv_be_01.pdf, cv_da_01.pdf, cv_mkt_01.pdf

#### Gán nhãn:
- [ ] Tạo labels.csv: cv_file, jd_id, label, reason, missing_skills, split, (expected_score)
- [ ] Người 1 gán nhãn 30 cặp CV–JD mục tiêu + 10 cặp chéo
- [ ] Người 2 gán nhãn độc lập, không xem nhãn của người 1
- [ ] Đối chiếu, tính tỷ lệ đồng thuận, ghi vào README
- [ ] Thảo luận và chốt nhãn cho các cặp lệch

#### Tách tập + bàn giao:
- [ ] Chia dev / test theo tỷ lệ 1/3 – 2/3, mỗi tập đủ 3 loại CV cho cả 3 JD
- [ ] Ghi cột split trong labels.csv
- [ ] Viết packages/ai/fixtures/README.md: cấu trúc thư mục, ý nghĩa các cột, quy tắc chỉ dùng tập dev khi chỉnh prompt
- [ ] Push nhánh feat/W1-AI-06, tạo Pull Request

---

### [W1-BE-01] Cấu hình apps/api: Prisma, PostgreSQL + pgvector (Docker), thiết kế schema toàn hệ thống
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Từ khung NestJS trống (tạo ở W1-00), dựng tầng dữ liệu và thiết kế schema đủ cho cả 3 tuần, tránh đổi schema lớn về sau.

**Tiêu chí hoàn thành**

- PostgreSQL 16 + pgvector chạy local bằng Docker (docker-compose.yml ở thư mục gốc)
- Prisma kết nối DB, migration đầu tiên bật extension vector
- PrismaModule / PrismaService dùng chung toàn app
- ConfigModule đọc .env, báo lỗi khi thiếu biến bắt buộc
- Schema gồm các bảng:
  - User (email, passwordHash, fullName, role: HR | CANDIDATE)
  - RefreshToken (userId, tokenHash unique, expiresAt, revokedAt, userAgent, createdAt)
  - Job (JD, ParsedJd dạng JSON, cấu hình: cvPassThreshold, interviewQuestionCount, trọng số rubric, embedding, createdById)
  - Application (job, ứng viên, cvUrl, cvPublicId, cvText, ParsedCv dạng JSON, status, screeningError, aiRecommendation, hrDecisionBy, hrDecisionAt, hrNote, embedding)
  - ScreeningResult (1-1 với Application: điểm tổng, điểm thành phần, điểm mạnh, kỹ năng thiếu, trích dẫn, thời gian xử lý)
  - ApplicationStatusHistory (từ trạng thái, sang trạng thái, ai đổi, lúc nào)
  - Interview (1-1 với Application: recordingConsentAt, startedAt, completedAt, transcriptUrl, evaluationError)
  - InterviewTurn (thứ tự, câu hỏi, loại câu, kỹ năng nhắm tới, câu trả lời, nguồn VOICE | TEXT, transcriptEdited, audioUrl, answeredAt)
  - InterviewResult (1-1 với Interview: điểm 3 tiêu chí, điểm tổng, nhận xét, bằng chứng, aiRecommendation, phản hồi cho ứng viên, decisionBy, decisionAt, decisionNote)
- Enum ApplicationStatus: SUBMITTED, SCREENING, SCREENING_FAILED, SCREENED, SHORTLISTED, REJECTED, INTERVIEW_INVITED, INTERVIEWING, EVALUATED, PASSED, FAILED
- Cột embedding khai báo `Unsupported("vector(768)")`; thống nhất với TV3 gọi Gemini Embedding với outputDimensionality = 768
- Sơ đồ ERD lưu trong repo (docs/erd.png)
- Seed: 1 HR, 2 ứng viên, 3 job (3 job trùng với 3 JD của W1-AI-06)

**Phụ thuộc:** W1-00

#### Database local:
- [ ] Tạo docker-compose.yml dùng image pgvector/pgvector:pg16 và postgresql (Sử dụng version 16)
- [ ] Thêm DATABASE_URL vào apps/api/.env và .env.example
- [ ] Chạy docker compose up -d, kết nối thử bằng navicat
- [ ] Ghi lệnh khởi động DB vào README

#### Prisma + cấu hình NestJS:
- [ ] Cài prisma và @prisma/client trong apps/api
- [ ] Chạy npx prisma init
- [ ] Cài @nestjs/config, validate biến môi trường khi khởi động
- [ ] Tạo PrismaModule (global) và PrismaService
- [ ] Thêm script: db:migrate, db:seed, db:studio vào package.json của apps/api

#### Thiết kế schema:
- [ ] Vẽ ERD toàn hệ thống, cho TV1 (FE) và TV3 (AI) xem trước khi code
- [ ] Khai báo enum Role, ApplicationStatus, AiRecommendation, AnswerSource
- [ ] Viết model User, Job, Application
- [ ] Viết model ScreeningResult, ApplicationStatusHistory
- [ ] Viết model Interview, InterviewTurn, InterviewResult
- [ ] Khai báo cột embedding: Unsupported("vector(768)") cho Job và Application
- [ ] Thêm unique (jobId, candidateId) cho Application để chặn nộp trùng
- [ ] Thêm index cho các cột hay lọc: Application.status, Application.jobId
- [ ] Viết model RefreshToken (userId, tokenHash unique, expiresAt, revokedAt, userAgent, createdAt)

#### Migration + seed:
- [ ] Tạo migration đầu tiên, thêm CREATE EXTENSION IF NOT EXISTS vector vào đầu file SQL
- [ ] Chạy migrate, kiểm tra đủ bảng trong DB
- [ ] Viết prisma/seed.ts: 1 HR, 2 ứng viên, 3 job (mật khẩu đã băm)
- [ ] Thử ghi và đọc 1 vector bằng $executeRaw / $queryRaw, xác nhận chạy được

#### Chốt:
- [ ] Xuất ERD vào docs/erd.png
- [ ] Thống nhất với TV3 (AI): số chiều embedding 768, schema ParsedCv và ParsedJd lưu dạng JSON
- [ ] Push nhánh feat/W1-BE-01, tạo Pull Request

---

### [W1-FE-01] Cấu hình apps/web: Tailwind CSS, shadcn/ui, React Router, alias, biến môi trường
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Biến khung Vite trống (tạo ở W1-00) thành nền tảng frontend sẵn sàng để làm các trang.

**Tiêu chí hoàn thành**

- Tailwind CSS hoạt động, có class thử hiển thị đúng
- shadcn/ui đã khởi tạo, có ít nhất Button, Input, Card, Label, Form, Toast
- React Router với các route khung: `/login`, `/register`, `/hr/*`, `/candidate/*`, trang 404
- Alias `@/` trỏ tới `src/` (dùng được trong cả Vite và TypeScript)
- File .env.example của apps/web có `API_PROXY_TARGET` (đích của Vite proxy, cấu hình ở W1-FE-06); FE luôn gọi đường dẫn tương đối /api, không cần biến VITE_API_URL
- Cấu trúc thư mục `src/` thống nhất (pages, components, lib, hooks, api)
- `npm run dev -w apps/web` và `npm run build -w apps/web` chạy không lỗi

**Phụ thuộc:** W1-00

#### Dọn khung Vite:
- [ ] Xóa code mẫu của Vite (App.css, logo, counter)
- [ ] Đặt title và favicon cho trang
- [ ] Tạo cấu trúc thư mục src/: pages, components, components/ui, lib, hooks, api, routes

#### Tailwind CSS + alias:
- [ ] Cài Tailwind CSS cho Vite theo hướng dẫn chính thức
- [ ] Import Tailwind vào src/index.css
- [ ] Cấu hình alias @/ → src/ trong vite.config.ts
- [ ] Cấu hình paths "@/*" trong tsconfig (tsconfig.json và tsconfig.app.json)
- [ ] Thử 1 class Tailwind trên trang chủ, hiển thị đúng

#### shadcn/ui:
- [ ] Chạy npx shadcn@latest init trong apps/web
- [ ] Chọn màu chủ đạo, xác nhận components.json dùng alias @/
- [ ] Thêm các component: button, input, card, label, form, sonner (toast)
- [ ] Tạo trang thử hiển thị đủ các component trên

#### React Router:
- [ ] Cài react-router-dom
- [ ] Tạo file routes với các route: /login, /register, /hr/*, /candidate/*
- [ ] Tạo trang placeholder cho từng route (chỉ hiện tiêu đề)
- [ ] Thêm trang 404 cho route không tồn tại
- [ ] Chuyển hướng / → /login

#### Biến môi trường + kiểm tra:
- [ ] Tạo apps/web/.env từ .env.example, đặt API_PROXY_TARGET=http://localhost:3000
- [ ] Ghi chú trong README: FE gọi đường dẫn tương đối /api, Vite proxy cấu hình ở W1-FE-06
- [ ] Chạy npm run dev -w apps/web: mọi route mở được
- [ ] Chạy npm run build -w apps/web: build không lỗi
- [ ] Push nhánh feat/W1-FE-01, tạo Pull Request

---

### [W1-BE-02] API contract: format response chung, DTO + validation, Swagger cho Auth, Jobs, Applications
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD — **làm ngay đầu tuần**, chặn W1-FE-06

**Mục tiêu**
Chốt hợp đồng API giữa FE và BE trước khi viết logic, để FE mock theo Swagger và làm song song.

**Tiêu chí hoàn thành**

- Quy ước chung toàn API:
  - Prefix /api
  - Response thành công: { data } (danh sách có thêm meta: page, limit, total)
  - Response lỗi: { statusCode, message, errors? } (errors là danh sách lỗi validation theo field)
  - Áp dụng bằng TransformInterceptor + HttpExceptionFilter toàn cục
- ValidationPipe toàn cục (whitelist, transform)
- Controller khung (chưa có logic) + DTO request và response cho:
  - Auth: register, login, me, refresh, logout
  - Jobs: danh sách công khai, chi tiết, job của HR (GET /jobs/mine), tạo, sửa, đóng tin
  - Applications: nộp CV (multipart), danh sách hồ sơ của tôi
- Mọi DTO có `@ApiProperty()` kèm example để Apidog mock ra dữ liệu thật
- Swagger tại /api/docs, có Bearer auth, endpoint upload khai báo multipart/form-data
- File openapi.json xuất vào repo; Apidog import từ /api/docs-json
- Danh sách endpoint phác thảo cho Screening, Dashboard, Interview (chỉ method + path + mô tả 1 dòng), chốt chi tiết đầu tuần 2 và 3
- (Có thể có) Sinh type TypeScript cho FE từ openapi.json bằng openapi-typescript

**Phụ thuộc:** W1-00; dùng enum từ W1-BE-01 (có thể làm song song)

#### Quy ước chung:
- [ ] Cài @nestjs/swagger, class-validator, class-transformer
- [ ] Đặt global prefix /api trong main.ts
- [ ] Bật ValidationPipe toàn cục (whitelist: true, transform: true)
- [ ] Viết TransformInterceptor bọc response thành { data } (kèm meta khi phân trang)
- [ ] Viết HttpExceptionFilter trả lỗi { statusCode, message, errors? }
- [ ] Tạo PaginationQueryDto (page, limit) và PaginatedResponseDto dùng chung
- [ ] Ghi quy ước response/lỗi vào docs/api-convention.md cho TV1 (FE) đọc

#### Swagger:
- [ ] Cấu hình SwaggerModule tại /api/docs, thêm addBearerAuth()
- [ ] Bật endpoint /api/docs-json
- [ ] Viết script xuất openapi.json vào repo (chạy khi start ở môi trường dev)

#### Module Auth (khung):
- [ ] RegisterDto, LoginDto (validate email, độ dài mật khẩu, role)
- [ ] AuthResponseDto (accessToken, user), UserDto
- [ ] Controller khung: POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/refresh, POST /auth/logout

#### Module Jobs (khung):
- [ ] CreateJobDto, UpdateJobDto (gồm cvPassThreshold, interviewQuestionCount, trọng số rubric)
- [ ] JobDto, JobListQueryDto (tìm theo tên, trạng thái, phân trang)
- [ ] Controller khung: GET /jobs, GET /jobs/:id, GET /jobs/mine, POST /jobs, PATCH /jobs/:id, PATCH /jobs/:id/close

#### Module Applications (khung):
- [ ] ApplicationDto (status, cvUrl, job, ngày nộp)
- [ ] Controller khung: POST /jobs/:id/applications (multipart, field file), GET /me/applications
- [ ] Khai báo `@ApiConsumes('multipart/form-data')` và `@ApiBody()` cho endpoint upload

#### Phác thảo tuần 2–3 + bàn giao:
- [ ] Liệt kê endpoint dự kiến cho Screening, Dashboard, Interview vào docs/api-convention.md
- [ ] Import /api/docs-json vào Apidog, bật mock, gửi URL mock cho TV1
- [ ] Ngồi cùng TV1 xem Swagger, chốt tên field trước khi FE mock
- [ ] Push nhánh feat/W1-BE-02, tạo Pull Request

---

### [W1-FE-02] Layout chung: HR (sidebar + header), Ứng viên (header + footer), phân luồng route theo vai trò
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Khung giao diện cho hai nhóm người dùng, để các trang sau chỉ cần gắn nội dung vào.

**Tiêu chí hoàn thành**

- HrLayout: sidebar (Tin tuyển dụng, Ứng viên, Thống kê), header (tên người dùng, nút đăng xuất), vùng nội dung
- CandidateLayout: header (Việc làm, Hồ sơ của tôi, đăng xuất), vùng nội dung, footer
- AuthLayout cho /login, /register: căn giữa, không sidebar
- Route /hr/\* dùng HrLayout, /candidate/\* dùng CandidateLayout (nested routes + Outlet)
- Vai trò lấy tạm từ mock user; phần đọc từ token làm ở W1-FE-03
- Mobile: sidebar thu gọn thành menu mở bằng nút
- Menu đang chọn được highlight

**Phụ thuộc:** W1-FE-01

#### Dựng layout:
- [ ] Tạo components/layout/HrLayout.tsx (sidebar + header + Outlet)
- [ ] Tạo components/layout/CandidateLayout.tsx (header + Outlet + footer)
- [ ] Tạo components/layout/AuthLayout.tsx (khung căn giữa cho login/register)
- [ ] Tách Sidebar, Header, Footer thành component riêng

#### Gắn vào router:
- [ ] Bọc /hr/* bằng HrLayout, thêm route con: /hr/jobs, /hr/candidates, /hr/stats
- [ ] Bọc /candidate/* bằng CandidateLayout, thêm route con: /candidate/jobs, /candidate/applications
- [ ] Bọc /login, /register bằng AuthLayout
- [ ] Tạo trang placeholder cho từng route con

#### Điều hướng:
- [ ] Dùng NavLink để highlight menu đang chọn
- [ ] Tạo mock user (tên, role) trong src/lib/mockUser.ts
- [ ] Header hiển thị tên từ mock user
- [ ] Nút đăng xuất tạm thời chuyển về /login

#### Responsive + kiểm tra:
- [ ] Sidebar ẩn trên mobile, mở bằng nút menu (dùng Sheet của shadcn/ui)
- [ ] Kiểm tra giao diện ở 3 cỡ: mobile (375px), tablet (768px), desktop (1280px)
- [ ] Bấm qua mọi menu của HR và Ứng viên, không lỗi
- [ ] Push nhánh feat/W1-FE-02, tạo Pull Request

---

### [W1-AI-01] Cấu hình packages/ai: build bằng tsdown cho NestJS import, client Gemini, retry, timeout, logging, hàm sinh JSON dùng chung
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Từ khung packages/ai (tạo ở W1-00), dựng nền tảng gọi Gemini ổn định, an toàn, dùng chung cho mọi tính năng AI. (Gộp nội dung thẻ W1-AI-05 đã lưu trữ: retry 429 + logging.)

**Tiêu chí hoàn thành**

- Build bằng tsdown ra dist/ (khai báo rõ format cjs + esm, kèm file .d.ts); apps/api import được `@hireflow/ai` không lỗi
- Script dev chạy chế độ watch để BE thấy thay đổi ngay
- Hàm khởi tạo createAiClient({ apiKey, models, logger? }); package không tự đọc process.env
- Tên model tách theo mục đích (text, embedding, audio), BE truyền vào từ biến môi trường
- Retry với exponential backoff + jitter, tối đa 3 lần, chỉ cho lỗi 429, 500, 503 và timeout; không retry lỗi 400
- Timeout cho mỗi request (mặc định 30s, cấu hình được)
- Lớp lỗi riêng: AiRateLimitError, AiTimeoutError, AiInvalidResponseError để BE trả mã lỗi phù hợp
- Logging qua logger truyền vào (mặc định console): tên hàm, model, thời gian xử lý, token dùng, số lần retry, lỗi
- Log không ghi nội dung CV, transcript, prompt đầy đủ hay API key
- Hàm generateStructured(prompt, zodSchema): gọi Gemini với structured output, validate Zod, sai schema thì retry 1 lần, vẫn sai thì ném AiInvalidResponseError
- Script chạy thử: npm run try -w packages/ai
- Unit test cho logic retry (mock client, không gọi Gemini thật)

**Phụ thuộc:** W1-00

#### Build package:
- [ ] Cài tsdown (yêu cầu Node ≥ 20.19)
- [ ] Tạo tsdown.config.ts: entry src/index.ts, format ['cjs', 'esm'], dts: true
- [ ] Khai báo main, module, types, exports trong packages/ai/package.json
- [ ] Thêm script build (tsdown) và dev (tsdown --watch)
- [ ] Import thử @hireflow/ai trong apps/api, chạy NestJS không lỗi
- [ ] Thêm build packages/ai vào script dev ở gốc (chạy trước api)

#### Client Gemini:
- [ ] Cài @google/genai và zod
- [ ] Viết createAiClient({ apiKey, models, logger, timeoutMs })
- [ ] Định nghĩa type AiModels { text, embedding, audio }
- [ ] Thêm GEMINI_API_KEY, GEMINI_MODEL_TEXT, GEMINI_MODEL_EMBEDDING, GEMINI_MODEL_AUDIO vào apps/api/.env.example
- [ ] Kiểm tra API key chỉ nằm ở backend, không bao giờ đưa lên frontend

#### Retry, timeout, lỗi:
- [ ] Viết hàm withRetry: backoff 1s → 2s → 4s kèm jitter, tối đa 3 lần
- [ ] Chỉ retry 429, 500, 503, timeout; lỗi 400 ném ngay
- [ ] Thêm timeout cho mỗi request (AbortController)
- [ ] Tạo lớp lỗi AiRateLimitError, AiTimeoutError, AiInvalidResponseError

#### Logging:
- [ ] Định nghĩa interface AiLogger (info, warn, error), mặc định dùng console
- [ ] Log mỗi lần gọi: hàm, model, thời gian, token (từ usageMetadata), số lần retry
- [ ] Kiểm tra log không chứa nội dung CV, prompt đầy đủ hay API key

#### Hàm sinh JSON dùng chung:
- [ ] Viết generateStructured(prompt, zodSchema, options)
- [ ] Chuyển Zod schema sang responseSchema cho Gemini
- [ ] Validate kết quả bằng Zod, sai thì retry 1 lần với thông báo lỗi kèm theo
- [ ] Vẫn sai thì ném AiInvalidResponseError
- [ ] Thử với 1 schema đơn giản (VD: trích tên + email từ một đoạn text)

#### Kiểm tra + bàn giao:
- [ ] Cài vitest, viết test cho withRetry (429 thì retry, 400 thì không, quá 3 lần thì ném lỗi)
- [ ] Viết scripts/try.ts gọi thử Gemini 1 câu, chạy bằng npm run try -w packages/ai
- [ ] Viết packages/ai/README.md: cách khởi tạo client, danh sách hàm, biến môi trường
- [ ] Ghi giới hạn quota của gói Gemini đang dùng vào README để cả nhóm biết
- [ ] Push nhánh feat/W1-AI-01, tạo Pull Request

---

### [W1-BE-03] Module Auth: đăng ký, đăng nhập, JWT, guard toàn cục, @Public(), @Roles(), @CurrentUser()
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Xác thực người dùng và phân quyền theo vai trò, làm nền cho mọi module khác.

**Tiêu chí hoàn thành**

- POST /auth/register: chọn vai trò HR hoặc CANDIDATE (chỉ nhận 2 giá trị này), email chuyển chữ thường, email trùng trả 409
- POST /auth/login: trả accessToken + thông tin user; sai email hoặc mật khẩu trả 401 với thông báo chung
- GET /auth/me: trả thông tin người dùng hiện tại
- Mật khẩu băm bằng bcryptjs; không bao giờ trả passwordHash trong response
- Access token (JWT): payload { sub, email, role }, hết hạn 15 phút, trả trong body response; FE chỉ giữ trong bộ nhớ, không lưu localStorage
- Refresh token: chuỗi ngẫu nhiên 64 byte, hết hạn 7 ngày, gửi qua cookie
  - Cookie: tên refresh_token, httpOnly, secure (bật khi chạy HTTPS), sameSite lax, path /api/auth
  - DB chỉ lưu bản băm SHA-256 trong bảng RefreshToken (userId, tokenHash, expiresAt, revokedAt, userAgent)
- Login và register trả access token trong body, đồng thời đặt cookie refresh token
- POST /auth/refresh: đọc cookie, kiểm tra token còn hạn và chưa thu hồi, thu hồi token cũ, cấp access token mới + refresh token mới (rotation)
- POST /auth/logout: thu hồi refresh token hiện tại, xóa cookie
- Biến môi trường: JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN=15m, REFRESH_TOKEN_EXPIRES_DAYS=7, COOKIE_SECURE
- (Có thể có) Phát hiện dùng lại refresh token đã thu hồi thì thu hồi toàn bộ phiên của user đó
- JwtAuthGuard bật toàn cục; decorator `@Public()` cho route không cần đăng nhập
- RolesGuard + decorator `@Roles('HR' | 'CANDIDATE')`; sai vai trò trả 403
- Decorator `@CurrentUser()` lấy user từ request cho các module khác dùng
- Hàm kiểm tra token tách riêng để InterviewGateway (W3-BE-01) dùng lại
- Swagger: đánh dấu `@ApiBearerAuth()` cho route cần đăng nhập
- Kiểm tra quyền sở hữu dữ liệu (job của HR nào, hồ sơ của ai) làm ở W1-BE-04 và W1-BE-05

**Phụ thuộc:** W1-BE-01, W1-BE-02

#### Cài đặt:
- [ ] Cài @nestjs/jwt, @nestjs/passport, passport, passport-jwt, bcryptjs
- [ ] Thêm JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN=15m, REFRESH_TOKEN_EXPIRES_DAYS=7, COOKIE_SECURE vào apps/api/.env.example
- [ ] Tạo AuthModule, UsersModule (UsersService: tìm theo email, theo id, tạo user)

#### Đăng ký, đăng nhập:
- [ ] POST /auth/register: validate DTO, chuyển email thành chữ thường, băm mật khẩu
- [ ] Email đã tồn tại thì trả 409 Conflict
- [ ] POST /auth/login: so sánh mật khẩu, ký JWT { sub, email, role }
- [ ] Sai email hoặc mật khẩu đều trả 401 "Email hoặc mật khẩu không đúng"
- [ ] GET /auth/me trả user hiện tại
- [ ] Loại bỏ passwordHash khỏi mọi response (UserDto hoặc select của Prisma)

#### Guard và decorator:
- [ ] Viết JwtStrategy đọc token từ header Authorization: Bearer
- [ ] Đăng ký JwtAuthGuard làm guard toàn cục (APP_GUARD)
- [ ] Viết decorator `@Public()`, gắn cho register, login, GET /jobs, GET /jobs/:id
- [ ] Viết RolesGuard + decorator `@Roles()`
- [ ] Viết decorator `@CurrentUser()`
- [ ] Tách hàm verifyToken() trong AuthService để WebSocket dùng lại

#### Kiểm tra:
- [ ] Thêm `@ApiBearerAuth()` cho các controller cần đăng nhập
- [ ] Test qua Swagger: đăng ký, đăng nhập, gọi /auth/me với token
- [ ] Gọi route cần đăng nhập không có token → 401
- [ ] Ứng viên gọi route chỉ dành cho HR → 403
- [ ] Kiểm tra response không có passwordHash
- [ ] (Có thể có) Viết unit test cho AuthService: đăng ký trùng email, đăng nhập sai mật khẩu
- [ ] Push nhánh feat/W1-BE-03, tạo Pull Request

#### Refresh token:
- [ ] Cài cookie-parser, bật trong main.ts
- [ ] Bật CORS với origin cụ thể của FE và credentials: true
- [ ] Viết hàm tạo refresh token (crypto.randomBytes) và băm SHA-256
- [ ] Login và register: lưu bản băm vào bảng RefreshToken, đặt cookie refresh_token
- [ ] POST /auth/refresh: kiểm tra token, thu hồi token cũ, cấp cặp token mới
- [ ] POST /auth/logout: thu hồi token, xóa cookie
- [ ] Gắn `@Public()` cho /auth/refresh và /auth/logout (vì access token có thể đã hết hạn)
- [ ] Test: access token hết hạn → gọi refresh → nhận token mới → gọi lại API thành công
- [ ] Test: dùng lại refresh token cũ sau khi đã refresh → bị từ chối 401
- [ ] Test: logout xong gọi refresh → 401

---

### [W1-FE-06] Tầng gọi API: axios client, refresh token tự động, TanStack Query, mock Apidog qua Vite proxy
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Tầng gọi API dùng chung, để FE làm trước khi BE xong và đổi giữa mock và API thật chỉ bằng biến môi trường.

**Tiêu chí hoàn thành**

- Mọi request gọi đường dẫn tương đối /api (cùng domain, để cookie refresh token hoạt động)
  - Khi dev: Vite proxy /api → API_PROXY_TARGET (BE local hoặc URL mock Apidog); proxy thêm /socket.io (ws: true) → BE local để dùng ở tuần 3
  - Khi deploy: Caddy chuyển /api và /socket.io vào BE cùng domain (W3-FE-05)
- axios client: baseURL /api, timeout 15s, withCredentials: true
- tokenStore giữ access token trong bộ nhớ (không dùng localStorage); interceptor request gắn header Authorization: Bearer
- Interceptor response xử lý 401:
  - Gọi POST /auth/refresh, nhận access token mới, gửi lại request ban đầu
  - Nhiều request cùng bị 401 thì chỉ refresh một lần, các request khác xếp hàng chờ
  - Refresh thất bại → xóa token, chuyển về /login
  - Không refresh lại khi chính /auth/login, /auth/refresh bị lỗi (tránh lặp vô hạn)
- Đọc đúng format response của W1-BE-02: { data, meta? } và lỗi { statusCode, message, errors? }
- Lỗi chung hiện toast; lỗi validation (errors) gắn vào từng ô form qua hàm hỗ trợ cho react-hook-form
- TanStack Query: QueryClient (không retry lỗi 4xx, retry 1 lần lỗi mạng/5xx, staleTime 30s, tắt refetch khi focus lại cửa sổ), Devtools chỉ bật khi dev
- Query key theo module (auth, jobs, applications, interviews)
- Hàm gọi API tách theo module trong src/api/ (auth, jobs, applications)
- Hàm upload hỗ trợ báo tiến trình (onUploadProgress) cho W1-FE-05
- Mock: Apidog mock sinh từ Swagger của W1-BE-02
- (Có thể có) MSW cho các ca Apidog không giả lập được (401 để thử refresh, response chậm)

**Phụ thuộc:** W1-FE-01, W1-BE-02 (Swagger); luồng refresh thật cần W1-BE-03

#### Chốt API với BE:
- [ ] Hẹn TV2 (BE) chốt Swagger cho Auth, Jobs, Applications
- [ ] Import /api/docs-json vào Apidog, bật mock, lấy URL mock
- [ ] Thống nhất tên cookie (refresh_token) và đường dẫn /api/auth/refresh với TV2 (BE)

#### Proxy + biến môi trường:
- [ ] Cấu hình server.proxy trong vite.config.ts: /api → API_PROXY_TARGET (đọc bằng loadEnv); /socket.io → http://localhost:3000 với ws: true
- [ ] Nếu dùng mock Apidog: thêm rewrite path cho khớp prefix của URL mock
- [ ] Thêm vào apps/web/.env.example: API_PROXY_TARGET=http://localhost:3000 (kèm dòng comment URL mock Apidog)
- [ ] Thử đổi API_PROXY_TARGET giữa BE local và Apidog, gọi /api/jobs đều chạy

#### axios client + token:
- [ ] Cài axios
- [ ] Tạo src/lib/tokenStore.ts: get, set, clear access token trong bộ nhớ
- [ ] Tạo src/lib/axios.ts: baseURL /api, timeout 15s, withCredentials: true
- [ ] Interceptor request: gắn Authorization: Bearer từ tokenStore
- [ ] Tạo type ApiResponse<T>, PaginatedResponse<T>, ApiError khớp format BE

#### Tự động refresh token:
- [ ] Interceptor 401: gọi POST /auth/refresh, cập nhật tokenStore, gửi lại request
- [ ] Dùng một promise refresh chung để nhiều request 401 chỉ refresh một lần
- [ ] Bỏ qua refresh khi request lỗi là /auth/login, /auth/register, /auth/refresh
- [ ] Refresh thất bại: clear tokenStore, chuyển về /login
- [ ] Export hàm refreshSession() để W1-FE-03 gọi khi mở lại trang

#### Xử lý lỗi:
- [ ] Lỗi mạng, 5xx, 403: hiện toast (sonner) với message từ BE
- [ ] Viết hàm applyFieldErrors(errors, setError) gắn lỗi validation vào form
- [ ] Thông báo mặc định tiếng Việt khi BE không trả message

#### TanStack Query + hàm gọi API:
- [ ] Cài @tanstack/react-query và @tanstack/react-query-devtools
- [ ] Tạo QueryClient với cấu hình retry, staleTime, refetchOnWindowFocus: false
- [ ] Bọc App bằng QueryClientProvider, Devtools chỉ khi import.meta.env.DEV
- [ ] Tạo src/api/queryKeys.ts theo module
- [ ] Tạo src/api/auth.ts: register, login, logout, refresh, getMe
- [ ] Tạo src/api/jobs.ts: getJobs, getJob, createJob, updateJob, closeJob
- [ ] Tạo src/api/applications.ts: applyJob (multipart, kèm onUploadProgress), getMyApplications
- [ ] Viết hook mẫu useJobs() (useQuery) và useCreateJob() (useMutation, invalidate jobs)

#### Kiểm tra + bàn giao:
- [ ] Với mock Apidog: useJobs() hiển thị được danh sách
- [ ] Giả lỗi 400: lỗi hiện đúng dưới ô form
- [ ] Giả lỗi 500: hiện toast
- [ ] Với BE thật (khi W1-BE-03 xong): token hết hạn → tự refresh → request chạy lại thành công
- [ ] Refresh thất bại → về /login, không lặp vô hạn
- [ ] Viết hướng dẫn đổi mock/thật vào README của apps/web
- [ ] Push nhánh feat/W1-FE-06, tạo Pull Request

---

### [W1-AI-02] Trích text từ CV PDF bằng unpdf: chuẩn hóa tiếng Việt, phát hiện ảnh scan, mã lỗi rõ ràng
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Lấy text sạch, đúng tiếng Việt từ file CV PDF để đưa vào bước phân tích (W1-AI-03).

**Tiêu chí hoàn thành**

- Hàm extractCvText(data: Uint8Array, options?) dùng unpdf, không tự tải file qua mạng
- Trả về { text, pageCount, charCount, truncated }
- Làm sạch text:
  - Chuẩn hóa Unicode về NFC (sửa dấu tiếng Việt bị tách rời)
  - Gộp khoảng trắng thừa, giữ xuống dòng giữa các đoạn
  - Bỏ ký tự điều khiển và ký tự lỗi
- Giới hạn: tối đa 10 trang, text dài quá 20.000 ký tự thì cắt và đánh dấu truncated
- Lớp lỗi CvExtractionError với mã:
  - EMPTY: không có text
  - SCANNED: trung bình dưới 100 ký tự mỗi trang (nhiều khả năng là ảnh scan)
  - ENCRYPTED: file có mật khẩu
  - CORRUPTED: file hỏng, không đọc được
  - TOO\_MANY\_PAGES: vượt giới hạn số trang
- Không ghi nội dung CV vào log, chỉ log số trang, số ký tự, mã lỗi, thời gian xử lý
- apps/api gọi được hàm này từ bản build CommonJS của package
- Chạy thử trên toàn bộ 30 CV + 2 file scan của W1-AI-06; kiểm tra bằng mắt CV 2 cột và CV tiếng Việt
- (Có thể có) Với lỗi SCANNED: gửi thẳng file PDF cho Gemini đọc làm phương án dự phòng (dùng client của W1-AI-01)

**Phụ thuộc:** W1-AI-01, W1-AI-06

#### Cài đặt:
- [ ] Cài unpdf trong packages/ai
- [ ] Gọi thử extractText của unpdf với 1 file CV mẫu
- [ ] Build package, gọi thử từ apps/api; nếu lỗi do unpdf chỉ hỗ trợ ESM thì cấu hình tsdown đóng gói unpdf vào dist

#### Hàm trích text:
- [ ] Viết extractCvText(data: Uint8Array, options?) trong src/cv/extract.ts
- [ ] Trả về { text, pageCount, charCount, truncated }
- [ ] Chặn file quá 10 trang (TOO_MANY_PAGES)
- [ ] Cắt text vượt 20.000 ký tự, đặt truncated: true

#### Làm sạch text:
- [ ] Chuẩn hóa text.normalize('NFC')
- [ ] Gộp nhiều khoảng trắng liên tiếp thành 1, giữ dòng trống giữa các đoạn
- [ ] Xóa ký tự điều khiển và ký tự thay thế lỗi (U+FFFD)
- [ ] Thử với 1 CV tiếng Việt: tìm chuỗi "kinh nghiệm" trong text phải thấy

#### Xử lý lỗi:
- [ ] Tạo lớp CvExtractionError với mã EMPTY, SCANNED, ENCRYPTED, CORRUPTED, TOO_MANY_PAGES
- [ ] Bắt lỗi file có mật khẩu → ENCRYPTED
- [ ] Bắt lỗi file hỏng → CORRUPTED
- [ ] Tính số ký tự trung bình mỗi trang, dưới 100 → SCANNED
- [ ] Export lớp lỗi để BE trả thông báo phù hợp cho ứng viên

#### Kiểm thử trên bộ dữ liệu:
- [ ] Viết script chạy extractCvText trên toàn bộ fixtures/cvs và fixtures/cvs_scanned
- [ ] Xuất báo cáo: tên file, số trang, số ký tự, mã lỗi (nếu có)
- [ ] Kiểm tra 2 file scan đều trả SCANNED
- [ ] Đọc bằng mắt ít nhất 3 CV 2 cột: ghi lại text có bị trộn cột không
- [ ] Đọc bằng mắt ít nhất 3 CV tiếng Việt: dấu hiển thị đúng
- [ ] Viết unit test (vitest) cho hàm làm sạch text và các mã lỗi

#### Bàn giao:
- [ ] Cập nhật packages/ai/README.md: cách gọi hàm, các mã lỗi, giới hạn
- [ ] Ghi kết quả kiểm tra CV 2 cột vào README (để W1-AI-03 biết cần xử lý)
- [ ] Push nhánh feat/W1-AI-02, tạo Pull Request

---

### [W1-FE-03] Đăng ký, đăng nhập, khôi phục phiên, ProtectedRoute theo vai trò
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Người dùng đăng ký, đăng nhập, giữ phiên khi tải lại trang, và chỉ vào được khu vực đúng vai trò.

**Tiêu chí hoàn thành**
- Form đăng ký: họ tên, email, mật khẩu, nhập lại mật khẩu, chọn vai trò HR / Ứng viên; validate bằng Zod + react-hook-form
- Form đăng nhập: email, mật khẩu
- Lỗi từ BE: email đã tồn tại (409) hiện dưới ô email; sai thông tin (401) hiện thông báo chung; lỗi validation gắn vào từng ô (applyFieldErrors của W1-FE-06)
- AuthProvider: lưu user hiện tại; access token để trong tokenStore (bộ nhớ)
- Mở lại hoặc tải lại trang: gọi refreshSession() rồi getMe(); hiện màn hình chờ đến khi xong, không nháy sang trang đăng nhập
- Đăng nhập thành công: chuyển HR → /hr/jobs, Ứng viên → /candidate/jobs
- ProtectedRoute theo vai trò: chưa đăng nhập → /login; sai vai trò → về trang chủ của vai trò mình
- Đã đăng nhập mà vào /login hoặc /register → chuyển về trang chủ của vai trò
- Đăng xuất: gọi POST /auth/logout, xóa tokenStore, xóa cache TanStack Query, về /login
- Bỏ mock user của W1-FE-02, header hiện tên user thật
- (Có thể có) Sau đăng nhập quay lại đúng trang người dùng định vào trước đó

**Phụ thuộc:** W1-FE-02, W1-FE-06; API thật ở W1-BE-03

#### 1. Form:
- [ ] Tạo schema Zod cho đăng ký (mật khẩu tối thiểu 8 ký tự, nhập lại khớp) và đăng nhập
- [ ] Trang /register: form + chọn vai trò (RadioGroup của shadcn/ui)
- [ ] Trang /login: form + link sang đăng ký
- [ ] Nút submit hiện trạng thái đang xử lý, chặn bấm nhiều lần

#### 2. Gọi API + xử lý lỗi:
- [ ] Dùng useMutation cho login và register
- [ ] Thành công: lưu access token vào tokenStore, lưu user vào AuthProvider
- [ ] Lỗi 409: hiện "Email đã được sử dụng" dưới ô email
- [ ] Lỗi 401: hiện "Email hoặc mật khẩu không đúng"
- [ ] Lỗi validation: gọi applyFieldErrors

#### 3. Phiên đăng nhập:
- [ ] Tạo AuthProvider (user, isLoading, login, logout)
- [ ] Khi app khởi động: gọi refreshSession() rồi getMe(), xong mới hiện giao diện
- [ ] Thất bại thì coi là chưa đăng nhập, không báo lỗi
- [ ] Đăng xuất: gọi /auth/logout, xóa tokenStore, queryClient.clear(), về /login

#### 4. Điều hướng theo vai trò:
- [ ] Viết ProtectedRoute nhận danh sách vai trò được phép
- [ ] Bọc /hr/* với vai trò HR, /candidate/* với vai trò CANDIDATE
- [ ] Viết GuestRoute cho /login, /register (đã đăng nhập thì chuyển đi)
- [ ] Sau đăng nhập chuyển theo vai trò
- [ ] Xóa mockUser, header đọc user từ AuthProvider

#### 5. Kiểm tra:
- [ ] Đăng ký HR mới → vào /hr/jobs
- [ ] Đăng ký Ứng viên mới → vào /candidate/jobs
- [ ] Tải lại trang (F5) → vẫn đăng nhập, không nháy về /login
- [ ] Ứng viên gõ /hr/jobs → bị chuyển về /candidate/jobs
- [ ] Đăng xuất → về /login, bấm Back không vào lại được
- [ ] Push nhánh feat/W1-FE-03, tạo Pull Request

---

### [W1-AI-03] Parse CV ra JSON có cấu trúc (Zod + generateStructured), chuẩn hóa kỹ năng, tính số năm kinh nghiệm
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Chuyển text CV (từ W1-AI-02) thành dữ liệu có cấu trúc, đủ để chấm điểm ở tuần 2.

**Tiêu chí hoàn thành**
- Schema Zod ParsedCv:
  - summary: tóm tắt 1–2 câu
  - skills: danh sách kỹ năng (đã chuẩn hóa tên)
  - experiences: công ty, vị trí, ngày bắt đầu, ngày kết thúc (YYYY-MM, null nếu đang làm), mô tả ngắn, công nghệ dùng
  - education: trường, chuyên ngành, bằng cấp, năm tốt nghiệp
  - projects: tên, vai trò, công nghệ, mô tả ngắn
  - certifications, languages
  - totalYearsExperience: tính bằng code từ experiences (gộp các khoảng thời gian trùng nhau)
  - schemaVersion
- Trường không có trong CV thì để mảng rỗng hoặc null, không bịa
- Không trích họ tên, email, SĐT, địa chỉ, ngày sinh, giới tính, ảnh
- Hàm parseCv(text) dùng generateStructured() của W1-AI-01, temperature 0
- Hàm normalizeSkill() + bảng tên gọi khác (alias), dùng chung cho W1-AI-04
- Prompt nêu rõ: text có thể bị trộn thứ tự cột (theo kết quả kiểm tra của W1-AI-02), CV có thể là tiếng Việt hoặc tiếng Anh
- Export type ParsedCv để BE dùng
- Chỉ chỉnh prompt trên tập dev; chạy trên toàn bộ 30 CV không lỗi schema
- Log thời gian và token, không log nội dung CV

**Phụ thuộc:** W1-AI-01, W1-AI-02, W1-AI-06

#### 1. Schema:
- [ ] Viết schema Zod ParsedCv trong src/cv/schema.ts
- [ ] Mọi trường mảng có mặc định [], trường đơn có thể null
- [ ] Export type ParsedCv
- [ ] Thống nhất với TV2: lưu ParsedCv vào cột JSON của Application

#### 2. Chuẩn hóa kỹ năng:
- [ ] Viết normalizeSkill(): bỏ khoảng trắng thừa, thống nhất chữ hoa/thường
- [ ] Tạo bảng alias cho 3 ngành trong bộ dữ liệu (VD: ReactJS, React.js → React; NodeJS → Node.js)
- [ ] Bỏ kỹ năng trùng sau khi chuẩn hóa
- [ ] Viết unit test cho normalizeSkill

#### 3. Prompt + hàm parse:
- [ ] Viết prompt: chỉ trích thông tin có trong CV, không bịa, không trích thông tin cá nhân
- [ ] Thêm ghi chú về text 2 cột có thể bị trộn
- [ ] Viết parseCv(text) gọi generateStructured(prompt, ParsedCvSchema)
- [ ] Sau khi parse: chạy normalizeSkill cho skills và công nghệ của experiences, projects

#### 4. Tính số năm kinh nghiệm:
- [ ] Viết hàm tính tổng số năm từ experiences (endDate null = tháng hiện tại)
- [ ] Gộp các khoảng thời gian trùng nhau (làm 2 việc cùng lúc không tính 2 lần)
- [ ] Làm tròn 1 chữ số thập phân
- [ ] Viết unit test: 2 công việc nối tiếp, 2 công việc chồng nhau, công việc đang làm

#### 5. Kiểm thử:
- [ ] Chạy parseCv trên các CV tập dev, đọc kết quả và chỉnh prompt
- [ ] Chạy trên toàn bộ 30 CV: không có lỗi schema
- [ ] Kiểm tra kết quả không chứa họ tên, email, SĐT
- [ ] So sánh kỹ năng trích được với nội dung CV cho ít nhất 5 CV, ghi lại chỗ sai
- [ ] Ghi thời gian xử lý trung bình mỗi CV
- [ ] Push nhánh feat/W1-AI-03, tạo Pull Request

---

### [W1-BE-04] Module Jobs: CRUD tin tuyển dụng, cấu hình sàng lọc/phỏng vấn, quyền sở hữu của HR
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
HR quản lý tin tuyển dụng kèm cấu hình AI theo từng job; ứng viên xem được các job đang mở.

**Tiêu chí hoàn thành**

- API cho ứng viên (`@Public()`):
  - GET /jobs: chỉ job OPEN, tìm theo tên, phân trang
  - GET /jobs/:id: chỉ job OPEN, job đã đóng trả 404
- API cho HR (`@Roles('HR')`):
  - GET /jobs/mine: job của mình (cả OPEN và CLOSED), kèm số hồ sơ, phân trang
  - POST /jobs, PATCH /jobs/:id, PATCH /jobs/:id/close
- Trường JD: tiêu đề, mô tả, yêu cầu, kỹ năng bắt buộc, kỹ năng ưu tiên, số năm kinh nghiệm tối thiểu, cấp độ
- Cấu hình (có mặc định):
  - cvPassThreshold: 0–100, mặc định 70
  - interviewQuestionCount: 3–10, mặc định 6
  - Trọng số rubric phỏng vấn: chuyên môn / giao tiếp / mức độ phù hợp, mặc định 40/30/30, tổng phải bằng 100
- Quyền sở hữu: HR chỉ sửa, đóng được job do mình tạo (so `job.createdById` với `@CurrentUser()`), sai thì 403
- Sửa phần nội dung JD thì xóa parsedJd và embedding cũ (đặt null) để tuần 2 phân tích lại
- Job đã đóng không sửa được (trả 409)
- Không làm API xóa job (giữ dữ liệu hồ sơ đã nộp)

**Phụ thuộc:** W1-BE-02, W1-BE-03

#### 1. DTO + validate:
- [ ] Hoàn thiện CreateJobDto, UpdateJobDto theo khung của W1-BE-02
- [ ] Validate cvPassThreshold 0–100, interviewQuestionCount 3–10
- [ ] Viết validator kiểm tra tổng 3 trọng số = 100
- [ ] Đặt giá trị mặc định cho cấu hình khi HR không gửi
- [ ] Cập nhật Swagger: thêm GET /jobs/mine

#### 2. API cho ứng viên:
- [ ] GET /jobs: lọc status OPEN, tìm theo tiêu đề (không phân biệt hoa thường), phân trang
- [ ] GET /jobs/:id: job không tồn tại hoặc đã đóng → 404
- [ ] Gắn `@Public()` cho 2 route này

#### 3. API cho HR:
- [ ] GET /jobs/mine: job của HR hiện tại, kèm số hồ sơ (_count của Prisma)
- [ ] POST /jobs: lưu createdById từ `@CurrentUser()`
- [ ] PATCH /jobs/:id: kiểm tra quyền sở hữu, job đã đóng → 409
- [ ] Sửa nội dung JD → đặt parsedJd và embedding về null
- [ ] PATCH /jobs/:id/close: kiểm tra quyền sở hữu, chuyển status CLOSED

#### 4. Kiểm tra:
- [ ] Ứng viên gọi POST /jobs → 403
- [ ] HR A sửa job của HR B → 403
- [ ] Gửi trọng số tổng khác 100 → 400 kèm lỗi rõ ràng
- [ ] Đóng job → không còn trong GET /jobs, vẫn có trong GET /jobs/mine
- [ ] Push nhánh feat/W1-BE-04, tạo Pull Request

---

### [W1-FE-04] Trang HR: danh sách, tạo, sửa, đóng tin tuyển dụng + cấu hình sàng lọc/phỏng vấn
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
HR quản lý tin tuyển dụng và cấu hình cách AI sàng lọc, phỏng vấn cho từng job.

**Tiêu chí hoàn thành**
- /hr/jobs: bảng job của mình (tiêu đề, trạng thái Đang mở / Đã đóng, số hồ sơ, ngày tạo), phân trang, nút Tạo tin mới
- /hr/jobs/new và /hr/jobs/:id/edit dùng chung một form:
  - Phần JD: tiêu đề, mô tả, yêu cầu, kỹ năng bắt buộc, kỹ năng ưu tiên (nhập dạng tag), số năm kinh nghiệm, cấp độ
  - Phần Cấu hình AI (có mặc định 70 / 6 / 40-30-30): ngưỡng điểm CV, số câu hỏi phỏng vấn, 3 trọng số rubric; mỗi ô có dòng giải thích ngắn
  - Hiện tổng trọng số trực tiếp, báo lỗi khi khác 100
- Schema Zod giống quy tắc validate của W1-BE-04
- Đóng tin: hộp xác nhận, đóng xong cập nhật danh sách
- Job đã đóng: không cho sửa (ẩn nút Sửa)
- Lỗi từ BE gắn vào form (applyFieldErrors), thành công hiện toast
- Trạng thái loading, danh sách rỗng ("Chưa có tin tuyển dụng nào")

**Phụ thuộc:** W1-FE-03, W1-FE-06; API ở W1-BE-04

#### 1. API + hook:
- [ ] Thêm getMyJobs vào src/api/jobs.ts (GET /jobs/mine)
- [ ] Viết hook useMyJobs, useJob, useCreateJob, useUpdateJob, useCloseJob
- [ ] Tạo, sửa, đóng xong thì invalidate danh sách job

#### 2. Danh sách job:
- [ ] Trang /hr/jobs: bảng (Table của shadcn/ui), phân trang
- [ ] Badge trạng thái Đang mở / Đã đóng
- [ ] Cột số hồ sơ
- [ ] Trạng thái loading (Skeleton) và rỗng

#### 3. Form JD + cấu hình:
- [ ] Viết schema Zod cho form (kiểm tra tổng trọng số = 100)
- [ ] Component nhập kỹ năng dạng tag (Enter để thêm, bấm x để xóa)
- [ ] Phần Cấu hình AI với giá trị mặc định và dòng giải thích cho từng ô
- [ ] Hiện tổng trọng số trực tiếp, chuyển đỏ khi khác 100
- [ ] Dùng chung form cho trang tạo mới và trang sửa (trang sửa nạp dữ liệu cũ)

#### 4. Đóng tin + xử lý lỗi:
- [ ] Nút Đóng tin mở AlertDialog xác nhận
- [ ] Job đã đóng: ẩn nút Sửa và Đóng
- [ ] Lỗi validation từ BE: applyFieldErrors
- [ ] Thành công: toast + quay về /hr/jobs

#### 5. Kiểm tra:
- [ ] Tạo job với cấu hình mặc định → hiện trong danh sách
- [ ] Sửa job → dữ liệu cập nhật đúng
- [ ] Nhập trọng số tổng 90 → không cho lưu
- [ ] Đóng job → trạng thái đổi, không sửa được nữa
- [ ] Push nhánh feat/W1-FE-04, tạo Pull Request

---

### [W1-AI-04] Trích yêu cầu từ JD ra JSON: gộp kỹ năng HR nhập + kỹ năng trong mô tả, chuẩn hóa chung với CV
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Chuyển JD thành danh sách yêu cầu có cấu trúc, cùng cách gọi tên kỹ năng với CV để so khớp ở tuần 2.

**Tiêu chí hoàn thành**
- Schema Zod ParsedJd:
  - requiredSkills, preferredSkills (đã chuẩn hóa)
  - minYearsExperience, level (intern, junior, middle, senior)
  - educationRequirement
  - responsibilities: các ý chính, tối đa 8
  - domain: lĩnh vực của vị trí
  - schemaVersion
- Hàm parseJd(input) nhận các trường của form job (tiêu đề, mô tả, yêu cầu, kỹ năng, số năm, cấp độ)
- Kỹ năng HR nhập luôn được giữ lại; AI chỉ bổ sung kỹ năng tìm thấy trong mô tả và yêu cầu
- Số năm kinh nghiệm và cấp độ HR đã nhập thì dùng giá trị của HR, không để AI ghi đè
- Dùng chung normalizeSkill() và bảng alias của W1-AI-03
- Dùng generateStructured() của W1-AI-01, temperature 0
- Export type ParsedJd để BE dùng
- Chạy đúng trên 3 JD của W1-AI-06

**Phụ thuộc:** W1-AI-01, W1-AI-03 (normalizeSkill)

#### 1. Schema:
- [ ] Viết schema Zod ParsedJd trong src/jd/schema.ts
- [ ] Export type ParsedJd và type JdInput (khớp các trường form của W1-BE-04)

#### 2. Hàm parse:
- [ ] Viết prompt: chỉ trích yêu cầu có trong JD, tách bắt buộc và ưu tiên, không bịa
- [ ] Viết parseJd(input) gọi generateStructured
- [ ] Gộp kỹ năng: kỹ năng HR nhập + kỹ năng AI tìm thấy, chạy normalizeSkill, bỏ trùng
- [ ] Kỹ năng vừa có trong bắt buộc vừa có trong ưu tiên thì giữ ở bắt buộc
- [ ] Số năm và cấp độ HR đã nhập thì ghi đè kết quả của AI

#### 3. Kiểm thử:
- [ ] Chạy trên 3 JD của fixtures, đọc kết quả bằng mắt
- [ ] Kiểm tra mọi kỹ năng HR nhập đều có trong requiredSkills
- [ ] Bổ sung bảng alias nếu thấy tên kỹ năng giữa CV và JD chưa khớp
- [ ] Viết unit test cho phần gộp kỹ năng (không gọi Gemini)
- [ ] Push nhánh feat/W1-AI-04, tạo Pull Request

---

### [W1-BE-05] Module Applications: nộp CV (Multer), kiểm tra PDF, trích text ngay khi nộp, lưu Cloudinary
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Ứng viên nộp CV vào một job; CV không đọc được bị từ chối ngay để ứng viên nộp lại.

**Tiêu chí hoàn thành**
- POST /jobs/:id/applications (`@Roles('CANDIDATE')`), Multer lưu trong bộ nhớ, field "file"
- Kiểm tra file: tối đa 5MB, mimetype application/pdf và 4 byte đầu là %PDF
- Chặn: job không tồn tại hoặc đã đóng (404 / 409), đã nộp vào job này rồi (409)
- Gọi extractCvText (W1-AI-02):
  - Lỗi SCANNED, ENCRYPTED, CORRUPTED, EMPTY, TOO_MANY_PAGES → trả 422 kèm mã lỗi và thông báo tiếng Việt, không lưu gì
  - Thành công → lưu cvText vào Application (tuần 2 không cần trích lại)
- Upload lên Cloudinary (resource_type raw, thư mục cvs/), lưu cvUrl và cvPublicId
- Lưu DB lỗi sau khi upload → xóa file vừa upload trên Cloudinary
- Tạo hồ sơ trạng thái SUBMITTED, ghi 1 dòng ApplicationStatusHistory
- GET /me/applications: hồ sơ của chính ứng viên (job, trạng thái, ngày nộp), không trả cvText
- Bật "cho phép phân phối PDF" trong cài đặt bảo mật của Cloudinary
- (Nên có) Link xem CV cho HR là link có chữ ký, hết hạn sau thời gian ngắn, dùng ở W2-BE-04

**Phụ thuộc:** W1-BE-03, W1-BE-04, W1-AI-02

#### 1. Cloudinary:
- [ ] Tạo tài khoản Cloudinary, lấy cloud name, API key, API secret
- [ ] Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào .env.example
- [ ] Bật cho phép phân phối PDF trong Settings > Security
- [ ] Viết CloudinaryService: upload buffer (upload_stream), xóa theo publicId

#### 2. Nhận file:
- [ ] Cấu hình Multer memoryStorage, giới hạn 5MB
- [ ] Kiểm tra mimetype và 4 byte đầu %PDF, sai thì trả 400
- [ ] Kiểm tra job tồn tại và đang mở
- [ ] Kiểm tra ứng viên chưa nộp vào job này

#### 3. Trích text:
- [ ] Gọi extractCvText từ @hireflow/ai với buffer của file
- [ ] Map mã lỗi CvExtractionError sang 422 kèm thông báo tiếng Việt
- [ ] VD SCANNED: "CV có vẻ là ảnh scan. Vui lòng tải file PDF có thể chọn và sao chép chữ."
- [ ] Ghi danh sách mã lỗi và thông báo vào Swagger để TV1 hiển thị

#### 4. Lưu hồ sơ:
- [ ] Upload Cloudinary, lấy secure_url và public_id
- [ ] Tạo Application (SUBMITTED, cvText, cvUrl, cvPublicId) + 1 dòng ApplicationStatusHistory trong transaction
- [ ] Lỗi khi lưu DB → xóa file trên Cloudinary
- [ ] Bắt lỗi trùng (unique jobId + candidateId) khi 2 request đến cùng lúc → 409
- [ ] GET /me/applications: không trả cvText, cvPublicId

#### 5. Kiểm tra:
- [ ] Nộp CV hợp lệ → 201, có file trên Cloudinary, có hồ sơ SUBMITTED
- [ ] Nộp file .docx đổi đuôi thành .pdf → 400
- [ ] Nộp file scan trong fixtures → 422 mã SCANNED, Cloudinary không có file mới
- [ ] Nộp lần 2 vào cùng job → 409
- [ ] HR gọi API nộp CV → 403
- [ ] Push nhánh feat/W1-BE-05, tạo Pull Request

---

### [W1-FE-05] Trang ứng viên: danh sách job, chi tiết job, nộp CV PDF có tiến trình và thông báo lỗi rõ ràng
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Ứng viên tìm việc và nộp CV; nếu CV không hợp lệ thì biết ngay lý do để nộp lại.

**Tiêu chí hoàn thành**

- /candidate/jobs: danh sách job đang mở, tìm theo tên (chờ 300ms sau khi ngừng gõ mới gọi API), phân trang
- /candidate/jobs/:id: chi tiết job (mô tả, yêu cầu, kỹ năng, số năm kinh nghiệm, cấp độ)
- Nộp CV:
  - Chọn file hoặc kéo thả, chỉ nhận PDF, tối đa 5MB, kiểm tra trước khi gửi
  - Thanh tiến trình upload
  - Thành công: toast + chuyển nút thành "Đã nộp"
- Thông báo theo mã lỗi của BE: SCANNED, ENCRYPTED, CORRUPTED, EMPTY, TOO\_MANY\_PAGES, đã nộp rồi (409), job đã đóng
- Job đã nộp hiện "Đã nộp" (dựa vào GET /me/applications), không cho nộp lại
- Trạng thái loading, rỗng, job không tồn tại (404)
- (Có thể có) Xem danh sách job khi chưa đăng nhập, bấm Nộp CV thì yêu cầu đăng nhập

**Phụ thuộc:** W1-FE-03, W1-FE-06; API ở W1-BE-04, W1-BE-05

#### 1. Danh sách + chi tiết job:
- [ ] Trang /candidate/jobs: danh sách dạng thẻ (Card), phân trang
- [ ] Ô tìm kiếm có debounce 300ms
- [ ] Trang /candidate/jobs/:id: hiện đủ thông tin job
- [ ] Xử lý loading, danh sách rỗng, job không tồn tại

#### 2. Nộp CV:
- [ ] Component chọn file + kéo thả, chỉ nhận .pdf
- [ ] Kiểm tra trước khi gửi: đúng PDF, không quá 5MB
- [ ] Gọi applyJob kèm onUploadProgress, hiện thanh tiến trình (Progress của shadcn/ui)
- [ ] Chặn bấm nộp nhiều lần khi đang upload
- [ ] Thành công: toast, invalidate danh sách hồ sơ của tôi

#### 3. Trạng thái đã nộp + lỗi:
- [ ] Dùng getMyApplications để biết job nào đã nộp
- [ ] Job đã nộp: hiện "Đã nộp" thay nút Nộp CV
- [ ] Tạo bảng thông báo tiếng Việt cho từng mã lỗi của BE
- [ ] Lỗi SCANNED: hiện hướng dẫn xuất lại CV sang PDF có thể chọn chữ

#### 4. Kiểm tra:
- [ ] Nộp CV hợp lệ → thấy tiến trình, sau đó hiện "Đã nộp"
- [ ] Chọn file .docx → bị chặn trước khi gửi
- [ ] Chọn file 6MB → bị chặn trước khi gửi
- [ ] Nộp file scan trong fixtures → hiện đúng thông báo SCANNED
- [ ] Tải lại trang → job vẫn hiện "Đã nộp"
- [ ] Push nhánh feat/W1-FE-05, tạo Pull Request

---

## Backlog Week 2 (12 tasks)

### [W2-BE-03] State machine trạng thái hồ sơ: chuyển trạng thái tập trung, ghi lịch sử, phát sự kiện
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR — **làm đầu tuần**, các thẻ BE khác dùng lại

**Mục tiêu**
Một nơi duy nhất đổi trạng thái hồ sơ, chặn chuyển sai, có lịch sử để HR và báo cáo tra lại.

**Luồng trạng thái**
1. `SUBMITTED` — ứng viên vừa nộp (W1-BE-05)
2. `SCREENING` — AI đang chấm
3. `SCREENED` — AI đã chấm xong, có đề xuất Đạt/Loại
4. `SCREENING_FAILED` — chấm lỗi sau khi đã thử lại, chờ HR bấm chấm lại
5. HR quyết định: `SHORTLISTED` (duyệt) hoặc `REJECTED` (loại)
6. `SHORTLISTED` → `INTERVIEW_INVITED` ngay khi tạo phiên phỏng vấn
7. `INTERVIEWING` → `EVALUATED` → `PASSED` / `FAILED` (tuần 3)

**Chuyển trạng thái hợp lệ**
- SUBMITTED → SCREENING
- SCREENING → SCREENED | SCREENING_FAILED
- SCREENING_FAILED → SCREENING (HR chấm lại)
- SCREENED → SCREENING (HR chấm lại) | SHORTLISTED | REJECTED
- SHORTLISTED → INTERVIEW_INVITED
- INTERVIEW_INVITED → INTERVIEWING
- INTERVIEWING → EVALUATED
- EVALUATED → PASSED | FAILED

**Tiêu chí hoàn thành**
- ApplicationStateService.transition(applicationId, toStatus, actorId?, tx?): kiểm tra bảng chuyển hợp lệ, sai thì ném lỗi 409
- Cập nhật status và ghi 1 dòng ApplicationStatusHistory trong cùng transaction; actorId null nghĩa là hệ thống
- Phát sự kiện application.status_changed (`@nestjs/event-emitter`) sau khi lưu thành công, để BE-01 và email (W3-BE-07) nghe
- Sửa W1-BE-05 dùng service này thay vì tự ghi history
- Unit test cho mọi chuyển hợp lệ và vài chuyển không hợp lệ

**Phụ thuộc:** W1-BE-01, W1-BE-05

#### 1. Bảng chuyển trạng thái:
- [ ] Tạo file application-transitions.ts: map từ trạng thái → danh sách trạng thái được phép chuyển tới (theo mô tả thẻ)
- [ ] Viết hàm canTransition(from, to) dùng chung
- [ ] Vẽ sơ đồ luồng trạng thái (Mermaid) vào docs/application-status.md cho cả nhóm xem

#### 2. Service + lịch sử + sự kiện:
- [ ] Cài @nestjs/event-emitter, đăng ký EventEmitterModule
- [ ] Viết ApplicationStateService.transition(applicationId, toStatus, actorId?, tx?)
- [ ] Chuyển không hợp lệ → ném ConflictException (409) kèm trạng thái hiện tại và trạng thái muốn chuyển
- [ ] Cập nhật status + ghi ApplicationStatusHistory trong cùng transaction (nhận tx từ ngoài nếu có)
- [ ] Phát sự kiện application.status_changed { applicationId, from, to, actorId } sau khi transaction xong
- [ ] Sửa API nộp CV (W1-BE-05): tạo hồ sơ SUBMITTED, ghi history và phát sự kiện qua service này

#### 3. Kiểm tra:
- [ ] Unit test: mọi chuyển trạng thái hợp lệ trong bảng đều thành công
- [ ] Unit test: SUBMITTED → PASSED, REJECTED → SHORTLISTED, SCREENING → SHORTLISTED đều bị từ chối
- [ ] Nộp 1 CV thật: có 1 dòng history SUBMITTED, sự kiện được phát (xem log)
- [ ] Push nhánh feat/W2-BE-03, tạo Pull Request

---

### [W2-AI-01] Embedding CV và JD bằng Gemini Embedding (768 chiều), văn bản tóm tắt có cấu trúc, cosine similarity
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
Biểu diễn CV và JD dưới dạng vector để đo mức độ tương đồng về nội dung, làm một thành phần của điểm phù hợp.

**Tiêu chí hoàn thành**
- Hàm embedText(text) dùng model embedding từ createAiClient (W1-AI-01), outputDimensionality = 768 (khớp cột `vector(768)` ở W1-BE-01)
- Dùng cùng một taskType cho cả CV và JD để vector so sánh được với nhau
- Chuẩn hóa vector về độ dài 1 trước khi trả về
- Hàm buildCvEmbeddingText(parsedCv) và buildJdEmbeddingText(parsedJd): ghép tóm tắt, kỹ năng, kinh nghiệm, dự án thành văn bản ngắn có cấu trúc; không dùng text CV thô, không chứa thông tin cá nhân
- Hàm cosineSimilarity(a, b) trả 0–1
- Export embedCv(parsedCv), embedJd(parsedJd) cho BE dùng
- Log thời gian và token, không log nội dung
- (Có thể có) Tính độ tương đồng bằng truy vấn pgvector phía BE thay cho tính trong code

**Phụ thuộc:** W1-AI-01, W1-AI-03, W1-AI-04

#### 1. Hàm embedding:
- [ ] Viết embedText(text) trong src/embedding/embed.ts, dùng model embedding từ createAiClient
- [ ] Đặt outputDimensionality = 768, cùng một taskType cho CV và JD
- [ ] Kiểm tra vector trả về đúng 768 phần tử, sai thì ném AiInvalidResponseError
- [ ] Chuẩn hóa vector về độ dài 1
- [ ] Viết cosineSimilarity(a, b), kẹp kết quả trong khoảng 0–1

#### 2. Văn bản đầu vào:
- [ ] Viết buildCvEmbeddingText(parsedCv): tóm tắt + kỹ năng + vị trí và công nghệ của kinh nghiệm + dự án
- [ ] Viết buildJdEmbeddingText(parsedJd): lĩnh vực + kỹ năng bắt buộc, ưu tiên + trách nhiệm chính
- [ ] Hai hàm dùng cùng cấu trúc nhãn (VD: "Kỹ năng: …", "Kinh nghiệm: …") để vector so sánh được
- [ ] Export embedCv(parsedCv), embedJd(parsedJd)

#### 3. Kiểm tra:
- [ ] Unit test cosineSimilarity với vector tự tạo (giống hệt = 1, vuông góc = 0)
- [ ] Chạy thử trên tập dev: CV phù hợp có cosine với JD mục tiêu cao hơn CV lệch ngành
- [ ] Ghi khoảng cosine thường gặp (thấp nhất, cao nhất) để W2-AI-02 quy đổi sang thang 0–100
- [ ] Push nhánh feat/W2-AI-01, tạo Pull Request

---

### [W2-FE-03] Trang "Hồ sơ của tôi": trạng thái dễ hiểu cho ứng viên, nút vào phỏng vấn
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR — làm đầu tuần (chỉ cần API của tuần 1)

**Mục tiêu**
Ứng viên biết hồ sơ đang ở bước nào và vào được vòng phỏng vấn mà không cần email.

**Tiêu chí hoàn thành**
- Trang /candidate/applications: danh sách hồ sơ đã nộp (tên job, ngày nộp, trạng thái)
- Gộp trạng thái nội bộ thành nhãn dễ hiểu cho ứng viên:
  - SUBMITTED, SCREENING, SCREENING_FAILED, SCREENED, SHORTLISTED → "Đang xét duyệt"
  - REJECTED → "Chưa phù hợp"
  - INTERVIEW_INVITED → "Được mời phỏng vấn"
  - INTERVIEWING → "Đang phỏng vấn"
  - EVALUATED → "Đang chờ kết quả"
  - PASSED → "Đạt"; FAILED → "Chưa đạt"
- Timeline 4 bước: Đã nộp → Xét duyệt CV → Phỏng vấn → Kết quả
- Ứng viên không thấy điểm, đề xuất AI hay lỗi chấm nội bộ
- INTERVIEW_INVITED hoặc INTERVIEWING: nút "Vào phỏng vấn" / "Tiếp tục phỏng vấn" dẫn đến /candidate/interviews/:interviewId (trang ở W3-FE-01)
- PASSED, FAILED: nút "Xem phản hồi" dẫn đến trang W3-FE-04
- Trạng thái loading, rỗng ("Bạn chưa nộp hồ sơ nào")

**Phụ thuộc:** W1-FE-05; API GET /me/applications (W1-BE-05, thêm interviewId ở W2-BE-04)

#### 1. API + nhãn trạng thái:
- [ ] Dùng getMyApplications (W1-FE-06), bổ sung type interviewId (có thể null)
- [ ] Tạo src/lib/candidateStatus.ts: map trạng thái nội bộ → nhãn, màu, bước timeline (theo mô tả thẻ)
- [ ] Viết unit test nhỏ cho hàm map (mọi trạng thái đều có nhãn)

#### 2. Giao diện:
- [ ] Trang /candidate/applications: danh sách thẻ hồ sơ (tên job, ngày nộp, nhãn trạng thái)
- [ ] Component timeline 4 bước: Đã nộp → Xét duyệt CV → Phỏng vấn → Kết quả
- [ ] Nút "Vào phỏng vấn" / "Tiếp tục phỏng vấn" → /candidate/interviews/:interviewId (tạo trang placeholder, nội dung làm ở W3-FE-01)
- [ ] Nút "Xem phản hồi" khi PASSED / FAILED (trang placeholder, nội dung làm ở W3-FE-04)
- [ ] Trạng thái loading (Skeleton) và rỗng, có nút "Tìm việc" về /candidate/jobs

#### 3. Kiểm tra:
- [ ] Đổi trạng thái hồ sơ trong DB (hoặc mock) qua từng giá trị, nhãn và nút hiện đúng
- [ ] Kiểm tra không có chỗ nào hiện điểm, đề xuất AI hay chữ "lỗi"
- [ ] Kiểm tra giao diện trên mobile
- [ ] Push nhánh feat/W2-FE-03, tạo Pull Request

---

### [W2-BE-04] API dashboard HR: danh sách ứng viên theo job, chi tiết, duyệt/loại, link xem CV, thống kê
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR — **cập nhật Swagger trước** để TV1 mock

**Mục tiêu**
Cung cấp dữ liệu cho dashboard HR và cho HR ra quyết định cuối cùng ở vòng CV. API đọc thẳng từ DB nên làm được trước khi pipeline AI xong.

**Tiêu chí hoàn thành**
- Chỉ HR sở hữu job được gọi (`@Roles('HR')` + so job.createdById với `@CurrentUser()`), sai thì 403
- GET /jobs/:jobId/applications?status=&minScore=&maxScore=&sort=score|createdAt&order=&page=&limit=
  - Mỗi dòng: id, tên ứng viên, điểm tổng, aiRecommendation, status, ngày nộp
- GET /applications/:id: thông tin ứng viên, job, ScreeningResult (điểm tổng, điểm thành phần, điểm mạnh, kỹ năng thiếu, trích dẫn), aiRecommendation, quyết định của HR, lịch sử trạng thái
- POST /applications/:id/decision body { decision: "APPROVE" | "REJECT", note? }
  - Chỉ nhận khi hồ sơ đang SCREENED, sai thì 409
  - Lưu hrDecisionBy, hrDecisionAt, hrNote
  - APPROVE: SHORTLISTED → tạo Interview → INTERVIEW_INVITED (cùng transaction); REJECT: REJECTED
- GET /jobs/:jobId/stats: số hồ sơ theo trạng thái, phân bố điểm theo khoảng 10 điểm, tỷ lệ AI đề xuất đạt
- GET /me/applications (W1-BE-05) trả thêm interviewId khi đã có phiên phỏng vấn
- (Nên có) GET /applications/:id/cv-url: link Cloudinary có chữ ký, hết hạn sau 10 phút
- (Có thể có) Tỷ lệ HR đồng ý với đề xuất AI trong stats

**Phụ thuộc:** W1-BE-04, W1-BE-05, W2-BE-03

#### 1. Swagger + quyền:
- [ ] Viết DTO + controller khung cho mọi endpoint của thẻ, cập nhật Swagger trước, báo TV1 mock trên Apidog
- [ ] Viết guard hoặc hàm assertJobOwner(jobId, user) dùng chung, sai thì 403
- [ ] Seed thêm vài hồ sơ có sẵn ScreeningResult giả để test API khi pipeline AI chưa xong

#### 2. Danh sách, chi tiết, thống kê:
- [ ] GET /jobs/:jobId/applications: lọc status, minScore, maxScore; sắp xếp score / createdAt; phân trang
- [ ] GET /applications/:id: kèm ScreeningResult, quyết định HR, lịch sử trạng thái; không trả cvText, embedding
- [ ] GET /jobs/:jobId/stats: đếm theo trạng thái, phân bố điểm theo khoảng 10, tỷ lệ AI đề xuất đạt
- [ ] GET /me/applications: trả thêm interviewId
- [ ] (Nên có) GET /applications/:id/cv-url: tạo link Cloudinary có chữ ký từ cvPublicId, hết hạn 10 phút

#### 3. Duyệt / Loại:
- [ ] POST /applications/:id/decision: DecisionDto { decision: APPROVE | REJECT, note? }
- [ ] Hồ sơ không ở SCREENED → 409
- [ ] Lưu hrDecisionBy, hrDecisionAt, hrNote
- [ ] APPROVE trong 1 transaction: SHORTLISTED → tạo Interview → INTERVIEW_INVITED (dùng ApplicationStateService)
- [ ] REJECT: chuyển REJECTED

#### 4. Kiểm tra:
- [ ] HR A gọi API của job thuộc HR B → 403; ứng viên gọi → 403
- [ ] Lọc minScore=70 chỉ ra hồ sơ từ 70 điểm; sắp xếp theo điểm đúng thứ tự
- [ ] Duyệt 1 hồ sơ → status INTERVIEW_INVITED, có bản ghi Interview, ứng viên thấy interviewId
- [ ] Duyệt lại hồ sơ đã duyệt → 409
- [ ] Push nhánh feat/W2-BE-04, tạo Pull Request

---

### [W2-AI-02] Chấm điểm CV 0–100: phần tính bằng code (kỹ năng, số năm) + Gemini chấm mức độ liên quan + độ tương đồng embedding
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
Ra điểm phù hợp 0–100 ổn định, giải thích được từng phần. Phần nào tính được bằng code thì không để Gemini tự chấm, để điểm ít dao động.

**Thành phần điểm (trọng số mặc định, để trong config)**
- Kỹ năng bắt buộc — 35%: tỷ lệ kỹ năng bắt buộc của JD có trong CV (so sau normalizeSkill), tính bằng code
- Kỹ năng ưu tiên — 10%: tỷ lệ kỹ năng ưu tiên có trong CV, tính bằng code
- Số năm kinh nghiệm — 15%: totalYearsExperience so với minYearsExperience (đủ hoặc vượt = 100), tính bằng code
- Mức độ liên quan của kinh nghiệm và dự án — 25%: Gemini chấm 0–10 theo rubric, temperature 0, qua generateStructured
- Độ tương đồng embedding — 15%: cosine CV–JD (W2-AI-01) quy về 0–100

**Tiêu chí hoàn thành**
- Hàm scoreCv({ parsedCv, parsedJd, cvEmbedding, jdEmbedding }) trả { total, breakdown }
- breakdown gồm điểm từng thành phần, danh sách kỹ năng bắt buộc khớp / thiếu, kỹ năng ưu tiên khớp / thiếu, nhận xét ngắn của Gemini về mức độ liên quan
- Quy tắc chặn: thiếu quá một nửa kỹ năng bắt buộc thì điểm tổng tối đa 49
- Điểm tổng làm tròn số nguyên
- Chạy lại cùng một CV 3 lần, điểm chênh không quá ±5
- Unit test cho phần tính bằng code (không gọi Gemini)
- Việc so điểm với ngưỡng để ra Đạt/Loại làm ở BE (W2-BE-02), không làm trong hàm này

**Phụ thuộc:** W1-AI-03, W1-AI-04, W2-AI-01

#### 1. Phần tính bằng code:
- [ ] Tạo src/scoring/config.ts: trọng số 5 thành phần (35/10/15/25/15), ngưỡng chặn 49
- [ ] Hàm matchSkills(cvSkills, jdSkills) dùng normalizeSkill: trả danh sách khớp, thiếu, tỷ lệ khớp
- [ ] Gom kỹ năng CV từ skills + công nghệ trong experiences và projects trước khi so
- [ ] Hàm scoreYears(totalYears, minYears): đủ hoặc vượt = 100, thiếu thì tỷ lệ theo số năm; JD không yêu cầu = 100
- [ ] JD không có kỹ năng ưu tiên → điểm thành phần này = 100 (không phạt)

#### 2. Phần Gemini + embedding:
- [ ] Viết prompt rubric 0–10 cho mức độ liên quan của kinh nghiệm và dự án, có mô tả từng mức (0–3 / 4–6 / 7–8 / 9–10)
- [ ] Gọi generateStructured với schema { relevanceScore, reason }, temperature 0
- [ ] Chỉ gửi ParsedCv (không gửi text CV thô) để tránh lộ thông tin cá nhân và giảm token
- [ ] Quy đổi cosine sang 0–100 theo khoảng đo được ở W2-AI-01 (kẹp trong 0–100)

#### 3. Ghép điểm + kiểm tra:
- [ ] Viết scoreCv(): tính tổng theo trọng số, áp quy tắc chặn 49, làm tròn số nguyên
- [ ] Export type ScoreBreakdown (điểm từng phần, kỹ năng khớp/thiếu, nhận xét) để BE và FE dùng
- [ ] Unit test phần tính bằng code: khớp đủ, thiếu 1 kỹ năng, thiếu quá nửa (bị chặn 49), JD không yêu cầu số năm
- [ ] Chạy 3 lần trên 3 CV tập dev: điểm chênh không quá ±5
- [ ] Push nhánh feat/W2-AI-02, tạo Pull Request

---

### [W2-FE-01] Dashboard HR: danh sách ứng viên theo job, điểm, đề xuất AI, lọc, sắp xếp, chấm lại
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
HR xem nhanh ai phù hợp nhất cho từng job.

**Tiêu chí hoàn thành**
- Trang /hr/jobs/:jobId/candidates; vào từ nút "Xem ứng viên" ở danh sách job (W1-FE-04) và menu "Ứng viên" ở sidebar (chọn job bằng dropdown)
- Bảng: tên ứng viên, điểm (tô màu theo khoảng: dưới ngưỡng / gần ngưỡng / trên ngưỡng), đề xuất AI (Đạt / Loại), trạng thái, ngày nộp
- Lọc theo trạng thái và khoảng điểm; sắp xếp theo điểm hoặc ngày nộp; phân trang; giữ bộ lọc trên URL
- SUBMITTED, SCREENING: hiện "Đang chấm…"; chỉ bật tự làm mới (refetchInterval 5s) khi còn hồ sơ đang chấm
- SCREENING_FAILED: hiện "Chấm lỗi" + nút "Chấm lại" (gọi POST /applications/:id/rescreen)
- Bấm một dòng → trang chi tiết W2-FE-02
- Trạng thái loading, rỗng ("Job này chưa có hồ sơ nào")

**Phụ thuộc:** W1-FE-04, W1-FE-06; API W2-BE-04 (mock trước bằng Apidog), rescreen ở W2-BE-01

#### 1. Trang + điều hướng:
- [ ] Thêm getJobApplications, rescreenApplication vào src/api/applications.ts + hook useJobApplications
- [ ] Route /hr/jobs/:jobId/candidates
- [ ] Nút "Xem ứng viên" ở mỗi dòng danh sách job (W1-FE-04)
- [ ] Menu "Ứng viên" ở sidebar: dropdown chọn job, mặc định job mới nhất

#### 2. Bảng, lọc, sắp xếp:
- [ ] Bảng: tên, điểm, đề xuất AI, trạng thái, ngày nộp
- [ ] Tô màu điểm theo ngưỡng của job: dưới ngưỡng 10 điểm (đỏ), sát ngưỡng (vàng), từ ngưỡng (xanh)
- [ ] Bộ lọc trạng thái + khoảng điểm; sắp xếp theo điểm / ngày nộp
- [ ] Giữ bộ lọc, sắp xếp, trang hiện tại trên URL (useSearchParams)
- [ ] Bấm dòng → /hr/applications/:id

#### 3. Trạng thái chấm + kiểm tra:
- [ ] SUBMITTED, SCREENING: badge "Đang chấm…" có spinner, ẩn điểm
- [ ] refetchInterval 5s chỉ khi danh sách còn hồ sơ đang chấm, hết thì tắt
- [ ] SCREENING_FAILED: badge "Chấm lỗi" + nút "Chấm lại" (gọi rescreen, sau đó chuyển về "Đang chấm…")
- [ ] Trạng thái loading, rỗng
- [ ] Kiểm tra với mock rồi với BE thật: nộp CV mới → thấy "Đang chấm…" → tự hiện điểm khi chấm xong
- [ ] Push nhánh feat/W2-FE-01, tạo Pull Request

---

### [W2-AI-03] Giải thích điểm kèm trích dẫn CV đã kiểm chứng + hàm tổng screenCv() cho BE gọi
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
HR hiểu vì sao AI cho điểm như vậy (hiển thị ở W2-FE-02). Gói toàn bộ pipeline vào một hàm để BE chỉ cần gọi một lần.

**Tiêu chí hoàn thành**
- Hàm explainScore({ cvText, parsedCv, parsedJd, breakdown }) trả:
  - strengths: 2–4 điểm mạnh, mỗi ý kèm 1 trích dẫn nguyên văn ngắn từ CV
  - gaps: kỹ năng bắt buộc còn thiếu (lấy từ breakdown, không để Gemini tự suy) + nhận xét ngắn
  - summary: 2–3 câu tóm tắt mức độ phù hợp
- Kiểm chứng trích dẫn: so với cvText sau khi chuẩn hóa NFC và gộp khoảng trắng; trích dẫn không tìm thấy thì bỏ
- Tiếng Việt, giọng trung lập, không nhắc đến tên, tuổi, giới tính, quê quán
- Hàm tổng screenCv({ cvText, parsedJd, jdEmbedding }) chạy lần lượt: parseCv → embedCv → scoreCv → explainScore
  - Trả { parsedCv, cvEmbedding, total, breakdown, explanation, timings }
  - Lỗi ở bước nào thì ném lỗi có ghi tên bước đó (để BE lưu lý do chấm lỗi)
- Export hàm screenCv và type ScreeningOutput

**Phụ thuộc:** W2-AI-02

#### 1. Giải thích điểm:
- [ ] Viết schema Zod Explanation: strengths [{ text, quote }], gaps [{ skill, note }], summary
- [ ] Viết prompt: dựa trên breakdown, trích nguyên văn ngắn (dưới 25 từ) từ CV, tiếng Việt, giọng trung lập
- [ ] gaps lấy danh sách kỹ năng thiếu từ breakdown, Gemini chỉ viết nhận xét cho từng kỹ năng
- [ ] Nhắc trong prompt: không nhắc tên, tuổi, giới tính, quê quán, trường học nổi tiếng hay không

#### 2. Kiểm chứng trích dẫn:
- [ ] Hàm normalizeForMatch(text): NFC, chữ thường, gộp khoảng trắng
- [ ] Giữ trích dẫn khi tìm thấy trong cvText sau chuẩn hóa; không thấy thì bỏ phần quote, giữ phần nhận xét
- [ ] Log số trích dẫn bị bỏ (để theo dõi Gemini có hay bịa trích dẫn không)
- [ ] Unit test: trích dẫn đúng được giữ, trích dẫn bịa bị bỏ, khác dấu cách hoặc chữ hoa vẫn khớp

#### 3. Hàm tổng screenCv:
- [ ] Viết screenCv({ cvText, parsedJd, jdEmbedding }): parseCv → embedCv → scoreCv → explainScore
- [ ] Đo thời gian từng bước, trả trong timings
- [ ] Lớp lỗi ScreeningStepError { step: PARSE | EMBED | SCORE | EXPLAIN, cause }
- [ ] Export screenCv, ScreeningOutput, ScreeningStepError; cập nhật packages/ai/README.md
- [ ] Chạy screenCv trên 3 CV tập dev, đọc giải thích bằng mắt; báo TV2 bắt đầu W2-BE-02
- [ ] Push nhánh feat/W2-AI-03, tạo Pull Request

---

### [W2-BE-02] Tích hợp @hireflow/ai vào NestJS: AiModule, hàng đợi AI dùng chung, phân tích JD, lưu kết quả chấm CV
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
Nối package AI vào backend và lưu mọi kết quả AI vào DB. W2-BE-01 dùng lại phần này để chạy pipeline chấm CV.

**Tiêu chí hoàn thành**
- AiModule: tạo client bằng createAiClient (W1-AI-01) từ biến môi trường, inject qua provider
- AiQueueService: hàng đợi p-queue dùng chung cho mọi tác vụ AI, chạy song song tối đa 2 (cấu hình được) để không vượt quota Gemini
- Phân tích JD:
  - Khi tạo job, hoặc khi sửa nội dung JD (parsedJd bị đặt null ở W1-BE-04): đưa vào hàng đợi parseJd + embedJd
  - Lưu parsedJd (JSON) và embedding (`$executeRaw`, ép kiểu ::vector)
  - Hàm ensureJobAnalyzed(jobId): JD chưa phân tích thì phân tích ngay, BE-01 gọi trước khi chấm CV
- Lưu kết quả chấm CV (saveScreeningResult):
  - Application: parsedCv, embedding, aiRecommendation = PASS nếu điểm ≥ cvPassThreshold của job, ngược lại REJECT
  - ScreeningResult: điểm tổng, breakdown, explanation, timings (upsert, để chấm lại thì ghi đè)
- Không làm: tự chấm lại các CV cũ khi HR sửa JD (HR bấm "Chấm lại" nếu cần)

**Phụ thuộc:** W1-BE-04, W2-AI-01, W2-AI-03 (screenCv)

#### 1. AiModule + hàng đợi:
- [ ] Tạo AiModule: provider AI_CLIENT = createAiClient({ apiKey, models }) đọc từ ConfigService
- [ ] Truyền Logger của NestJS vào làm logger cho package AI
- [ ] Cài p-queue, viết AiQueueService.add(task) với concurrency từ biến AI_QUEUE_CONCURRENCY (mặc định 2)
- [ ] Kiểm tra p-queue import được trong NestJS (CommonJS); lỗi thì dùng dynamic import hoặc phiên bản hỗ trợ CJS

#### 2. Phân tích JD:
- [ ] Viết JobAnalysisService.analyzeJob(jobId): parseJd + embedJd
- [ ] Lưu parsedJd bằng Prisma, lưu embedding bằng $executeRaw (ép kiểu ::vector)
- [ ] Tạo job hoặc sửa nội dung JD (W1-BE-04) → đưa analyzeJob vào AiQueueService, API vẫn trả về ngay
- [ ] Viết ensureJobAnalyzed(jobId): parsedJd null thì gọi analyzeJob và chờ xong
- [ ] Phân tích JD lỗi: log, giữ parsedJd null (lần chấm CV sau sẽ thử lại)

#### 3. Lưu kết quả chấm + kiểm tra:
- [ ] Viết saveScreeningResult(applicationId, output): cập nhật parsedCv, aiRecommendation; lưu embedding bằng $executeRaw
- [ ] aiRecommendation = PASS nếu total ≥ cvPassThreshold của job, ngược lại REJECT
- [ ] Upsert ScreeningResult (total, breakdown, explanation, timings) để chấm lại thì ghi đè
- [ ] Tạo job mới → vài giây sau parsedJd và embedding có trong DB
- [ ] Gọi thử saveScreeningResult với output của screenCv trên 1 CV seed, GET /applications/:id hiện đủ dữ liệu
- [ ] Push nhánh feat/W2-BE-02, tạo Pull Request

---

### [W2-FE-02] Trang chi tiết ứng viên (HR): điểm, điểm mạnh, kỹ năng thiếu, trích dẫn CV, đề xuất AI, nút Duyệt/Loại
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
HR đọc giải thích của AI và ra quyết định cuối cùng cho vòng CV.

**Tiêu chí hoàn thành**
- Trang /hr/applications/:id
- Phần tổng quan: tên ứng viên, job, ngày nộp, trạng thái, điểm tổng, badge "Đề xuất AI: Đạt / Loại" (ghi rõ ngưỡng của job)
- Phần điểm thành phần: 5 thanh điểm theo breakdown của W2-AI-02
- Kỹ năng: khớp (xanh) / thiếu (đỏ), tách bắt buộc và ưu tiên
- Điểm mạnh kèm trích dẫn CV, nhận xét tóm tắt
- Nút "Xem CV gốc": mở link có chữ ký (GET /applications/:id/cv-url), nếu BE chưa có thì dùng cvUrl
- Nút "Duyệt (mời phỏng vấn)" và "Loại": chỉ hiện khi SCREENED; hộp xác nhận có ô ghi chú
- Nếu HR chọn khác đề xuất AI: hộp xác nhận hiện thêm dòng nhắc "Bạn đang chọn khác đề xuất của AI"
- Sau khi quyết định: cập nhật trạng thái, toast, invalidate danh sách W2-FE-01
- Hồ sơ đã quyết định: hiện ai quyết định, lúc nào, ghi chú
- (Có thể có) Timeline lịch sử trạng thái

**Phụ thuộc:** W2-FE-01; API W2-BE-04

#### 1. Hiển thị kết quả chấm:
- [ ] Thêm getApplication, getCvUrl, decideApplication vào src/api/applications.ts + hook
- [ ] Trang /hr/applications/:id: phần tổng quan (tên, job, ngày nộp, trạng thái, điểm tổng, badge đề xuất AI kèm ngưỡng)
- [ ] 5 thanh điểm thành phần theo breakdown (Progress của shadcn/ui)
- [ ] Kỹ năng khớp (xanh) / thiếu (đỏ), tách bắt buộc và ưu tiên
- [ ] Điểm mạnh kèm trích dẫn (dạng blockquote), nhận xét tóm tắt
- [ ] Nút "Xem CV gốc": gọi cv-url rồi mở tab mới; BE chưa có cv-url thì dùng cvUrl

#### 2. Duyệt / Loại:
- [ ] Nút "Duyệt (mời phỏng vấn)" và "Loại" chỉ hiện khi SCREENED
- [ ] AlertDialog xác nhận có ô ghi chú; chọn khác đề xuất AI thì hiện dòng nhắc
- [ ] Thành công: toast, invalidate chi tiết và danh sách ứng viên của job
- [ ] Lỗi 409 (hồ sơ đã được quyết định): toast + tải lại dữ liệu
- [ ] Hồ sơ đã quyết định: hiện người quyết định, thời gian, ghi chú thay cho 2 nút

#### 3. Kiểm tra:
- [ ] Hồ sơ đang chấm hoặc chấm lỗi: trang hiện thông báo phù hợp, không vỡ giao diện
- [ ] Duyệt 1 hồ sơ → trạng thái thành "Được mời phỏng vấn"; ứng viên thấy nút "Vào phỏng vấn" ở W2-FE-03
- [ ] Loại 1 hồ sơ có đề xuất AI "Đạt" → thấy dòng nhắc chọn khác AI
- [ ] Push nhánh feat/W2-FE-02, tạo Pull Request

---

### [W2-BE-01] Pipeline chấm CV chạy nền: tự chấm sau khi nộp, thử lại, chấm lại, khôi phục sau khi khởi động lại
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
Ghép mọi phần lại: ứng viên nộp CV là AI tự chấm ở nền, API nộp CV vẫn trả về ngay.

**Tiêu chí hoàn thành**
- Nghe sự kiện hồ sơ mới ở trạng thái SUBMITTED (W2-BE-03) → đưa vào AiQueueService (W2-BE-02)
- Pipeline screenApplication(applicationId):
  1. Chuyển SUBMITTED → SCREENING
  2. ensureJobAnalyzed(jobId)
  3. Gọi screenCv (W2-AI-03) với cvText đã lưu lúc nộp (W1-BE-05, không trích lại text)
  4. saveScreeningResult (W2-BE-02)
  5. Chuyển SCREENING → SCREENED
- Lỗi: chạy lại cả pipeline thêm 1 lần; vẫn lỗi thì chuyển SCREENING_FAILED, lưu lý do vào Application.screeningError
- POST /applications/:id/rescreen (HR sở hữu job): nhận từ SCREENED hoặc SCREENING_FAILED, chuyển SCREENING rồi đưa vào hàng đợi
- Khi server khởi động: tìm hồ sơ đang SUBMITTED hoặc SCREENING (bị dở do restart) và đưa lại vào hàng đợi
- Log mỗi lần chấm: applicationId, thời gian từng bước, kết quả; không log nội dung CV
- (Có thể có) Dùng BullMQ + Redis thay p-queue nếu dịch vụ deploy có Redis

**Phụ thuộc:** W2-BE-02, W2-BE-03, W2-AI-03

#### 1. Pipeline:
- [ ] Tạo ScreeningModule; listener nghe application.status_changed với to = SUBMITTED → AiQueueService.add(screenApplication)
- [ ] Viết screenApplication: SUBMITTED → SCREENING → ensureJobAnalyzed → screenCv(cvText) → saveScreeningResult → SCREENED
- [ ] Đọc cvText đã lưu lúc nộp, không tải lại file từ Cloudinary
- [ ] Log applicationId, thời gian từng bước, điểm; không log nội dung CV

#### 2. Lỗi + chấm lại:
- [ ] Bọc pipeline: lỗi lần 1 thì chạy lại cả pipeline (chờ vài giây); lỗi lần 2 thì dừng
- [ ] Dừng: chuyển SCREENING_FAILED, lưu screeningError (bước lỗi + mã lỗi, không lưu nội dung CV)
- [ ] POST /applications/:id/rescreen: HR sở hữu job, chỉ nhận từ SCREENED hoặc SCREENING_FAILED, khác thì 409
- [ ] Rescreen: xóa screeningError, chuyển SCREENING, đưa vào hàng đợi (bỏ bước SUBMITTED → SCREENING)

#### 3. Khôi phục + kiểm tra luồng đầu-cuối:
- [ ] onApplicationBootstrap: tìm hồ sơ SUBMITTED hoặc SCREENING, đưa lại vào hàng đợi
- [ ] Nộp 5 CV liền nhau → hàng đợi chạy tối đa 2 cùng lúc, tất cả lên SCREENED
- [ ] Đặt sai GEMINI_API_KEY → hồ sơ thành SCREENING_FAILED; sửa key, bấm chấm lại → SCREENED
- [ ] Tắt server lúc đang chấm, bật lại → hồ sơ dở được chấm tiếp
- [ ] Cả nhóm chạy luồng đầu-cuối: HR tạo job → ứng viên nộp CV → AI chấm → HR xem dashboard, chi tiết → duyệt → ứng viên thấy nút "Vào phỏng vấn"
- [ ] Push nhánh feat/W2-BE-01, tạo Pull Request

---

### [W2-AI-04] Đánh giá độ chính xác: chọn ngưỡng trên tập dev, báo cáo trên tập test, đo độ ổn định
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 2 - Sàng lọc CV & Dashboard HR

**Mục tiêu**
Chứng minh bằng số liệu khách quan rằng sàng lọc AI hoạt động đúng, đưa vào README và báo cáo.

**Tiêu chí hoàn thành**
- Script npm run eval -w packages/ai: chạy screenCv trên bộ dữ liệu W1-AI-06 (cvText trích bằng extractCvText)
- Chọn ngưỡng: thử 50 / 60 / 70 / 80 **chỉ trên tập dev**, chọn ngưỡng có F1 tốt nhất
- Báo cáo **trên tập test** với ngưỡng đã chọn: accuracy, precision, recall, F1, ma trận nhầm lẫn, kết quả theo từng JD
- Liệt kê các ca AI chấm sai trên tập test kèm lý do (đọc explanation)
- Độ ổn định: chạy 5 CV mỗi CV 3 lần, ghi độ lệch điểm lớn nhất (mục tiêu ±5)
- Thời gian xử lý trung bình mỗi CV và số token trung bình
- Chạy tuần tự, có nghỉ giữa các lần gọi để không vượt quota
- Kết quả lưu packages/ai/eval/results.md + results.json; ngưỡng mặc định gửi TV2 cập nhật vào cvPassThreshold mặc định (W1-BE-04)
- (Có thể có) Lưu tạm kết quả parse CV ra file để chạy lại không tốn quota

**Phụ thuộc:** W1-AI-02, W1-AI-06, W2-AI-03

#### 1. Script đánh giá:
- [ ] Tạo packages/ai/eval/run.ts, script npm run eval -w packages/ai
- [ ] Đọc labels.csv, extractCvText từng CV, parseJd + embedJd 3 JD một lần
- [ ] Chạy screenCv tuần tự cho từng cặp CV–JD, nghỉ giữa các lần gọi để không vượt quota
- [ ] Lưu điểm từng cặp ra file trung gian, chạy lại thì bỏ qua cặp đã có kết quả

#### 2. Chọn ngưỡng + báo cáo:
- [ ] Viết hàm tính accuracy, precision, recall, F1, ma trận nhầm lẫn (có unit test)
- [ ] Thử ngưỡng 50 / 60 / 70 / 80 chỉ trên tập dev, chọn ngưỡng F1 cao nhất
- [ ] Báo cáo trên tập test với ngưỡng đã chọn: chỉ số tổng + theo từng JD
- [ ] Liệt kê ca chấm sai trên tập test: CV, nhãn đúng, điểm AI, lý do theo explanation

#### 3. Độ ổn định + bàn giao:
- [ ] Chạy 5 CV mỗi CV 3 lần, ghi độ lệch điểm lớn nhất (mục tiêu ±5)
- [ ] Ghi thời gian xử lý và số token trung bình mỗi CV
- [ ] Xuất packages/ai/eval/results.md (bảng dễ đọc) + results.json
- [ ] Gửi ngưỡng đã chọn cho TV2 cập nhật mặc định cvPassThreshold (W1-BE-04)
- [ ] Push nhánh feat/W2-AI-04, tạo Pull Request

---

### [W2-FE-04] Thống kê dashboard HR: hồ sơ theo trạng thái, phân bố điểm, tỷ lệ AI đề xuất đạt
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Nên có
**Tuần:** 2 - Sàng lọc CV & Dashboard HR — làm sau khi xong hết thẻ Bắt buộc của tuần

**Mục tiêu**
HR nắm tổng quan tuyển dụng theo từng job.

**Tiêu chí hoàn thành**
- Trang /hr/stats (menu "Thống kê" ở sidebar), chọn job bằng dropdown
- Thẻ số liệu: tổng hồ sơ, đang chấm, đã duyệt, đã loại, tỷ lệ AI đề xuất đạt
- Biểu đồ cột: số hồ sơ theo trạng thái
- Biểu đồ phân bố điểm (khoảng 10 điểm) kèm vạch ngưỡng đạt của job
- Dùng Recharts; trạng thái loading, rỗng
- (Có thể có) Tỷ lệ HR đồng ý với đề xuất của AI
- Biểu đồ kết quả phỏng vấn làm ở W3-FE-03

**Phụ thuộc:** W2-FE-01; API GET /jobs/:jobId/stats (W2-BE-04)

#### 1. Trang + dữ liệu:
- [ ] Cài recharts
- [ ] Thêm getJobStats vào src/api/jobs.ts + hook useJobStats
- [ ] Trang /hr/stats, dropdown chọn job (dùng lại component của W2-FE-01)
- [ ] 4–5 thẻ số liệu: tổng hồ sơ, đang chấm, đã duyệt, đã loại, tỷ lệ AI đề xuất đạt

#### 2. Biểu đồ + kiểm tra:
- [ ] Biểu đồ cột: số hồ sơ theo trạng thái (dùng nhãn tiếng Việt)
- [ ] Biểu đồ phân bố điểm (khoảng 10 điểm) + vạch ngưỡng đạt (ReferenceLine)
- [ ] Trạng thái loading, rỗng (job chưa có hồ sơ)
- [ ] Kiểm tra số liệu khớp với danh sách ứng viên ở W2-FE-01
- [ ] Push nhánh feat/W2-FE-04, tạo Pull Request

---

## Backlog Week 3 (16 tasks)

### [W3-AI-01] Sinh bộ câu hỏi phỏng vấn từ JD + CV + kỹ năng còn thiếu (một lần khi bắt đầu phiên)
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — **làm đầu tuần**, W3-BE-01 cần hàm này

**Mục tiêu**
"Bộ não" của người phỏng vấn AI. Sinh trước toàn bộ câu hỏi trong một lần gọi Gemini khi phiên bắt đầu: ít tốn quota, không phải chờ giữa các câu, kết nối lại thì vẫn đúng câu. (Gộp nội dung thẻ "Sinh bộ câu hỏi phỏng vấn dựa trên JD và CV" đã lưu trữ.)

**Tiêu chí hoàn thành**
- Hàm generateQuestionPlan({ parsedJd, parsedCv, missingSkills, count }) trả danh sách { order, question, type, targetSkill }
  - type: TECHNICAL (chuyên môn), SITUATIONAL (tình huống), EXPERIENCE (kinh nghiệm thực tế)
  - Tỷ lệ gợi ý: khoảng một nửa TECHNICAL, phần còn lại chia đều SITUATIONAL và EXPERIENCE
  - Ít nhất 1 câu hỏi về kỹ năng bắt buộc còn thiếu ở vòng CV (lấy từ breakdown W2-AI-02), nếu có
  - Có câu hỏi dựa trên kinh nghiệm hoặc dự án cụ thể trong CV
- Đúng count câu (interviewQuestionCount của job, 3–10); sai số lượng thì retry 1 lần
- Câu hỏi tiếng Việt, ngắn (dưới 30 từ), một ý mỗi câu, dễ đọc thành tiếng; không hỏi về tuổi, giới tính, gia đình, quê quán
- Dùng generateStructured (W1-AI-01), temperature thấp vừa phải để câu hỏi tự nhiên nhưng ổn định
- (Có thể có) Hàm followUp(question, answer): câu trả lời quá ngắn hoặc lạc đề thì trả 1 câu hỏi vặn lại, không tính vào số câu

**Phụ thuộc:** W1-AI-03, W1-AI-04, W2-AI-02 (missingSkills)

#### 1. Schema + prompt:
- [ ] Viết schema Zod QuestionPlan: danh sách { order, question, type: TECHNICAL | SITUATIONAL | EXPERIENCE, targetSkill }
- [ ] Viết prompt: vai người phỏng vấn, đúng count câu, tỷ lệ loại câu, ưu tiên kỹ năng còn thiếu, dựa trên dự án trong CV
- [ ] Quy định trong prompt: tiếng Việt, dưới 30 từ, một ý mỗi câu, không hỏi tuổi, giới tính, gia đình, quê quán

#### 2. Hàm sinh câu hỏi:
- [ ] Viết generateQuestionPlan({ parsedJd, parsedCv, missingSkills, count }) dùng generateStructured
- [ ] Kiểm tra sau khi sinh: đúng số câu, order liên tục 1..count; sai thì retry 1 lần
- [ ] Export generateQuestionPlan và type QuestionPlan cho BE
- [ ] (Có thể có) Viết followUp(question, answer) trả câu hỏi vặn lại hoặc null

#### 3. Kiểm tra:
- [ ] Chạy trên 3 cặp CV–JD tập dev, đọc câu hỏi bằng mắt: đúng chủ đề, không trùng ý
- [ ] CV thiếu kỹ năng bắt buộc → có ít nhất 1 câu hỏi về kỹ năng đó
- [ ] Đọc to vài câu hỏi bằng speechSynthesis: nghe tự nhiên, không quá dài
- [ ] Push nhánh feat/W3-AI-01, tạo Pull Request; báo TV2 bắt đầu W3-BE-01

---

### [W3-BE-01] InterviewGateway (Socket.IO): vào phiên, bắt đầu, nhận câu trả lời, kết nối lại, kết thúc phiên
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — **chốt danh sách event với TV1 ngay đầu tuần**

**Mục tiêu**
Điều phối phiên phỏng vấn theo lượt giữa ứng viên và AI. Toàn bộ trạng thái phiên lưu trong DB, nên kết nối lại lúc nào cũng tiếp tục đúng chỗ.

**Kết nối**
- Namespace /interview; xác thực access token gửi trong handshake auth (dùng verifyToken của W1-BE-03)
- Token hết hạn hoặc sai → từ chối kết nối với mã lỗi rõ ràng để FE gọi /auth/refresh rồi kết nối lại
- FE kết nối cùng domain qua đường dẫn /socket.io: khi dev qua Vite proxy (W1-FE-06), khi deploy qua Caddy (W3-FE-05); CORS của socket vẫn cấu hình theo FRONTEND_ORIGIN để dự phòng
- Chỉ ứng viên sở hữu hồ sơ được vào phiên của mình

**Event**
- Client → server:
  - interview:join { interviewId } → server trả interview:state (trạng thái, câu hiện tại, các lượt đã trả lời)
  - interview:start { consent: true } → chỉ khi INTERVIEW_INVITED; lưu recordingConsentAt, gọi generateQuestionPlan (W3-AI-01), tạo sẵn InterviewTurn cho mọi câu, chuyển INTERVIEW_INVITED → INTERVIEWING, gửi câu đầu tiên
  - interview:answer { turnId, text, source: VOICE | TEXT, audioUrl?, transcriptEdited? } → chỉ nhận cho câu hiện tại; text không rỗng, tối đa 3.000 ký tự
- Server → client: interview:state, interview:preparing (đang sinh câu hỏi), interview:question { turnId, order, total, text }, interview:completed, interview:error { code, message }

**Tiêu chí hoàn thành**
- Trả lời câu cuối: lưu Interview.completedAt, gửi interview:completed, phát sự kiện nội bộ interview.completed (W3-BE-03 nghe để chấm)
- Gửi lại câu trả lời cho câu đã trả lời → bỏ qua, gửi lại interview:state (tránh trùng khi mạng chập chờn)
- Danh sách event và payload ghi vào docs/interview-events.md cho TV1
- Không làm: giới hạn thời gian mỗi câu, nhiều người cùng xem một phiên

**Phụ thuộc:** W1-BE-03, W2-BE-03, W2-BE-04 (tạo Interview khi HR duyệt), W3-AI-01

#### 1. Kết nối + xác thực:
- [ ] Viết docs/interview-events.md (tên event + payload), ngồi chốt với TV1 trước khi code
- [ ] Cài @nestjs/websockets, @nestjs/platform-socket.io; tạo InterviewGateway namespace /interview
- [ ] Xác thực token trong handshake.auth bằng verifyToken; sai hoặc hết hạn → từ chối kèm mã AUTH_EXPIRED / AUTH_INVALID
- [ ] Cấu hình CORS của socket theo FRONTEND_ORIGIN
- [ ] Hàm assertInterviewOwner(interviewId, userId) dùng chung cho gateway và W3-BE-02

#### 2. Event phiên phỏng vấn:
- [ ] interview:join → trả interview:state (status, câu hiện tại, các lượt đã trả lời)
- [ ] interview:start: kiểm tra consent, lưu recordingConsentAt, startedAt; gửi interview:preparing
- [ ] Gọi generateQuestionPlan (qua AiQueueService, ưu tiên cao), tạo sẵn InterviewTurn, chuyển INTERVIEWING, gửi câu 1
- [ ] Sinh câu hỏi lỗi → interview:error, giữ INTERVIEW_INVITED để ứng viên thử lại
- [ ] interview:answer: validate (câu hiện tại, text không rỗng, ≤ 3.000 ký tự), lưu answer, source, audioUrl, transcriptEdited, answeredAt
- [ ] Còn câu → gửi interview:question; hết câu → completedAt, interview:completed, phát sự kiện nội bộ interview.completed
- [ ] Câu trả lời gửi lại cho câu đã trả lời → bỏ qua, gửi lại interview:state

#### 3. Kiểm tra:
- [ ] Viết script thử bằng socket.io-client (hoặc Postman): join → start → trả lời hết → completed
- [ ] Ngắt kết nối giữa chừng, kết nối lại → join trả đúng câu đang dở
- [ ] Ứng viên khác vào phiên không phải của mình → bị từ chối
- [ ] Token hết hạn → bị từ chối với mã AUTH_EXPIRED
- [ ] Push nhánh feat/W3-BE-01, tạo Pull Request

---

### [W3-FE-01] Phòng phỏng vấn: giới thiệu, đồng ý ghi âm, kiểm tra mic, hỏi đáp theo lượt (chế độ chữ), kết nối lại
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — làm chế độ trả lời bằng chữ trước, giọng nói thêm ở W3-FE-02

**Mục tiêu**
Ứng viên hoàn thành được cả phiên phỏng vấn. Chế độ chữ làm trước vì đây cũng là phương án dự phòng khi mic hoặc nhận dạng giọng nói lỗi.

**Tiêu chí hoàn thành**
- Trang /candidate/interviews/:interviewId (thay trang placeholder ở W2-FE-03), gồm 4 màn hình:
  1. Giới thiệu: job, số câu hỏi, thời lượng dự kiến, cách trả lời
  2. Chuẩn bị: checkbox đồng ý ghi âm (bắt buộc), kiểm tra mic có thanh âm lượng; không có mic hoặc bị từ chối quyền thì chọn sẵn chế độ chữ
  3. Phỏng vấn: câu hỏi hiện tại, tiến độ (Câu 3/6), lịch sử các lượt đã trả lời, ô trả lời bằng chữ
  4. Hoàn thành: cảm ơn, kết quả sẽ báo trên trang "Hồ sơ của tôi"
- Kết nối socket.io-client tới namespace /interview cùng domain (dev qua Vite proxy, deploy qua Caddy), gửi access token trong auth
- Lỗi xác thực khi kết nối → gọi refreshSession() rồi kết nối lại bằng token mới
- Mỗi lần kết nối (cả kết nối lại) gửi interview:join và dựng giao diện theo interview:state
- Hiện "Đang chuẩn bị câu hỏi…" khi nhận interview:preparing
- Nút "Chuyển sang trả lời bằng chữ" luôn có (dùng khi W3-FE-02 đã thêm giọng nói)
- Mất kết nối: hiện banner "Đang kết nối lại…", khóa nút gửi
- Cảnh báo khi rời trang giữa phiên (beforeunload)
- Hồ sơ không ở INTERVIEW_INVITED / INTERVIEWING → hiện thông báo phù hợp

**Phụ thuộc:** W2-FE-03; W3-BE-01 (event ở docs/interview-events.md); proxy /socket.io ở W1-FE-06

#### 1. Màn hình:
- [ ] Route /candidate/interviews/:interviewId thay placeholder của W2-FE-03
- [ ] Màn hình Giới thiệu: job, số câu, thời lượng dự kiến, cách trả lời
- [ ] Màn hình Chuẩn bị: checkbox đồng ý ghi âm; kiểm tra mic bằng getUserMedia + AnalyserNode (thanh âm lượng); lỗi mic → chọn sẵn chế độ chữ
- [ ] Màn hình Phỏng vấn: câu hỏi hiện tại, tiến độ, lịch sử lượt, ô trả lời bằng chữ, nút gửi
- [ ] Màn hình Hoàn thành + thông báo khi hồ sơ không ở trạng thái phỏng vấn được

#### 2. Socket + kết nối lại:
- [ ] Cài socket.io-client; kết nối io('/interview') cùng domain (dev qua Vite proxy, deploy qua Caddy), không cần biến VITE_SOCKET_URL
- [ ] Hook useInterviewSocket(interviewId): kết nối namespace /interview, auth lấy token từ tokenStore
- [ ] connect_error AUTH_EXPIRED → refreshSession() → cập nhật auth → kết nối lại
- [ ] Mỗi lần connect → gửi interview:join, dựng giao diện theo interview:state
- [ ] Banner "Đang kết nối lại…" khi mất kết nối, khóa nút gửi; cảnh báo beforeunload khi đang phỏng vấn

#### 3. Kiểm tra:
- [ ] Từ trang "Hồ sơ của tôi" bấm "Vào phỏng vấn" → hoàn thành cả phiên bằng chữ
- [ ] Tải lại trang (F5) giữa phiên → quay lại đúng câu đang dở
- [ ] Tắt wifi vài giây rồi bật lại → tự kết nối lại, không mất câu trả lời đã gửi
- [ ] Ngồi chờ quá 15 phút (access token hết hạn) rồi trả lời tiếp → vẫn hoạt động
- [ ] Push nhánh feat/W3-FE-01, tạo Pull Request

---

### [W3-AI-04] Chuyển giọng nói thành văn bản (STT) bằng Gemini: chép nguyên văn, phát hiện không có lời nói
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc (cần cho phỏng vấn voice; thay cho thẻ "Chuyển audio thành text" đã lưu trữ)
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Biến câu trả lời bằng giọng nói thành text để phiên phỏng vấn và chấm điểm dùng.

**Lưu ý định dạng**
Gemini chỉ nhận audio WAV, MP3, AIFF, AAC, OGG Vorbis, FLAC. Chrome ghi âm ra webm nên **BE chuyển định dạng trước** (W3-BE-02, sang WAV 16kHz mono). Hàm này chỉ nhận các định dạng Gemini hỗ trợ.

**Tiêu chí hoàn thành**
- Hàm transcribe(audio: Uint8Array, mimeType) gửi audio dạng inline cho model audio (từ createAiClient)
- mimeType không thuộc danh sách hỗ trợ → ném lỗi ngay, không gọi Gemini
- Dùng generateStructured với schema { hasSpeech, transcript }
- Prompt: chép nguyên văn lời nói tiếng Việt, không tóm tắt, không sửa ý; giữ nguyên thuật ngữ tiếng Anh (React, API, SQL…); bỏ tiếng ồn, tiếng "ừm, à" kéo dài
- hasSpeech false hoặc transcript rỗng → ném SttError mã NO_SPEECH để FE gợi ý ghi âm lại
- Nhận dạng 1 câu trả lời khoảng 1 phút dưới khoảng 10 giây
- Thử trên ít nhất 5 đoạn ghi âm thật (ghi bằng Chrome, chuyển sang WAV), ghi lỗi thường gặp vào README

**Phụ thuộc:** W1-AI-01 — dùng bởi W3-BE-02

#### 1. Hàm transcribe:
- [ ] Viết transcribe(audio, mimeType) trong src/stt/transcribe.ts, dùng model audio từ createAiClient
- [ ] Chặn mimeType không thuộc audio/wav, audio/mp3, audio/aiff, audio/aac, audio/ogg, audio/flac
- [ ] Gửi audio inline kèm prompt chép nguyên văn; generateStructured schema { hasSpeech, transcript }, temperature 0
- [ ] Lớp lỗi SttError mã UNSUPPORTED_FORMAT, NO_SPEECH, STT_FAILED; chuẩn hóa transcript NFC, gộp khoảng trắng

#### 2. Kiểm tra:
- [ ] Ghi 5 đoạn trả lời mẫu bằng Chrome (có thuật ngữ tiếng Anh), chuyển sang WAV bằng ffmpeg, lưu vào fixtures/audio
- [ ] Chạy transcribe, so với lời nói thật, ghi thời gian xử lý
- [ ] Thử 1 đoạn im lặng → NO_SPEECH; thử file webm → UNSUPPORTED_FORMAT
- [ ] Ghi lỗi nhận dạng thường gặp vào packages/ai/README.md; push nhánh feat/W3-AI-04, tạo Pull Request

---

### [W3-BE-02] API nhận audio câu trả lời: kiểm tra, chuyển sang WAV bằng ffmpeg, lưu Cloudinary, nhận dạng giọng nói
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc (phỏng vấn voice là tính năng chính)
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Nhận file ghi âm câu trả lời và trả transcript để ứng viên xem lại trước khi gửi.

**Tiêu chí hoàn thành**
- POST /interviews/:interviewId/turns/:turnId/audio (`@Roles('CANDIDATE')`), Multer lưu trong bộ nhớ, field "audio"
- Chỉ ứng viên sở hữu phiên; phiên đang INTERVIEWING; turnId là câu hiện tại chưa trả lời
- Nhận audio/webm, audio/mp4, audio/ogg, audio/wav; tối đa 5MB (khoảng 2 phút)
- **Chuyển sang WAV 16kHz mono bằng ffmpeg** (gói ffmpeg-static), vì Gemini không nhận webm
- Upload file gốc lên Cloudinary (resource_type video, thư mục interviews/), trả audioUrl
- Gọi transcribe (W3-AI-04) qua AiQueueService với độ ưu tiên cao hơn tác vụ chấm CV, để ứng viên không phải chờ sau hàng đợi
- Trả { transcript, audioUrl }; FE dùng gửi kèm interview:answer
- Lỗi trả 422 kèm mã: AUDIO_TOO_LARGE, AUDIO_UNSUPPORTED, NO_SPEECH, STT_FAILED (FE gợi ý ghi âm lại hoặc chuyển sang chữ)
- Xóa file tạm sau khi chuyển định dạng

**Phụ thuộc:** W2-BE-02 (AiQueueService), W3-BE-01, W3-AI-04

#### 1. Nhận file + kiểm tra:
- [ ] POST /interviews/:interviewId/turns/:turnId/audio: Multer memoryStorage, field "audio", tối đa 5MB
- [ ] Kiểm tra quyền (assertInterviewOwner), phiên INTERVIEWING, turnId là câu hiện tại
- [ ] Chỉ nhận audio/webm, audio/mp4, audio/ogg, audio/wav (bỏ phần ;codecs=… khi so); sai → 422 AUDIO_UNSUPPORTED

#### 2. Chuyển định dạng + nhận dạng:
- [ ] Cài ffmpeg-static (+ fluent-ffmpeg nếu cần); viết AudioService.toWav(buffer): WAV 16kHz mono
- [ ] Dùng thư mục tạm của hệ điều hành, xóa file tạm trong finally
- [ ] Upload file gốc lên Cloudinary (resource_type video, thư mục interviews/), lấy audioUrl
- [ ] Gọi transcribe(wav, 'audio/wav') qua AiQueueService với priority cao (p-queue option priority)
- [ ] Trả { transcript, audioUrl }; map SttError sang 422 NO_SPEECH / STT_FAILED kèm thông báo tiếng Việt

#### 3. Kiểm tra:
- [ ] Gửi file webm ghi từ Chrome → nhận transcript đúng
- [ ] Gửi file mp4 ghi từ Safari iPhone → nhận transcript đúng
- [ ] File 6MB → 422 AUDIO_TOO_LARGE; đoạn im lặng → 422 NO_SPEECH
- [ ] Kiểm tra thư mục tạm không còn file sót sau nhiều lần gọi
- [ ] Push nhánh feat/W3-BE-02, tạo Pull Request

---

### [W3-FE-02] Chế độ giọng nói: đọc câu hỏi, ghi âm câu trả lời, xem và sửa transcript trước khi gửi
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc (phỏng vấn voice là tính năng chính)
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Thêm phần âm thanh vào phòng phỏng vấn W3-FE-01.

**Tiêu chí hoàn thành**
- Đọc câu hỏi bằng speechSynthesis, chọn giọng vi-VN nếu trình duyệt có; không có thì chỉ hiện chữ; nút "Nghe lại"
- Ghi âm bằng MediaRecorder:
  - Chọn mimeType trình duyệt hỗ trợ (MediaRecorder.isTypeSupported): webm/opus trên Chrome, Edge; mp4 trên Safari
  - Nút bắt đầu / dừng, đồng hồ đếm, tự dừng ở 2 phút, thanh âm lượng khi đang ghi
- Gửi file lên API W3-BE-02, hiện "Đang nhận dạng…"
- Hiện transcript trong ô cho phép sửa lỗi nhận dạng nhỏ; nút "Ghi âm lại" và "Gửi câu trả lời"
- Gửi interview:answer với source VOICE, audioUrl, transcriptEdited (true nếu ứng viên đã sửa)
- Lỗi NO_SPEECH / STT_FAILED: thông báo, cho ghi lại; lỗi 2 lần liên tiếp thì gợi ý chuyển sang trả lời bằng chữ
- Đã thử trên Chrome, Edge và Safari (iPhone)

**Phụ thuộc:** W3-FE-01; API W3-BE-02

#### 1. Đọc câu hỏi:
- [ ] Hook useSpeak(): speechSynthesis, chọn giọng vi-VN (đợi sự kiện voiceschanged)
- [ ] Tự đọc khi nhận câu hỏi mới; nút "Nghe lại"; không có giọng tiếng Việt thì chỉ hiện chữ
- [ ] Dừng đọc khi ứng viên bấm ghi âm

#### 2. Ghi âm + gửi:
- [ ] Hook useRecorder(): chọn mimeType bằng MediaRecorder.isTypeSupported (audio/webm;codecs=opus, rồi audio/mp4)
- [ ] Nút bắt đầu / dừng, đồng hồ đếm, tự dừng ở 2 phút, thanh âm lượng (dùng lại AnalyserNode của W3-FE-01)
- [ ] Upload lên POST /interviews/:id/turns/:turnId/audio, hiện "Đang nhận dạng…"
- [ ] Hiện transcript trong ô sửa được; nút "Ghi âm lại" và "Gửi câu trả lời"
- [ ] Gửi interview:answer với source VOICE, audioUrl, transcriptEdited
- [ ] Lỗi NO_SPEECH / STT_FAILED: thông báo, cho ghi lại; 2 lần liên tiếp thì gợi ý chuyển sang chữ

#### 3. Kiểm tra trên trình duyệt:
- [ ] Chrome: trả lời cả phiên bằng giọng nói
- [ ] Edge: ghi âm và nhận dạng được
- [ ] Safari iPhone (trên bản deploy HTTPS): ghi âm mp4, nhận dạng được
- [ ] Trộn: vài câu giọng nói, vài câu chữ trong cùng một phiên
- [ ] Push nhánh feat/W3-FE-02, tạo Pull Request

---

### [W3-BE-05] Đóng gói Docker (api + db) và deploy lên EC2: docker compose, GitHub Actions, domain, backup
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend (TV1 làm image web ở W3-FE-05)
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — **deploy lần đầu giữa tuần** với code đang có, deploy lại cuối tuần

**Mục tiêu**
Toàn bộ hệ thống chạy bằng docker compose trên một máy EC2, sau một domain có HTTPS. FE, API và WebSocket dùng chung domain, nên không có vấn đề cookie khác site hay CORS.

**Kiến trúc**
- EC2 (docker compose), 3 service:
  - web: Caddy, lo HTTPS (Let's Encrypt tự động) + phục vụ FE tĩnh + chuyển /api và /socket.io vào api (W3-FE-05)
  - api: NestJS (có ffmpeg, build kèm packages/ai)
  - db: pgvector/pgvector:pg16 + volume, không mở cổng ra ngoài
- S3: bucket riêng lưu backup DB, tách khỏi máy chủ

**Tiêu chí hoàn thành**
- apps/api/Dockerfile nhiều stage (node:24-slim): build packages/ai + apps/api, prisma generate; stage chạy chỉ chứa bản build, chạy bằng user thường
- Container api khi khởi động chạy prisma migrate deploy rồi mới start
- docker-compose.prod.yml gồm web, api, db; restart: unless-stopped; healthcheck cho api (GET /api/health) và db
- Biến môi trường để trong file .env trên server, không đóng vào image: DATABASE_URL (trỏ db:5432), JWT_*, COOKIE_SECURE=true, FRONTEND_ORIGIN=https://<domain>, GEMINI_*, CLOUDINARY_*, RESEND_*, AI_QUEUE_CONCURRENCY, INTERVIEW_PASS_THRESHOLD
- NestJS bật trust proxy (chạy sau Caddy) để cookie secure và IP cho throttler đúng
- GitHub Actions build image api + web, đẩy lên GitHub Container Registry (GHCR); EC2 chỉ pull về chạy, không build trên máy chủ (máy nhỏ dễ hết RAM)
- EC2 Ubuntu, khuyến nghị t3.small (2GB RAM); nếu dùng máy 1GB thì thêm swap 2GB; gắn Elastic IP
- Security Group chỉ mở 80, 443 và 22 (22 chỉ cho IP của nhóm)
- Bản ghi A của domain trỏ về Elastic IP
- Script deploy.sh trên server: pull image mới, docker compose up -d
- Backup DB lên Amazon S3:
  - Bucket riêng (VD hireflow-db-backup): bật Block Public Access, mã hóa mặc định, Lifecycle tự xóa bản cũ hơn 30 ngày
  - IAM Role gắn vào EC2, chỉ có quyền ghi và đọc đúng bucket này; không đặt access key AWS trên server
  - Cron 3 giờ sáng hằng ngày: pg_dump trong container db → nén gzip → tên file có ngày giờ → aws s3 cp lên bucket
  - Trên EC2 chỉ giữ 3 bản gần nhất; bản cũ hơn nằm trên S3
  - Đã thử khôi phục 1 lần từ một bản tải về từ S3
- README ghi cách deploy, xem log, khởi động lại, khôi phục backup từ S3
- Kiểm tra chi phí và gói Free Tier/credit của tài khoản AWS trước khi chọn cỡ máy

**Phụ thuộc:** các thẻ BE tuần 1–2; W3-FE-05 (image web); deploy lại sau các thẻ BE tuần 3

#### 1. Đóng gói Docker (api):
- [ ] Viết apps/api/Dockerfile nhiều stage (node:24-slim): cài dependency của workspace, build packages/ai rồi apps/api, chạy prisma generate
- [ ] Stage chạy: chỉ copy bản build + node_modules production + prisma; có ffmpeg (ffmpeg-static hoặc cài bằng apt); chạy bằng user thường
- [ ] Lệnh khởi động container: prisma migrate deploy rồi node dist/main.js
- [ ] Viết .dockerignore (node_modules, .env, dist, fixtures); build thử image trên máy, chạy thử được
- [ ] Viết GET /api/health (`@Public()`): trả ok + kiểm tra kết nối DB, dùng cho healthcheck

#### 2. docker compose + GitHub Actions:
- [ ] Viết docker-compose.prod.yml: web (image của W3-FE-05), api, db (pgvector/pgvector:pg16 + volume pgdata, không mở cổng ra ngoài); restart: unless-stopped; healthcheck api và db
- [ ] Tạo .env.production.example; file .env thật chỉ để trên server (DATABASE_URL trỏ db:5432, COOKIE_SECURE=true, FRONTEND_ORIGIN=https://<domain>, …)
- [ ] Bật trust proxy trong NestJS (chạy sau Caddy) để cookie secure và IP cho throttler đúng
- [ ] GitHub Actions: khi push main (hoặc chạy tay), build image api + web, đẩy lên GHCR với tag theo commit và latest
- [ ] Chạy thử cả docker-compose.prod.yml trên máy (domain localhost) trước khi lên EC2

#### 3. EC2 + domain + kiểm tra:
- [ ] Tạo EC2 Ubuntu (t3.small, hoặc máy 1GB + swap 2GB), gắn Elastic IP; Security Group mở 80, 443 và 22 (chỉ IP nhóm)
- [ ] Cài Docker + compose plugin, đăng nhập GHCR; trỏ bản ghi A của domain về Elastic IP
- [ ] Viết deploy.sh (pull image mới, docker compose up -d); deploy lần 1 giữa tuần, mở https://<domain>/api/health thấy ok
- [ ] Ghi vào README: cách deploy, xem log (docker compose logs -f api), khởi động lại, khôi phục backup từ S3
- [ ] Cùng TV1 thử trên bản deploy (đăng nhập, nộp CV, socket, ffmpeg); deploy lần 2 cuối tuần sau khi xong mọi thẻ, thử lại

#### 4. Backup lên S3:
- [ ] Tạo bucket S3 riêng (VD hireflow-db-backup), cùng region với EC2: bật Block Public Access, mã hóa mặc định
- [ ] Đặt Lifecycle Rule: tự xóa object cũ hơn 30 ngày
- [ ] Tạo IAM Role cho EC2 với policy chỉ cho s3:PutObject, s3:GetObject, s3:ListBucket trên đúng bucket này; gắn Role vào instance (không dùng access key)
- [ ] Cài AWS CLI trên EC2, chạy thử aws s3 ls s3://<bucket> để kiểm tra quyền của Role
- [ ] Viết backup.sh: docker compose exec -T db pg_dump → gzip → file backup-YYYYMMDD-HHMM.sql.gz → aws s3 cp lên bucket; xóa bản local, chỉ giữ 3 bản gần nhất
- [ ] Đặt cron chạy backup.sh lúc 3 giờ sáng hằng ngày, ghi log ra file; chạy tay 1 lần, thấy file mới trên S3
- [ ] Thử khôi phục: tải 1 bản từ S3, nạp vào một DB trống (container tạm), kiểm tra có đủ bảng và dữ liệu

---

### [W3-FE-05] Image web (Caddy: HTTPS + FE tĩnh + reverse proxy /api, /socket.io) + rà soát responsive, loading, lỗi
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend (phối hợp TV2 ở W3-BE-05)
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — **deploy lần đầu giữa tuần** cùng W3-BE-05, deploy lại cuối tuần

**Mục tiêu**
Đóng gói FE thành image chạy trên EC2. Caddy vừa phục vụ FE, vừa làm cổng HTTPS duy nhất cho cả hệ thống. Web đủ ổn để demo trên máy tính và điện thoại.

**Tiêu chí hoàn thành**
- apps/web/Dockerfile nhiều stage: node:24-slim build Vite → caddy:2-alpine chứa thư mục dist
- Caddyfile cho domain của nhóm:
  - /api/* → reverse_proxy api:3000
  - /socket.io/* → reverse_proxy api:3000 (Caddy tự hỗ trợ WebSocket)
  - Còn lại: phục vụ file tĩnh, đường dẫn không tồn tại trả index.html (tải lại trang ở /hr/... không bị 404)
- Caddy tự xin và gia hạn chứng chỉ HTTPS (bắt buộc để trình duyệt cho dùng mic, cookie Secure hoạt động); volume caddy_data giữ chứng chỉ
- FE gọi /api và kết nối socket cùng domain, không cần biến môi trường riêng cho bản deploy
- Service web trong docker-compose.prod.yml mở cổng 80 và 443
- (Nên có) Header cache: file có hash cache lâu, index.html không cache
- Rà soát mọi trang: loading, rỗng, lỗi; giao diện mobile
- Kiểm tra trên bản deploy: đăng nhập, tải lại trang giữ phiên (cả Safari iPhone), nộp CV, phỏng vấn voice

**Phụ thuộc:** W3-BE-05

#### 1. Image web (Caddy):
- [ ] Viết apps/web/Dockerfile nhiều stage: node:24-slim build Vite → caddy:2-alpine chứa dist
- [ ] Caddyfile: /api/* và /socket.io/* → reverse_proxy api:3000
- [ ] Caddyfile: còn lại phục vụ file tĩnh, đường dẫn không tồn tại trả index.html (try_files {path} /index.html)
- [ ] Tên domain lấy từ biến môi trường của Caddy; volume caddy_data giữ chứng chỉ HTTPS; service web mở cổng 80, 443 trong docker-compose.prod.yml
- [ ] (Nên có) Header cache: file có hash cache lâu, index.html không cache

#### 2. Rà soát giao diện:
- [ ] Đi qua từng trang: có loading, trạng thái rỗng, thông báo lỗi
- [ ] Kiểm tra mobile 375px: bảng chuyển sang dạng thẻ hoặc cuộn ngang, nút bấm đủ lớn
- [ ] Đặt title, favicon, trang 404 thân thiện

#### 3. Kiểm tra trên bản deploy:
- [ ] Deploy lần 1 (giữa tuần): đăng nhập, tải lại trang ở /hr/jobs không bị 404, vẫn giữ phiên
- [ ] Safari iPhone: đăng nhập, tải lại trang vẫn giữ phiên (cookie cùng domain qua Caddy)
- [ ] Vào phòng phỏng vấn trên bản deploy: socket kết nối được, mic xin quyền được (HTTPS)
- [ ] Deploy lần 2 (cuối tuần) sau khi xong mọi thẻ FE, chạy lại các bước trên

---

### [W3-AI-02] Chấm phiên phỏng vấn theo rubric: chuyên môn, giao tiếp, mức độ phù hợp, có bằng chứng
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Chấm phiên phỏng vấn nhất quán, mỗi điểm đều có bằng chứng từ câu trả lời để HR kiểm tra.

**Tiêu chí hoàn thành**
- Hàm scoreInterview({ turns, parsedJd, weights }) với turns gồm câu hỏi, loại câu, câu trả lời, nguồn (VOICE/TEXT)
- 3 tiêu chí, mỗi tiêu chí 0–10, có rubric mô tả từng mức trong prompt:
  - Chuyên môn: độ đúng và sâu của kiến thức so với yêu cầu JD
  - Giao tiếp: rõ ràng, có cấu trúc, trả lời đúng trọng tâm câu hỏi
  - Mức độ phù hợp: kinh nghiệm và cách xử lý tình huống khớp với vị trí
- Mỗi tiêu chí có nhận xét ngắn + 1–2 trích dẫn từ câu trả lời; trích dẫn kiểm chứng như W2-AI-03 (không thấy thì bỏ)
- Điểm tổng 0–100 tính bằng code theo trọng số rubric của job (W1-BE-04), không để Gemini tự cộng
- Câu trả lời bằng giọng nói có thể sai chính tả do nhận dạng: prompt dặn không trừ điểm vì lỗi này
- Câu bỏ trống hoặc quá ngắn: điểm thấp ở tiêu chí liên quan, ghi rõ trong nhận xét
- Temperature 0; chạy lại cùng một phiên 3 lần, điểm tổng chênh không quá ±5
- Việc so điểm với ngưỡng để ra đề xuất Đạt/Không đạt làm ở BE (W3-BE-03)

**Phụ thuộc:** W3-AI-01, W2-AI-03 (hàm kiểm chứng trích dẫn)

#### 1. Prompt + rubric:
- [ ] Viết schema Zod InterviewScore: 3 tiêu chí { score 0–10, comment, evidence[] }
- [ ] Viết rubric từng mức (0–3 / 4–6 / 7–8 / 9–10) cho chuyên môn, giao tiếp, mức độ phù hợp
- [ ] Prompt dặn: không trừ điểm lỗi chính tả do nhận dạng giọng nói; câu bỏ trống hoặc quá ngắn thì nêu rõ

#### 2. Tính điểm + bằng chứng:
- [ ] Viết scoreInterview({ turns, parsedJd, weights }) dùng generateStructured, temperature 0
- [ ] Tính điểm tổng 0–100 bằng code: Σ (điểm tiêu chí × 10 × trọng số) / 100, làm tròn
- [ ] Kiểm chứng evidence với nội dung câu trả lời (dùng lại normalizeForMatch của W2-AI-03), không thấy thì bỏ
- [ ] Export scoreInterview, type InterviewScore

#### 3. Kiểm tra:
- [ ] Tạo 3 phiên mẫu (trả lời tốt, trung bình, kém) trong fixtures/interviews
- [ ] Điểm 3 phiên mẫu xếp đúng thứ tự tốt > trung bình > kém
- [ ] Chạy mỗi phiên 3 lần: điểm tổng chênh không quá ±5
- [ ] Unit test phần tính điểm tổng theo trọng số (không gọi Gemini)
- [ ] Push nhánh feat/W3-AI-02, tạo Pull Request

---

### [W3-AI-03] Sinh phản hồi kỹ năng cho ứng viên + hàm tổng evaluateInterview() cho BE gọi
**Labels:** AI/Pipeline

**Mô tả:**
**Người làm:** TV3 - AI
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Phản hồi mang tính xây dựng cho ứng viên (hiển thị ở W3-FE-04, gửi trong email W3-BE-07). Gói phần chấm và phản hồi vào một hàm để BE gọi một lần.

**Tiêu chí hoàn thành**
- Hàm generateFeedback({ screening, interviewScore, parsedJd }) trả:
  - strengths: 2–3 điểm mạnh
  - improvements: kỹ năng hoặc khía cạnh cần cải thiện
  - suggestions: 2–3 gợi ý học hoặc luyện tập cụ thể (chủ đề, loại bài tập)
- Dựa trên cả vòng CV (breakdown, explanation của W2-AI-03) và vòng phỏng vấn (W3-AI-02)
- Giọng văn lịch sự, khích lệ; không lộ điểm số, đề xuất AI, ngưỡng hay so sánh với ứng viên khác
- Tiếng Việt, tổng cộng tối đa khoảng 200 từ
- Hàm tổng evaluateInterview({ turns, parsedJd, weights, screening }): scoreInterview → generateFeedback
  - Trả { score, feedback, timings }
  - Lỗi ở bước nào thì ném lỗi ghi tên bước (như ScreeningStepError)
- Export evaluateInterview, type InterviewEvaluation; cập nhật packages/ai/README.md

**Phụ thuộc:** W3-AI-02

#### 1. Phản hồi cho ứng viên:
- [ ] Viết schema Zod Feedback: strengths[], improvements[], suggestions[]
- [ ] Viết generateFeedback: dựa trên kết quả vòng CV + vòng phỏng vấn, giọng khích lệ, tối đa khoảng 200 từ
- [ ] Kiểm tra sau khi sinh: không chứa số điểm, chữ "ngưỡng", "đề xuất AI" hay so sánh với người khác
- [ ] Đọc phản hồi của 3 phiên mẫu bằng mắt: gợi ý cụ thể, không chung chung

#### 2. Hàm tổng evaluateInterview:
- [ ] Viết evaluateInterview({ turns, parsedJd, weights, screening }): scoreInterview → generateFeedback
- [ ] Đo thời gian từng bước; lỗi ném InterviewStepError { step: SCORE | FEEDBACK, cause }
- [ ] Export evaluateInterview, type InterviewEvaluation; cập nhật packages/ai/README.md
- [ ] Push nhánh feat/W3-AI-03, tạo Pull Request; báo TV2 bắt đầu W3-BE-03

---

### [W3-BE-03] Đánh giá phỏng vấn chạy nền, lưu kết quả + transcript, API xem kết quả, HR quyết định Đạt/Không đạt
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Phiên kết thúc là AI tự chấm ở nền. HR xem kết quả rồi quyết định cuối cùng, cùng nguyên tắc "AI gợi ý, HR xác nhận" như vòng CV.

**Đánh giá chạy nền**
- Nghe interview.completed (W3-BE-01) → đưa evaluateInterview (W3-AI-03) vào AiQueueService
- Lưu InterviewResult: điểm 3 tiêu chí, điểm tổng, nhận xét, bằng chứng, feedback, aiRecommendation = PASS nếu điểm tổng ≥ INTERVIEW_PASS_THRESHOLD (biến môi trường, mặc định 60)
- Chuyển INTERVIEWING → EVALUATED
- Lỗi: chạy lại 1 lần; vẫn lỗi thì lưu Interview.evaluationError, giữ INTERVIEWING
- POST /interviews/:id/re-evaluate (HR sở hữu job): chạy lại đánh giá
- Khi server khởi động: phiên đã completedAt nhưng chưa có kết quả → đưa lại vào hàng đợi
- Ghép transcript thành file .txt, upload Cloudinary (raw), lưu transcriptUrl

**API**
- GET /applications/:id/interview (HR sở hữu job): các lượt hỏi đáp (kèm nguồn, audioUrl), điểm, nhận xét, bằng chứng, aiRecommendation, quyết định của HR, evaluationError
- POST /applications/:id/interview-decision { decision: "PASS" | "FAIL", note? }: chỉ khi EVALUATED; lưu người quyết định, thời gian, ghi chú; chuyển PASSED / FAILED
- GET /me/applications/:id/feedback (ứng viên sở hữu): chỉ khi PASSED / FAILED; trả kết quả + feedback, không trả điểm
- (Nên có) GET /jobs/:jobId/interview-stats: phân bố điểm phỏng vấn, tỷ lệ đạt (cho W3-FE-03)

**Phụ thuộc:** W2-BE-02, W2-BE-03, W3-BE-01, W3-AI-03

#### 1. Đánh giá chạy nền:
- [ ] InterviewEvaluationService nghe interview.completed → đưa evaluateInterview vào AiQueueService
- [ ] Chuẩn bị đầu vào: turns, parsedJd, trọng số rubric của job, ScreeningResult của hồ sơ
- [ ] Lưu InterviewResult + aiRecommendation (so với INTERVIEW_PASS_THRESHOLD, mặc định 60); chuyển INTERVIEWING → EVALUATED
- [ ] Lỗi: chạy lại 1 lần; vẫn lỗi thì lưu evaluationError, giữ INTERVIEWING
- [ ] onApplicationBootstrap: phiên có completedAt mà chưa có InterviewResult → đưa lại vào hàng đợi
- [ ] Ghép transcript thành .txt, upload Cloudinary (raw), lưu transcriptUrl

#### 2. API:
- [ ] Cập nhật Swagger trước cho các endpoint của thẻ, báo TV1 mock
- [ ] GET /applications/:id/interview (HR sở hữu job)
- [ ] POST /applications/:id/interview-decision: chỉ EVALUATED, lưu decisionBy/At/Note, chuyển PASSED / FAILED
- [ ] POST /interviews/:id/re-evaluate (HR sở hữu job): xóa evaluationError, đưa lại vào hàng đợi
- [ ] GET /me/applications/:id/feedback: chỉ PASSED / FAILED, không trả điểm; trạng thái khác trả { status } để FE hiện "Đang chờ kết quả"
- [ ] (Nên có) GET /jobs/:jobId/interview-stats

#### 3. Kiểm tra:
- [ ] Hoàn thành 1 phiên → vài giây sau hồ sơ thành EVALUATED, có InterviewResult và transcriptUrl
- [ ] HR quyết định PASS → PASSED; ứng viên xem được feedback, không thấy điểm
- [ ] Quyết định lại hồ sơ đã có kết quả → 409; ứng viên khác xem feedback → 403
- [ ] Đặt sai API key → evaluationError; sửa key, bấm đánh giá lại → EVALUATED
- [ ] Push nhánh feat/W3-BE-03, tạo Pull Request

---

### [W3-FE-03] HR xem kết quả phỏng vấn: hội thoại, điểm từng tiêu chí, bằng chứng, đề xuất AI, nút Đạt/Không đạt
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
HR xem toàn bộ phiên phỏng vấn, đánh giá của AI và ra quyết định cuối cùng.

**Tiêu chí hoàn thành**
- Thêm tab "Phỏng vấn" vào trang chi tiết ứng viên /hr/applications/:id (W2-FE-02); tab "Hồ sơ CV" giữ nguyên
- Hội thoại dạng chat: câu hỏi AI / câu trả lời ứng viên; badge Giọng nói / Chữ; đánh dấu "đã sửa" nếu ứng viên sửa transcript
- (Có thể có) Nút nghe lại audio từng câu trả lời
- 3 thanh điểm tiêu chí + điểm tổng; nhận xét và bằng chứng (trích câu trả lời) cho từng tiêu chí
- Badge "Đề xuất AI: Đạt / Không đạt"
- Nút "Đạt" và "Không đạt": chỉ hiện khi EVALUATED; hộp xác nhận có ghi chú; chọn khác đề xuất AI thì hiện dòng nhắc
- Phiên chưa xong hoặc đang chấm: hiện trạng thái phù hợp; có evaluationError thì hiện nút "Đánh giá lại"
- (Nên có) Biểu đồ kết quả phỏng vấn của job ở trang /hr/stats (chuyển từ W2-FE-04)

**Phụ thuộc:** W2-FE-02; API W3-BE-03

#### 1. Tab Phỏng vấn:
- [ ] Thêm getApplicationInterview, decideInterview, reEvaluateInterview vào src/api + hook
- [ ] Tách trang /hr/applications/:id thành 2 tab (Tabs của shadcn/ui): "Hồ sơ CV" và "Phỏng vấn"
- [ ] Hội thoại dạng chat, badge Giọng nói / Chữ, dấu "đã sửa"
- [ ] 3 thanh điểm tiêu chí, điểm tổng, nhận xét + bằng chứng, badge đề xuất AI
- [ ] (Có thể có) Nút nghe lại audio (thẻ audio với audioUrl)

#### 2. Quyết định Đạt / Không đạt:
- [ ] Nút "Đạt" và "Không đạt" chỉ khi EVALUATED; AlertDialog có ghi chú, nhắc khi chọn khác đề xuất AI
- [ ] Thành công: toast, invalidate chi tiết và danh sách ứng viên
- [ ] Đang chấm: "AI đang đánh giá…" + tự làm mới; có evaluationError: nút "Đánh giá lại"
- [ ] Đã quyết định: hiện người quyết định, thời gian, ghi chú

#### 3. Kiểm tra:
- [ ] Phiên mới hoàn thành → thấy "AI đang đánh giá…" rồi tự hiện kết quả
- [ ] Bấm "Đạt" → trạng thái đổi; ứng viên thấy "Xem phản hồi"
- [ ] (Nên có) Biểu đồ kết quả phỏng vấn ở /hr/stats
- [ ] Push nhánh feat/W3-FE-03, tạo Pull Request

---

### [W3-FE-04] Trang ứng viên xem kết quả và phản hồi kỹ năng sau phỏng vấn
**Labels:** Frontend

**Mô tả:**
**Người làm:** TV1 - Frontend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Ứng viên nhận phản hồi hữu ích sau phỏng vấn, kể cả khi không đạt.

**Tiêu chí hoàn thành**
- Trang /candidate/applications/:id/feedback (thay placeholder ở W2-FE-03)
- Kết quả: "Đạt" hoặc "Chưa đạt", lời nhắn phù hợp với từng kết quả
- Phản hồi từ W3-AI-03: điểm mạnh, điểm cần cải thiện, gợi ý luyện tập
- Không hiện điểm số, đề xuất AI hay ngưỡng
- Chưa có quyết định của HR: hiện "Đang chờ kết quả" thay vì lỗi
- Vào được từ nút "Xem phản hồi" ở W2-FE-03 và từ link trong email (W3-BE-07)
- Giao diện ổn trên mobile

**Phụ thuộc:** W2-FE-03; API GET /me/applications/:id/feedback (W3-BE-03)

#### 1. Trang phản hồi:
- [ ] Thêm getMyFeedback vào src/api + hook
- [ ] Route /candidate/applications/:id/feedback thay placeholder của W2-FE-03
- [ ] Phần kết quả: "Đạt" / "Chưa đạt" kèm lời nhắn phù hợp
- [ ] 3 khối: điểm mạnh, cần cải thiện, gợi ý luyện tập
- [ ] Chưa có kết quả: "Đang chờ kết quả", nút quay lại "Hồ sơ của tôi"

#### 2. Kiểm tra:
- [ ] Kiểm tra cả 3 trường hợp: Đạt, Chưa đạt, chưa có kết quả
- [ ] Kiểm tra không có chỗ nào hiện điểm số
- [ ] Mở trực tiếp link khi chưa đăng nhập → đăng nhập xong vào lại đúng trang (nếu đã làm phần Có thể có của W1-FE-03)
- [ ] Kiểm tra mobile; push nhánh feat/W3-FE-04, tạo Pull Request

---

### [W3-BE-04] Giới hạn lượt dùng bằng @nestjs/throttler để bảo vệ quota Gemini
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Không để demo bị hết quota Gemini vì một người bấm liên tục hoặc bị gọi API dồn dập.

**Tiêu chí hoàn thành**
- `@nestjs/throttler` toàn cục với mức nới (VD 100 request / phút / người)
- Giới hạn theo user id (đã đăng nhập) hoặc IP (chưa đăng nhập)
- Giới hạn chặt hơn cho route gọi AI:
  - Nộp CV: 5 lần / giờ / ứng viên
  - Upload audio: 30 lần / giờ / ứng viên
  - Chấm lại CV, đánh giá lại phỏng vấn: 20 lần / giờ / HR
  - Đăng nhập: 10 lần / phút / IP (chống dò mật khẩu)
- Vượt giới hạn trả 429, thông báo tiếng Việt; FE hiện qua toast chung (W1-FE-06)
- Kết hợp với giới hạn song song của AiQueueService (W2-BE-02)
- (Có thể có) Giới hạn số event interview:answer mỗi phút trên socket

**Phụ thuộc:** W1-BE-05, W2-BE-01, W3-BE-02

#### 1. Cấu hình throttler:
- [ ] Cài @nestjs/throttler, đăng ký ThrottlerGuard toàn cục (APP_GUARD) với mức nới
- [ ] Ghi đè getTracker: dùng user id khi đã đăng nhập, IP khi chưa (cần trust proxy khi deploy)
- [ ] Gắn `@Throttle()` riêng cho nộp CV, upload audio, chấm lại, đánh giá lại, đăng nhập (theo mô tả thẻ)
- [ ] Bỏ giới hạn cho GET /api/health; thông báo 429 tiếng Việt qua HttpExceptionFilter

#### 2. Kiểm tra:
- [ ] Đăng nhập sai 11 lần trong 1 phút → lần 11 bị 429
- [ ] Nộp CV lần thứ 6 trong 1 giờ → 429, FE hiện toast tiếng Việt
- [ ] Kiểm tra luồng demo bình thường không chạm giới hạn
- [ ] Push nhánh feat/W3-BE-04, tạo Pull Request

---

### [W3-BE-07] Gửi email bằng Resend: mời phỏng vấn, không đạt vòng CV, kết quả phỏng vấn
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend
**Ưu tiên:** Nên có (thiếu thì ứng viên vẫn thấy lời mời và kết quả ở trang "Hồ sơ của tôi")
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy

**Mục tiêu**
Thông báo cho ứng viên ở các mốc quan trọng.

**Tiêu chí hoàn thành**
- Dùng Resend; EmailModule nghe application.status_changed (W2-BE-03)
- 3 loại email, template HTML đơn giản, tiếng Việt:
  - INTERVIEW_INVITED: lời mời + link {FRONTEND_URL}/candidate/interviews/:interviewId
  - REJECTED: cảm ơn, thông báo chưa phù hợp ở vòng CV
  - PASSED / FAILED (sau khi HR quyết định): kết quả + link trang phản hồi
- Gửi qua hàng đợi riêng hoặc bất đồng bộ; lỗi không làm hỏng luồng chính (log, thử lại 1 lần)
- Biến môi trường: RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL
- **Lưu ý:** chưa xác minh domain riêng thì Resend chỉ gửi được tới email của chính tài khoản Resend. Muốn gửi tới email bất kỳ khi demo cần xác minh một domain.

**Phụ thuộc:** W2-BE-03, W2-BE-04, W3-BE-03

#### 1. Cài đặt Resend:
- [ ] Tạo tài khoản Resend, lấy API key; quyết định dùng domain đã xác minh hay chỉ gửi tới email của tài khoản khi demo
- [ ] Thêm RESEND_API_KEY, EMAIL_FROM, FRONTEND_URL vào .env.example
- [ ] Cài resend SDK, viết EmailService.send(to, subject, html)

#### 2. Template + gửi:
- [ ] Viết 3 template HTML tiếng Việt: mời phỏng vấn, không đạt vòng CV, kết quả phỏng vấn
- [ ] EmailListener nghe application.status_changed: INTERVIEW_INVITED, REJECTED, PASSED, FAILED
- [ ] Gửi bất đồng bộ, lỗi thì log + thử lại 1 lần, không ném lỗi ra luồng chính

#### 3. Kiểm tra:
- [ ] HR duyệt hồ sơ → nhận email mời, link mở đúng phòng phỏng vấn
- [ ] HR quyết định kết quả phỏng vấn → nhận email kết quả, link mở đúng trang phản hồi
- [ ] Đặt sai RESEND_API_KEY → luồng duyệt vẫn chạy bình thường, chỉ có log lỗi
- [ ] Push nhánh feat/W3-BE-07, tạo Pull Request

---

### [W3-BE-06] README, sơ đồ kiến trúc, dữ liệu demo, kịch bản demo + chạy thử toàn bộ trên bản deploy
**Labels:** Backend

**Mô tả:**
**Người làm:** TV2 - Backend (TV3 cung cấp số liệu AI, TV1 chụp màn hình)
**Ưu tiên:** Bắt buộc
**Tuần:** 3 - Phỏng vấn AI, phản hồi & deploy — **thẻ cuối cùng**

**Mục tiêu**
Giảng viên hoặc nhà tuyển dụng đọc README là hiểu hệ thống, mở link là chạy thử được ngay.

**Tiêu chí hoàn thành**
- README: giới thiệu, tính năng chính, công nghệ, link bản deploy, cách chạy local, biến môi trường
- Mục Deploy: build image bằng GitHub Actions → GHCR, chạy docker compose trên EC2 sau Caddy (HTTPS), cách xem log, khởi động lại, khôi phục backup (lấy từ W3-BE-05)
- Sơ đồ (Mermaid):
  - Kiến trúc: trình duyệt → Caddy (HTTPS) → FE tĩnh / NestJS (REST + Socket.IO) ↔ Gemini, PostgreSQL + pgvector (container), Cloudinary, Resend; tất cả chạy bằng docker compose trên EC2
  - Luồng trạng thái hồ sơ (lấy từ docs/application-status.md của W2-BE-03)
  - Pipeline AI: trích text → parse → embedding → chấm điểm → giải thích; phỏng vấn → STT → chấm → phản hồi
- Số liệu AI từ W2-AI-04: độ chính xác trên tập test, độ ổn định, thời gian xử lý trung bình
- Script seed dữ liệu demo: 1 HR, 2–3 ứng viên, 3 job; có hồ sơ ở các trạng thái khác nhau (đang chấm xong, đã duyệt, đã phỏng vấn chờ quyết định, đã có kết quả)
- Bảng tài khoản demo trong README
- Kịch bản demo 5 phút từng bước
- Mục "Hạn chế và hướng phát triển" (các mục Không làm, VD: tài khoản HR do quản trị viên cấp, ẩn thông tin cá nhân trước khi chấm)
- Ảnh chụp các màn hình chính
- Cả nhóm chạy thử toàn bộ kịch bản demo trên bản deploy cuối cùng

**Phụ thuộc:** tất cả thẻ còn lại, W2-AI-04

#### 1. README + sơ đồ:
- [ ] Viết README: giới thiệu, tính năng, công nghệ, link deploy, chạy local, biến môi trường
- [ ] Sơ đồ Mermaid: kiến trúc, luồng trạng thái hồ sơ, pipeline AI vòng CV và vòng phỏng vấn
- [ ] Nhận số liệu AI từ TV3 (packages/ai/eval/results.md), tóm tắt vào README
- [ ] Mục "Hạn chế và hướng phát triển"

#### 2. Dữ liệu + kịch bản demo:
- [ ] Viết prisma/seed-demo.ts: 1 HR, 2–3 ứng viên, 3 job, hồ sơ ở các trạng thái khác nhau (có sẵn kết quả chấm và phỏng vấn)
- [ ] Chạy seed-demo trên DB đã deploy, ghi bảng tài khoản demo vào README
- [ ] Viết kịch bản demo 5 phút từng bước (ai thao tác gì, ở màn hình nào)
- [ ] TV1 chụp ảnh các màn hình chính, chèn vào README

#### 3. Chạy thử cuối cùng:
- [ ] Deploy lần cuối cả BE và FE
- [ ] Cả nhóm chạy kịch bản demo từ đầu đến cuối trên bản deploy: HR tạo job → nộp CV → AI chấm → HR duyệt → phỏng vấn voice → AI đánh giá → HR quyết định → ứng viên xem phản hồi
- [ ] Chạy lại trên điện thoại (Safari iPhone hoặc Chrome Android)
- [ ] Ghi các lỗi tìm thấy thành thẻ mới; sửa xong thì chạy lại kịch bản
- [ ] Push nhánh feat/W3-BE-06, tạo Pull Request

---

## Code Review / Testing (1 tasks)

### [W1-00] Khởi tạo monorepo npm: apps/web, apps/api, packages/ai
**Labels:** Backend, Frontend, AI/Pipeline

**Mô tả:**
**Người làm:** Huy
**Ưu tiên:** Bắt buộc
**Tuần:** 1 - Nền tảng & phân tích CV/JD

**Mục tiêu**
Dựng khung monorepo dùng chung để FE, BE, AI làm song song. Đây là việc tiên quyết của mọi thẻ tuần 1.

**Tiêu chí hoàn thành**

- npm workspaces: khai báo `"workspaces": ["apps/*", "packages/*"]` trong `package.json` gốc
- Gồm `apps/web` (React), `apps/api` (NestJS), `packages/ai` (`@hireflow/ai`), không cấu hình thêm thư viện nào cho web và api
- `apps/api` dùng package AI qua `"@hireflow/ai": "*"`
- tsconfig, ESLint, Prettier dùng chung
- File `.env.example` cho từng app (DB, JWT, Gemini key, Cloudinary, Resend cho api; API_PROXY_TARGET cho web)
- Script `npm run dev` ở thư mục gốc chạy song song web + api (dùng `concurrently`)
- Chỉ commit `package-lock.json`, cả nhóm thống nhất chỉ dùng npm (không dùng pnpm/yarn) và cùng Node v24
- Repo trên GitHub, nhánh `main` được bảo vệ, quy ước đặt tên nhánh theo mã thẻ (VD: `feat/W1-BE-03`)

**Phụ thuộc:** không

#### Khởi tạo repo:
- [x] Kiểm tra cả nhóm dùng chung Node v24 (dùng npm đi kèm theo Node, không cài npm riêng) bằng node -v, npm -v
- [x] Tạo repo GitHub, clone về máy
- [x] Chạy npm init -y ở thư mục gốc, đặt "private": true
- [x] Thêm "workspaces": ["apps/*", "packages/*"] vào package.json gốc
- [x] Tạo .gitignore (node_modules, dist, .env, *.log)
- [x] Tạo file .nvmrc ghi phiên bản Node dùng chung

#### Tạo các workspace:
- [x] Tạo khung apps/web bằng npm create vite (React + TS), không cài thêm gì (phần cấu hình làm ở W1-FE-01)
- [x] Tạo khung apps/api bằng Nest CLI, không cài thêm gì (Prisma, DB làm ở W1-BE-01)
- [x] Tạo khung packages/ai với package.json "@hireflow/ai" và 1 hàm thử (Gemini làm ở W1-AI-01)
- [x] Khai báo "@hireflow/ai": "*" trong apps/api/package.json
- [x] Chạy npm install ở thư mục gốc, kiểm tra chỉ có 1 package-lock.json ở gốc
- [x] Xóa package-lock.json và node_modules thừa trong từng app nếu có
- [x] Gọi thử hàm của @hireflow/ai trong apps/api, chạy được không lỗi

#### Cấu hình dùng chung:
- [x] Tạo tsconfig.base.json ở gốc, các app extends từ file này
- [x] Cài ESLint + Prettier ở gốc, thêm .prettierrc dùng chung
- [x] Cài concurrently, thêm script "dev" chạy song song api + web
- [x] Thêm script "build" và "lint" chạy cho mọi workspace (--workspaces --if-present)
- [x] Tạo .env.example cho apps/api
- [x] Tạo .env.example cho apps/web (API_PROXY_TARGET=http://localhost:3000)
- [x] Chạy npm run dev ở gốc: web và api cùng chạy được

#### Chốt và bàn giao cho nhóm:
- [x] Viết README ngắn: yêu cầu, cách cài, cách chạy, cấu trúc thư mục
- [x] Push lên nhánh main
- [x] Bật bảo vệ nhánh main (bắt buộc Pull Request, ít nhất 1 người review)
- [x] Ghi quy ước đặt tên nhánh (feat/W1-BE-03) và commit vào README
- [x] TV1 (Frontend) và TV3 (AI) clone về, npm install và npm run dev thành công
- [x] Chuyển thẻ sang Code Review / Testing

---

