# [W1-BE-01] Data Layer — Implementation Plan

**Status**: DRAFT — awaiting approval. **Không viết code trước khi được duyệt.**
Branches: `feat/W1-BE-01-core` (PR 1.1) → `feat/W1-BE-01-recruitment` (PR 1.2, rebase lên `main` sau khi PR 1.1 đã merge).

Mỗi nhóm việc nhỏ, kiểm chứng được độc lập, và kết thúc bằng một commit. Mã `V-x` tham chiếu tới `validation.md`.

---

## PR 1.1 — Infrastructure + Core models

### G0. Pre-flight (không đổi code)
1. Xác nhận `[W1-00]` đã merge vào `main`. Nếu chưa, rebase lên nhánh của nó.
2. Chốt cổng API với TV1 (C5 / Q-open-3).
3. Sửa thẻ Trello `[W1-BE-01]`: 4 tiêu chí rubric (C1), `cvS3Key` (C2), `docs/erd.md` (C6).

### G1. Local Postgres (FR-1)
1. Tạo `docker-compose.yml` ở thư mục gốc: service `postgres` (`pgvector/pgvector:pg16`), healthcheck, named volume, cổng `${POSTGRES_PORT:-5432}`.
2. Tạo `docker/postgres/init/01-create-test-db.sql` → `CREATE DATABASE ai_resume_test;`.
3. Bổ sung README: các lệnh up / down / reset volume.
- **Check**: V-2.

### G2. Configuration (FR-2)
1. Cài `@nestjs/config` và `zod` vào `apps/api`.
2. Tạo `src/config/env.schema.ts`: schema Zod (`DATABASE_URL` bắt buộc; `NODE_ENV`, `PORT` có mặc định) và hàm `validateEnv()` chỉ in tên biến lỗi.
3. Đăng ký `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`. Sửa `main.ts` để đọc `PORT` từ `ConfigService`.
4. Đồng bộ `.env.example` (FR-2.4). Kiểm tra `.gitignore` có `.env` và `.env.*`, nhưng không ignore `!.env.example`.
5. Unit test `env.schema.spec.ts`: env hợp lệ / thiếu biến / sai URL / không lộ giá trị biến.
- **Check**: V-3, V-4.

### G3. Prisma bootstrap (FR-3)
1. Cài chính xác version `prisma@7.10.x` (dev), `@prisma/client@7.10.x`, `@prisma/adapter-pg`, `pg` (+ `@types/pg`).
2. Tạo `apps/api/prisma.config.ts` (đường dẫn schema, thư mục migrations, URL lấy từ env, lệnh seed).
3. Tạo `prisma/schema.prisma`: generator `prisma-client` (output `src/generated/prisma`, ESM), datasource `postgresql`.
4. Thêm `src/generated/` vào `.gitignore`. Thêm script `postinstall` / `db:*` (FR-3.2).
5. Tạo `src/prisma/prisma.module.ts` (global) và `prisma.service.ts` (adapter pg, connect/disconnect theo lifecycle).
- **Check**: `npm run db:generate` chạy được; `build` pass.

### G4. Core schema + first migration (FR-4)
1. Viết enum `Role`, `JobStatus` và model `User`, `RefreshToken`, `Job` (chưa có cột embedding).
2. `prisma migrate dev --create-only --name init_core`, rồi sửa SQL bằng tay:
   - thêm `CREATE EXTENSION IF NOT EXISTS vector;` ở đầu file;
   - thêm 3 CHECK constraint.
3. Chạy migrate, kiểm tra bảng và extension.
- **Check**: V-5.

### G5. Seed HR + hashing helper (FR-6.1, D13)
1. Cài `argon2`. Tạo `src/common/crypto/password.ts` (`hashPassword`, `verifyPassword`, argon2id) để `[W1-BE-03]` dùng lại.
2. Tạo `prisma/seed.ts`: chặn production, bắt buộc có `SEED_DEFAULT_PASSWORD`, upsert HR.
- **Check**: V-7 (chạy 2 lần).

### G6. Health endpoint (FR-7)
1. Tạo `src/health/health.controller.ts` và `health.service.ts`: chạy `SELECT 1` và kiểm tra `pg_extension`. Trả 200 hoặc 503.
2. E2E test: DB chạy → 200. Mock Prisma lỗi → 503, body không lộ thông tin lỗi.
- **Check**: V-8.

### G7. Integration tests — core
1. Tạo `vitest.config.int.ts` (pattern `*.int-spec.ts`, chạy tuần tự) và script `test:int` (chạy migrate deploy lên `DATABASE_URL_TEST` trước khi test).
2. Test: unique email; xóa User → RefreshToken bị xóa theo; xóa User đang sở hữu Job → bị từ chối; CHECK constraint (AC-8); seed idempotent và chặn production (AC-9/10, phần HR).
- **Check**: V-9.

### G8. PR 1.1 wrap-up
1. Viết `docs/erd.md` (phần core).
2. Chạy toàn bộ V-1 … V-9. Mở PR. Review checklist: migration SQL, không có secret, file sinh ra bị ignore.

---

## PR 1.2 — Recruitment & AI models

### G9. Recruitment schema (FR-5, không có vector)
1. Thêm enum `ApplicationStatus`, `AiRecommendation`, `AnswerSource`.
2. Thêm model `Application`, `ScreeningResult`, `ApplicationStatusHistory`, `Interview`, `InterviewTurn`, `InterviewResult`. Khai báo quan hệ **Restrict / Cascade / SetNull** đúng như FR-5.
3. Thêm unique và index.
- **Check**: `prisma validate`, `prisma format`.

### G10. Vector columns
1. Thêm `embedding Unsupported("vector(768)")?` vào `Job` và `Application`.
2. `migrate dev --create-only --name recruitment`. Rà lại SQL: kiểu `vector(768)`, không có lệnh DROP ngoài ý muốn.
3. Tạo helper `src/prisma/vector.ts`: `setEmbedding(table, id, number[])` / `getEmbedding(...)`, dùng `$executeRaw` có tham số hóa, kiểm tra độ dài = 768. Giới hạn tên bảng bằng whitelist.
- **Check**: V-5, V-6.

### G11. Seed candidates + jobs (FR-6.2)
1. Upsert 2 ứng viên và 3 job tạm (tạo bởi HR, kèm danh sách skills và số năm kinh nghiệm).
- **Check**: V-7.

### G12. Integration tests — recruitment
1. Test các AC còn lại: AC-5 unique application; AC-6 Restrict và cascade; AC-7 vector đúng 768 / sai 767; history có `fromStatus = null`; unique `(interviewId, orderIndex)`; seed idempotent (đếm đủ số dòng).
- **Check**: V-9.

### G13. Docs & constitution sync
1. Hoàn thiện `docs/erd.md` (9 entity).
2. Cập nhật `specs/01-data-model.md` (C3) cho khớp với schema thật.
3. Gửi TV3 ghi chú bàn giao: kích thước 768, quy ước dùng helper vector, `ParsedCv` / `ParsedJd` lưu dạng JSON.
4. Chạy toàn bộ V-1 … V-10. Mở PR 1.2.

---

## Risks & mitigations

| Risk                                                                 | Impact            | Mitigation                                                                                                                        |
|:---------------------------------------------------------------------|:------------------|:----------------------------------------------------------------------------------------------------------------------------------|
| Prisma 7 + ESM/nodenext gặp lỗi import code sinh ra (cần đuôi `.js`) | Build fail        | Spike nhỏ ở G3 trước khi viết schema. Nếu bị chặn quá nửa ngày → báo lại kèm phương án (đổi `moduleFormat`, hoặc lùi về Prisma 6) |
| `argon2` lỗi binary native trên Windows hoặc Alpine                  | Seed / Auth fail  | Dùng prebuilt binaries; nếu fail thì cân nhắc `@node-rs/argon2`. Ghi chú base image cho `[W3-BE-05]`                              |
| Postgres trên máy dev đã chiếm cổng 5432                             | Compose fail      | Dùng biến `POSTGRES_PORT`                                                                                                         |
| Cần quyền tạo shadow DB khi chạy `migrate dev`                       | Migrate fail      | User `postgres` trong container là superuser. Trên EC2 chỉ dùng `migrate deploy`                                                  |
| TV3 đổi shape `ParsedCv`                                             | Không cần migrate | Lưu JSON; kiểm tra bằng Zod ở `packages/ai`                                                                                       |

## Estimate
PR 1.1 ≈ 1–1.5 ngày · PR 1.2 ≈ 1 ngày · Review / fix ≈ 0.5 ngày.

