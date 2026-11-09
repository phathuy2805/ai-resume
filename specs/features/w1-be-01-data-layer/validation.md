# [W1-BE-01] Data Layer — Validation

**Status**: DRAFT. Các lệnh dưới đây viết cho PowerShell (Windows) và chạy được tương đương trên bash. Chạy từ thư mục gốc repo, trừ khi ghi khác.

Tên script (`db:*`, `test:int`) là **dự kiến** theo `plan.md`. Chúng chưa tồn tại cho đến khi được implement.

---

## 1. Success checks

| ID | Check | Command | Expected | Covers |
| :--- | :--- | :--- | :--- | :--- |
| V-1 | Build và lint | `npm run build --workspace=apps/api; npm run lint --workspace=apps/api` | Exit 0, không có warning type-aware mới | AC-12 |
| V-2 | DB container | `docker compose up -d; docker compose ps` | `postgres` ở trạng thái `healthy` | AC-1 |
|  | Có cả 2 DB | `docker compose exec postgres psql -U postgres -tAc "SELECT datname FROM pg_database WHERE datname LIKE 'ai_resume%'"` | `ai_resume` và `ai_resume_test` | AC-1 |
| V-3 | Unit test env | `npm test --workspace=apps/api -- env.schema` | Pass | AC-2 |
| V-4 | Fail-fast khi thiếu env | `$env:DATABASE_URL=''; npm run start --workspace=apps/api` | Exit ≠ 0; output có chữ `DATABASE_URL`, **không** có `postgresql://` | AC-2 |
| V-5 | Migration chạy từ đầu | `npm run db:reset --workspace=apps/api -- --force` | Mọi migration được apply, chạy < 60s | AC-3, NFR-1 |
|  | Có extension vector | `docker compose exec postgres psql -U postgres -d ai_resume -tAc "SELECT extversion FROM pg_extension WHERE extname='vector'"` | Có giá trị version | AC-3 |
| V-6 | Danh sách bảng (sau PR 1.2) | `docker compose exec postgres psql -U postgres -d ai_resume -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"` | Đủ 9 bảng + `_prisma_migrations` | AC-4 |
|  | Kiểu cột vector | `... -tAc "SELECT table_name, format_type(atttypid, atttypmod) FROM ..."` *(xem §3)* | `vector(768)` trên `jobs` và `applications` | AC-7 |
| V-7 | Seed idempotent | `npm run db:seed --workspace=apps/api` **hai lần**, rồi đếm số user và job | Lần nào cũng 3 user (1 HR + 2 ứng viên) và 3 job | AC-9 |
|  | Mật khẩu đã băm | `... -tAc "SELECT count(*) FROM users WHERE password_hash NOT LIKE '\$argon2id\$%'"` | `0` | AC-9 |
| V-8 | Health | `npm run start:dev --workspace=apps/api` rồi `curl.exe -i http://localhost:3000/health` | `200` + `{"status":"ok","db":"up","vector":"up"}` | AC-11 |
|  | Health khi DB chết | `docker compose stop postgres; curl.exe -i http://localhost:3000/health` | `503`, body không có stack trace / message lỗi | AC-11 |
| V-9 | Test suites | `npm test --workspace=apps/api; npm run test:int --workspace=apps/api; npm run test:e2e --workspace=apps/api` | Tất cả pass | AC-5..AC-12 |
| V-10 | Git sạch | `git status --porcelain; git check-ignore apps/api/.env apps/api/src/generated` | Không có `.env` hay code sinh ra trong danh sách thay đổi; `check-ignore` in ra cả 2 đường dẫn | AC-12, NFR-2 |
| V-11 | Quét secret | `git diff main --name-only \| Select-String '\.env$'` và `git diff main \| Select-String -Pattern 'SEED_DEFAULT_PASSWORD=.+[^=]$'` | Chỉ thấy giá trị giả trong `.env.example` | NFR-2 |

## 2. Integration test matrix (`*.int-spec.ts`, DB `ai_resume_test`)

| Test | Arrange / Act | Assert | AC |
| :--- | :--- | :--- | :--- |
| unique email | Tạo 2 user cùng email | `P2002` | — |
| user → refresh token cascade | Xóa user có token | Token bị xóa | — |
| job owner restrict | Xóa HR đang sở hữu job | `P2003` | AC-6 |
| check constraints | `cvPassThreshold=101`; `interviewQuestionCount=6`; `minYearsExperience=-1` | Lỗi DB (check violation) | AC-8 |
| unique application | Tạo 2 Application cùng `(jobId, candidateId)` | `P2002` | AC-5 |
| candidate restrict | Xóa ứng viên đang có application | `P2003` | AC-6 |
| application cascade | Xóa application có đủ bảng con | Screening, History, Interview, Turns, Result = 0 dòng | AC-6 |
| hr decision set null | Xóa user HR được tham chiếu trong `hrDecisionById` (không sở hữu job) | Cột được đặt null | — |
| vector round-trip | `setEmbedding` với 768 số, rồi `getEmbedding` | Độ dài 768, sai số < 1e-6 | AC-7 |
| vector wrong dim | `setEmbedding` với 767 số | Helper ném lỗi trước khi gửi SQL; ghi raw SQL → DB từ chối | AC-7 |
| status history initial | Tạo history có `fromStatus=null` | OK | — |
| turn order unique | Tạo 2 turn cùng `orderIndex` | `P2002` | — |
| seed idempotent | Chạy seed 2 lần | Số dòng không đổi | AC-9 |
| seed guards | `NODE_ENV=production` / thiếu password | Throw lỗi, 0 dòng được ghi | AC-10 |

Mỗi test tự dọn dữ liệu (`TRUNCATE ... CASCADE` trong `beforeEach`), chạy tuần tự (`fileParallelism: false`).

## 3. Helper SQL

```sql
-- V-6: kiểu cột vector
SELECT c.relname AS table_name, a.attname, format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
WHERE a.attname = 'embedding' AND c.relkind = 'r';

-- Liệt kê FK và hành vi khi xóa (để review)
SELECT conrelid::regclass AS tbl, conname,
       CASE confdeltype WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT'
                        WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' END AS on_delete
FROM pg_constraint WHERE contype = 'f' ORDER BY 1;
```

## 4. Manual review checklist (PR reviewer)

- [ ] Version Prisma được ghim chính xác (không có `^`, không phải RC).
- [ ] Migration SQL: có `CREATE EXTENSION`, 3 CHECK, không có `DROP` ngoài ý muốn.
- [ ] Hành vi khi xóa khớp D7 (dùng query FK ở §3).
- [ ] Không có `$queryRawUnsafe` hoặc `$executeRawUnsafe`.
- [ ] Log và lỗi không in `DATABASE_URL`.
- [ ] `docs/erd.md` khớp schema. `specs/01-data-model.md` đã đồng bộ (PR 1.2).
- [ ] Thẻ Trello đã sửa (C1, C2, C6).

## 5. Definition of Done

Tất cả các dòng V-1 … V-11 đều pass, tất cả AC-1 … AC-13 đều được tick, 2 PR đã được duyệt và merge, TV3 đã nhận ghi chú bàn giao.

