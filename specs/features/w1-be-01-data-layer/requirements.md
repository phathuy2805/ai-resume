# [W1-BE-01] Data Layer — Requirements

| Field | Value |
| :--- | :--- |
| Feature | `[W1-BE-01]` Configure `apps/api`: Prisma, PostgreSQL + pgvector (Docker), system-wide schema |
| Owner | TV2 — Backend |
| Priority | Bắt buộc |
| Depends on | `[W1-00]` (monorepo — in Code Review) |
| Blocks | `[W1-BE-03]` Auth, `[W1-BE-04]` Jobs, `[W1-BE-05]` Applications, `[W2-*]`, `[W3-*]` |
| Status | **DRAFT — awaiting approval** |
| Constitution | `mission.md` v2.2, `tech-stack.md` v2.2, `roadmap.md` v2.2, `01-data-model.md` |

---

## 1. Business problem & user flow

Mọi luồng chính (HR tạo job → ứng viên nộp CV → AI chấm → phỏng vấn voice → HR quyết định) đều cần một tầng dữ liệu ổn định. Mục tiêu của feature này là **thiết kế schema đủ dùng cho cả 3 tuần** để tránh phải migrate lớn về sau, và cho FE/AI một hợp đồng dữ liệu để làm việc song song.

Feature này **không có luồng người dùng trực tiếp**. Đối tượng sử dụng là các developer:

- **TV2 (BE)**: dùng `PrismaService` trong các module Auth / Jobs / Applications.
- **TV3 (AI)**: dùng thống nhất `ParsedCv` / `ParsedJd` (JSON) và embedding 768 chiều.
- **TV1 (FE)**: đọc ERD để hiểu dữ liệu và các trạng thái.
- **DevOps / Docker**: dùng `GET /health` cho healthcheck.

## 2. Evidence (verified current state)

| Fact | Source |
| :--- | :--- |
| `apps/api` mới là khung NestJS 12 (chỉ có `AppController` "Hello World"), chưa có Prisma, Config hay Docker | `apps/api/src/*`, `package.json` |
| App chạy ESM: `"type": "module"`, `module: nodenext` | `apps/api/package.json`, `tsconfig.json` |
| Test dùng Vitest 4 (`*.spec.ts`), e2e dùng file config riêng | `vitest.config.ts`, `vitest.config.e2e.ts` |
| Node 24 | `.nvmrc` |
| Version trên npm: `@prisma/client` 7.10.1 (bản ổn định); tag `latest` của CLI `prisma` lại đang là 8.0.0-rc.30 | `npm view` (2026-11-07) |
| `main.ts` mặc định cổng 3000, còn `.env.example` để `PORT=4000` | file trong repo |

## 3. Approved decisions (interview 2026-11-07)

| # | Decision | Chosen option |
| :--- | :--- | :--- |
| D1 | Prisma | Ghim cứng **7.10.x** cho cả CLI và client; dùng `prisma.config.ts`, generator `prisma-client` (ESM), adapter `@prisma/adapter-pg` |
| D2 | Rubric phỏng vấn | **4 cột điểm cố định** (technical, communication, relevance, evidence). Sửa thẻ Trello cho khớp |
| D3 | Lưu file CV | Chỉ lưu `cvS3Key`, `cvFileName`, `cvSizeBytes`, `cvMimeType`. **Không có cột `cvUrl`** |
| D4 | docker-compose | Postgres 16 + pgvector, gồm DB dev `ai_resume` và DB test `ai_resume_test`. **Chưa có Redis** (để sang `[W2-BE-01]`) |
| D5 | Seed | 3 JD tạm, mật khẩu lấy từ `SEED_DEFAULT_PASSWORD`, chạy lại không tạo trùng (upsert) |
| D6 | PR | **PR 1.1**: hạ tầng + User/RefreshToken/Job. **PR 1.2**: Application + các bảng tuyển dụng + vector |
| D7 | Xóa dữ liệu | Không xóa cứng. Job dùng `status OPEN/CLOSED`. User→Application và Job→Application dùng **Restrict**. Bảng con của Application dùng Cascade |
| D8 | Index vector | **Chưa tạo** trong MVP (để HNSW làm sau) |
| D9 | Kiểm tra env | **Zod** |
| D10 | Health | `GET /health` kiểm tra DB và extension vector |
| D11 | Test | Integration test chạy trên `ai_resume_test` (compose) + unit test cho phần env |
| D12 | ERD | Mermaid trong `docs/erd.md` |
| D13 | Băm dữ liệu | Mật khẩu: **argon2id**. Refresh token: **SHA-256**. Email: chuẩn hóa về chữ thường |

## 4. Functional requirements

### FR-1 Local infrastructure
- FR-1.1 File `docker-compose.yml` ở thư mục gốc chạy image `pgvector/pgvector:pg16`, có healthcheck (`pg_isready`), dữ liệu lưu trong named volume, cổng cấu hình được (`POSTGRES_PORT`, mặc định 5432).
- FR-1.2 Có init script tạo thêm database `ai_resume_test` khi volume được khởi tạo lần đầu.
- FR-1.3 README ghi các lệnh: bật/tắt DB, migrate, seed, studio, reset.

### FR-2 Configuration
- FR-2.1 `ConfigModule` là global. Schema Zod kiểm tra env khi khởi động.
- FR-2.2 Biến **bắt buộc** trong scope này: `DATABASE_URL`. Biến **có mặc định**: `NODE_ENV` (`development`), `PORT` (`3000`). Các biến của feature sau (JWT, AWS, Gemini…) **chưa bắt buộc**. Feature nào cần thì feature đó tự thêm vào.
- FR-2.3 Thiếu hoặc sai env → process thoát với mã khác 0 và in **tên** biến lỗi. **Không bao giờ in giá trị** của biến.
- FR-2.4 Đồng bộ `apps/api/.env.example`: thêm `SEED_DEFAULT_PASSWORD`, `DATABASE_URL_TEST`, `POSTGRES_PORT`; sửa `PORT` cho khớp mặc định (xem C5).

### FR-3 Prisma integration
- FR-3.1 `PrismaModule` global, export `PrismaService` (extends `PrismaClient` qua adapter pg). Kết nối khi `onModuleInit`, ngắt khi `onModuleDestroy`.
- FR-3.2 Scripts trong `apps/api/package.json`: `db:generate`, `db:migrate` (dev), `db:deploy` (prod), `db:seed`, `db:studio`, `db:reset`.
- FR-3.3 Code Prisma sinh ra **không commit** (thêm vào `.gitignore`). Sinh lại bằng `postinstall` hoặc `db:generate`.

### FR-4 Schema — PR 1.1 (Core)
- Enums: `Role { HR, CANDIDATE }`, `JobStatus { OPEN, CLOSED }`.
- `User`: `id` (uuid), `email` (unique, lưu chữ thường), `passwordHash`, `fullName`, `role`, `createdAt`, `updatedAt`.
- `RefreshToken`: `id`, `userId` (FK, Cascade), `tokenHash` (unique), `expiresAt`, `revokedAt?`, `userAgent?`, `createdAt`. Index `userId`.
- `Job`: `id`, `title`, `description` (text), `requiredSkills String[]`, `preferredSkills String[]`, `minYearsExperience Int`, `status JobStatus @default(OPEN)`, `cvPassThreshold Int @default(70)`, `interviewQuestionCount Int @default(3)`, `rubricWeights Json`, `parsedJd Json?`, `createdById` (FK → User, Restrict), timestamps. Index `(status)`, `(createdById)`.
- Migration đầu tiên chạy `CREATE EXTENSION IF NOT EXISTS vector;`.
- DB CHECK constraints (SQL viết tay): `cvPassThreshold BETWEEN 0 AND 100`, `interviewQuestionCount BETWEEN 3 AND 5`, `minYearsExperience >= 0`.

### FR-5 Schema — PR 1.2 (Recruitment & AI)
- Enums: `ApplicationStatus` (11 giá trị, khớp `mission.md` §4), `AiRecommendation { PASS, CONSIDER, REJECT }`, `AnswerSource { VOICE, TEXT }`.
- `Job.embedding Unsupported("vector(768)")?`.
- `Application`: `jobId` (Restrict), `candidateId` (Restrict), `cvS3Key`, `cvFileName`, `cvSizeBytes`, `cvMimeType`, `cvText?`, `parsedCv Json?`, `status`, `screeningError?`, `aiRecommendation?`, `hrDecisionById?` (FK → User, SetNull), `hrDecisionAt?`, `hrNote?`, `embedding vector(768)?`, timestamps. **Unique `(jobId, candidateId)`**. Index `status`, `jobId`, `candidateId`.
- `ScreeningResult` (1-1 Application, Cascade): `totalScore`, `codeScore`, `geminiScore`, `similarityScore`, `strengths Json`, `missingSkills Json`, `verifiedQuotes Json`, `processingDurationMs`, `createdAt`.
- `ApplicationStatusHistory` (Cascade): `fromStatus?` (null ở lần tạo đầu tiên), `toStatus`, `changedById?` (FK → User, SetNull; **null = SYSTEM**), `reason?`, `changedAt`. Index `(applicationId, changedAt)`.
- `Interview` (1-1 Application, Cascade): `recordingConsentAt?`, `startedAt?`, `completedAt?`, `transcriptS3Key?`, `evaluationError?`, `createdAt`.
- `InterviewTurn` (Cascade): `orderIndex`, `question`, `questionType?`, `targetSkill?`, `answerText?`, `source`, `transcriptEdited`, `audioS3Key?`, `answeredAt?`. **Unique `(interviewId, orderIndex)`**.
- `InterviewResult` (1-1 Interview, Cascade): `technicalScore`, `communicationScore`, `relevanceScore`, `evidenceScore`, `totalScore`, `feedbackSummary`, `evidenceQuotes Json`, `aiRecommendation`, `candidateFeedback`, `decisionById?` (FK → User, SetNull), `decisionAt?`, `decisionNote?`, `createdAt`.

### FR-6 Seed
- FR-6.1 PR 1.1: 1 HR (`hr@hireflow.local`).
- FR-6.2 PR 1.2: 2 ứng viên (`candidate1@…`, `candidate2@…`) và 3 job OPEN tạm (Backend Developer, Data Analyst, Digital Marketing), mỗi job có `requiredSkills`/`preferredSkills`/`minYearsExperience`.
- FR-6.3 Upsert theo khóa tự nhiên (email; tiêu đề job + người tạo). Chạy 2 lần → số dòng không đổi.
- FR-6.4 Thiếu `SEED_DEFAULT_PASSWORD` → seed dừng với lỗi rõ ràng. Seed **từ chối chạy** khi `NODE_ENV=production`.

### FR-7 Health endpoint
- `GET /health` → `200 {"status":"ok","db":"up","vector":"up"}`.
- DB không kết nối được hoặc thiếu extension → `503 {"status":"error","db":"down"|"up","vector":"down"|"unknown"}`. Không lộ chi tiết lỗi, chuỗi kết nối hay stack trace.
- Không cần đăng nhập. Endpoint nằm ngoài global prefix, vì prefix sẽ được cấu hình ở `[W1-BE-02]`.

### FR-8 Documentation
- `docs/erd.md` (Mermaid `erDiagram`) khớp với schema.
- Cập nhật `specs/01-data-model.md` theo các quyết định D1–D13 (xem §8).

## 5. Non-functional requirements

| ID | Requirement |
| :--- | :--- |
| NFR-1 | Chạy lại toàn bộ migration trên DB trống bằng `db:reset` thành công trong < 60 giây |
| NFR-2 | Không có secret nào trong git: `.env` bị ignore, seed không chứa mật khẩu viết cứng |
| NFR-3 | Log không bao giờ in `DATABASE_URL` hay mật khẩu |
| NFR-4 | Dùng được trên Windows (PowerShell) và Linux (CI/EC2) |
| NFR-5 | `npm run build`, `npm run lint`, `npm test` của `apps/api` đều pass |
| NFR-6 | Migration chỉ thêm (additive) sau khi merge vào `main`. Không sửa migration đã merge |

## 6. Scope

**In scope**: Docker Postgres, ConfigModule + Zod, PrismaModule, toàn bộ schema (2 PR), migration, seed, `/health`, ERD, test cho tầng dữ liệu.

**Out of scope** (task phụ trách):
- Redis / BullMQ → `[W2-BE-01]`
- Auth logic, JWT, guard, `@Public()` → `[W1-BE-03]`. Endpoint `/health` sẽ được gắn `@Public()` khi guard toàn cục ra đời.
- Response format chung, global prefix, Swagger → `[W1-BE-02]`
- DTO và validation của Job → `[W1-BE-04]`
- Upload S3, pre-signed URL → `[W1-BE-05]`
- Logic chuyển trạng thái → `[W2-BE-03]`
- Tạo/đọc embedding thực tế → `[W2-AI-01]`, `[W2-BE-02]`
- Dockerfile cho API, deploy EC2 → `[W3-BE-05]`
- Sửa hoặc xóa `AppController` "Hello World" → để `[W1-BE-02]` quyết định

**External dependencies**:
- TV3: chốt shape `ParsedCv` / `ParsedJd` (lưu JSON nên không chặn migration) và 3 JD thật (seed dùng bản tạm).
- Máy dev: cần Docker Desktop.

## 7. Security, authorization & privacy

| Risk | Mitigation in this feature |
| :--- | :--- |
| Lộ mật khẩu hoặc token khi DB bị dump | argon2id cho mật khẩu, SHA-256 cho refresh token. Không lưu token thô |
| Commit nhầm secret | `.env` bị ignore. Seed đọc mật khẩu từ env. `.env.example` chỉ chứa giá trị giả |
| Lộ thông tin cá nhân (CV text, transcript) | Không lưu URL công khai, chỉ lưu S3 key (D3). Không hard delete → cần ghi chính sách lưu trữ (xem Q-open-1) |
| Seed chạy nhầm trên production | Seed chặn khi `NODE_ENV=production` |
| `/health` lộ thông tin hạ tầng | Chỉ trả trạng thái up/down, không trả message lỗi |
| Email trùng do khác hoa/thường | Chuẩn hóa chữ thường ở tầng service. Có thể cân nhắc thêm extension `citext` (xem Q-open-2) |
| Cột vector không có kiểu trong Prisma Client | Đọc/ghi qua `$queryRaw` / `$executeRaw` **có tham số hóa**. Cấm `$queryRawUnsafe` |

Authorization: không áp dụng ở feature này. Quyền sở hữu (HR chỉ thấy job của mình) được làm ở `[W1-BE-04]`, dựa trên `Job.createdById`.

## 8. Conflicts flagged

| # | Conflict | Resolution |
| :--- | :--- | :--- |
| C1 | Trello ghi InterviewResult có "3 tiêu chí", constitution ghi 4 | D2: giữ 4. **Việc cần làm: sửa thẻ Trello** |
| C2 | Trello ghi `cvUrl` / `cvPublicId` (Cloudinary), constitution dùng S3 | D3: chỉ lưu `cvS3Key` và metadata file |
| C3 | `01-data-model.md` viết theo kiểu Prisma 6, `onDelete: Cascade` khắp nơi, `isActive`, `fromStatus` bắt buộc, `changedBy` kiểu chuỗi | Cập nhật theo D1, D7, FR-5 **sau khi requirements được duyệt** |
| C4 | README gốc ghi Neon và p-queue, constitution dùng Docker Postgres và BullMQ | Constitution có hiệu lực. README gốc sẽ được viết lại ở `[W3-BE-06]` |
| C5 | `main.ts` mặc định cổng 3000, `.env.example` để 4000 | Đề xuất dùng **3000** (mặc định của Nest) và sửa `.env.example`. Hoặc ngược lại: cần FE (TV1) xác nhận vì Vite proxy phụ thuộc cổng này |
| C6 | Trello yêu cầu `docs/erd.png` | D12: dùng `docs/erd.md` (Mermaid). **Việc cần làm: sửa thẻ Trello** |
| C7 | Tag `latest` của CLI `prisma` là bản RC 8.x | D1: ghim chính xác 7.10.x, **không** dùng `^` hay `latest` |

## 9. Open questions (non-blocking — defaults applied if not answered)

- **Q-open-1** Chính sách lưu trữ thông tin cá nhân (bao lâu thì xóa CV/audio)? *Mặc định: ngoài phạm vi MVP, ghi vào "Hướng phát triển".*
- **Q-open-2** Dùng `citext` cho email thay vì chuẩn hóa ở tầng app? *Mặc định: chuẩn hóa ở app, không thêm extension.*
- **Q-open-3** Cổng API (C5)? *Mặc định: 3000.*

## 10. Acceptance criteria

| ID | Given / When / Then | Verified by |
| :--- | :--- | :--- |
| AC-1 | Máy sạch có Docker, chạy `docker compose up -d` → container `healthy`, tồn tại cả 2 DB `ai_resume` và `ai_resume_test` | V-2 |
| AC-2 | Thiếu `DATABASE_URL` → `npm run start` thoát với mã khác 0, thông báo có chữ `DATABASE_URL`, không có giá trị secret | V-4, unit test |
| AC-3 | `db:reset` trên DB trống → tất cả migration chạy xong, `pg_extension` có `vector` | V-5 |
| AC-4 | Sau PR 1.2, DB có đúng 9 bảng nghiệp vụ + `_prisma_migrations` | V-6 |
| AC-5 | Chèn 2 Application cùng `(jobId, candidateId)` → lỗi Prisma `P2002` | integration test |
| AC-6 | Xóa User đang có Application → bị từ chối (FK Restrict, `P2003`). Xóa Application → ScreeningResult/Interview/Turns/Result/History bị xóa theo | integration test |
| AC-7 | Ghi vector 768 chiều bằng `$executeRaw` rồi đọc lại → đúng 768 phần tử. Ghi vector 767 chiều → lỗi | integration test |
| AC-8 | `cvPassThreshold = 101` hoặc `interviewQuestionCount = 6` → bị CHECK constraint từ chối | integration test |
| AC-9 | Chạy `db:seed` 2 lần → vẫn 1 HR, 2 ứng viên, 3 job. Mật khẩu lưu dạng `$argon2id$…` | integration test + V-7 |
| AC-10 | Seed khi `NODE_ENV=production` hoặc thiếu `SEED_DEFAULT_PASSWORD` → thoát với lỗi, không ghi gì | integration test |
| AC-11 | `GET /health` khi DB chạy → 200 với body như FR-7. Dừng DB → 503, không lộ thông tin lỗi | e2e test + V-8 |
| AC-12 | `build`, `lint`, `test`, `test:e2e` đều pass. `git status` không có file sinh ra hay `.env` | V-1, V-9 |
| AC-13 | `docs/erd.md` có đủ 9 entity và quan hệ khớp schema | review |

