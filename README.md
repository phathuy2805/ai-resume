# HireFlow - AI Resume Screener & Candidate Evaluator

Hệ thống Trợ lý Tự động hóa Tuyển dụng & Sơ tuyển Hồ sơ ứng viên (Monorepo).

---

## 1. Yêu cầu môi trường (Prerequisites)

* **Node.js**: `v24.x` (khuyến nghị dùng `nvm use` để đọc file `.nvmrc`).
* **Package Manager**: **`npm`** đi kèm theo Node v24.  
  > ⚠️ **Lưu ý quan trọng**: Cả nhóm thống nhất **chỉ sử dụng `npm`**, tuyệt đối **không** dùng `yarn` hoặc `pnpm` để tránh gây xung đột file lock. Chỉ commit file `package-lock.json` ở thư mục gốc.
* **Docker Desktop**: Dùng để chạy cơ sở dữ liệu **PostgreSQL 16 + `pgvector`** dưới dạng container.

---

## 2. Cấu trúc thư mục (Monorepo Structure)

Dự án được tổ chức theo mô hình Monorepo sử dụng **npm workspaces**:

```text
ai-resume/
├── apps/
│   ├── api/             # Backend API (NestJS + TypeScript)
│   └── web/             # Frontend Client (React + Vite + TypeScript)
├── packages/
│   └── ai/              # Thư viện core AI (@hireflow/ai)
├── docker/              # Script khởi tạo cơ sở dữ liệu (init SQL)
├── specs/               # Tài liệu đặc tả kỹ thuật dự án (SDD)
├── docker-compose.yml   # Cấu hình chạy PostgreSQL 16 + pgvector
├── .nvmrc               # Phiên bản Node quy định (24)
├── .prettierrc          # Cấu hình format code dùng chung
├── tsconfig.base.json   # Cấu hình TypeScript base dùng chung
└── package.json         # Root package quản lý workspaces
```

---

## 3. Cài đặt (Installation)

1. **Clone repository:**
   ```bash
   git clone <URL_REPO_GITHUB>
   cd ai-resume
   ```

2. **Cài đặt dependencies cho toàn bộ monorepo:**
   ```bash
   npm install
   ```
   *(Lệnh này sẽ tự động liên kết các package nội bộ như `@hireflow/ai` vào `apps/api`)*.

3. **Cấu hình biến môi trường (`.env`):**
   * **Backend (`apps/api`):**
     ```bash
     cp apps/api/.env.example apps/api/.env
     ```
     Điền các thông tin kết nối DB, JWT secret, Gemini API key vào file `apps/api/.env`.
   * **Frontend (`apps/web`):**
     ```bash
     cp apps/web/.env.example apps/web/.env
     ```

4. **Khởi động cơ sở dữ liệu (PostgreSQL 16 + pgvector):**
   ```bash
   # Bật container PostgreSQL chạy ngầm (tự tạo 2 DB: ai_resume và ai_resume_test)
   docker compose up -d

   # Kiểm tra trạng thái container (đợi tới khi hiện "healthy")
   docker compose ps

   # Tắt container khi không sử dụng (vẫn giữ nguyên dữ liệu)
   docker compose down

   # Xóa sạch dữ liệu DB để khởi tạo lại từ đầu (khi cần reset volume)
   docker compose down -v
   ```
   * **Thông tin kết nối DB mặc định (DBeaver / Navicat):**
     * **Host:** `localhost` | **Port:** `5432`
     * **Database:** `ai_resume` (dev) / `ai_resume_test` (test)
     * **Username:** `postgres` | **Password:** `postgres`

---

## 4. Cách chạy dự án (Scripts)

Tất cả các lệnh đều được chạy từ **thư mục gốc**:

* **Chạy môi trường phát triển (chạy song song cả API và Web):**
  ```bash
  npm run dev
  ```
  * `apps/api` chạy tại: `http://localhost:3000`
  * `apps/web` chạy tại: `http://localhost:5173`

* **Build toàn bộ dự án:**
  ```bash
  npm run build
  ```

* **Kiểm tra Lint toàn bộ workspace:**
  ```bash
  npm run lint
  ```

---

## 5. Quy ước làm việc nhóm (Team Conventions)

### 5.1. Quy ước đặt tên nhánh (Branch Naming)
Mọi nhánh mới phải được rẽ từ nhánh `main` cập nhật mới nhất, đặt tên theo mã thẻ công việc:
* `feat/<mã-thẻ>`: Phát triển tính năng mới (Ví dụ: `feat/W1-BE-03`, `feat/W1-FE-01`).
* `fix/<mã-thẻ>`: Sửa lỗi (Ví dụ: `fix/W1-BE-02`).
* `chore/<mã-thẻ>`: Cấu hình, bảo trì hệ thống.

### 5.2. Quy ước Commit (Conventional Commits)
* `feat: <nội dung>` (tính năng mới)
* `fix: <nội dung>` (sửa lỗi)
* `docs: <nội dung>` (tài liệu)
* `refactor: <nội dung>` (tái cấu trúc code)
* `chore: <nội dung>` (cập nhật dependency, config)

### 5.3. Quy trình Pull Request (PR)
* Nhánh `main` được bảo vệ (Branch Protection). **Không được push trực tiếp lên `main`**.
* Mọi thay đổi phải tạo Pull Request (PR) trỏ về `main`.
* Cần **ít nhất 1 thành viên review và approve** trước khi merge.
