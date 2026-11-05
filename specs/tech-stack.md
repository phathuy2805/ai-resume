# Product Constitution: Tech Stack & Architecture Spec

**Project Name**: Hệ thống Trợ lý Tự động hóa Tuyển dụng & Sơ tuyển Hồ sơ  
**Document Version**: 1.0.0  
**Status**: APPROVED BASELINE  

---

## 1. Kiến trúc tổng thể hệ thống (System Architecture)

Dự án áp dụng mô hình **Monorepo** được quản lý bằng **pnpm Workspaces** và **Turborepo** nhằm chia sẻ type definitions và Zod validation schemas giữa Frontend và Backend.

```
ai-resume/
├── apps/
│   ├── web/                    # Frontend SPA (React + Vite + Tailwind + shadcn/ui)
│   └── api/                    # Backend API & Worker (NestJS + Prisma + BullMQ)
├── packages/
│   ├── shared/                 # Zod Schemas, DTO Interfaces, Socket Event Contracts
│   ├── tsconfig/               # Shared TypeScript configurations
│   └── eslint-config/          # Shared linting standards
├── docker/
│   ├── docker-compose.yml      # Local dev & Production VPS deployment
│   └── Dockerfile.api
├── specs/                      # Specification-Driven Development documentation
└── package.json
```

---

## 2. Chi tiết công nghệ (Component Breakdown)

### 2.1 Frontend (`apps/web`)
- **Core Framework**: React 18+ với TypeScript, khởi tạo bằng Vite.
- **Routing**: React Router v6+.
- **UI & Styling**: Tailwind CSS, kết hợp bộ thư viện component **shadcn/ui** (Radix UI primitives).
- **Server State & Data Fetching**: **TanStack Query (React Query)** — hỗ trợ caching, optimistic updates và đồng bộ trạng thái backend.
- **Voice / Speech**: **Web Speech API** (SpeechRecognition cho STT và SpeechSynthesis cho TTS).
- **Realtime Connection**: Socket.IO Client.

### 2.2 Backend (`apps/api`)
- **Framework**: **NestJS** (Modular architecture, TypeScript).
- **ORM & Database**: **Prisma ORM** tương tác với **PostgreSQL** (hỗ trợ extension `pgvector` phục vụ vector search).
- **Asynchronous Task Queue**: **BullMQ** kết hợp **Redis** (quản lý việc phân tích CV, embedding và gọi AI không làm nghẽn HTTP thread).
- **Realtime Gateway**: NestJS Gateway (`@nestjs/platform-socket.io`) quản lý phiên phỏng vấn.
- **Authentication**: Passport-JWT, bcrypt, bảo vệ phân quyền Role-Based (`HR`, `CANDIDATE`).
- **API Documentation**: OpenAPI / Swagger tự động sinh tại `/api/docs`.

### 2.3 Trí tuệ nhân tạo (AI & Parsing Pipeline)
- **Large Language Model (LLM)**: Google Gemini Flash / Gemini Flash-Lite qua `@google/genai` (phản hồi nhanh, chi phí thấp, context window lớn).
- **Embedding Model**: Text-Embedding-004 của Google để vector hóa JD và hồ sơ ứng viên.
- **Output Enforcement**: **Zod** schema dùng chung để ép chặt (strictly type-check) cấu trúc JSON từ Gemini.
- **Document Parsing**: `unpdf` để bóc tách văn bản thô từ file PDF một cách an toàn và nhẹ nhàng.

### 2.4 Dịch vụ bên ngoài & Hạ tầng (External Services & Infra)
- **File Storage**: **AWS S3** — sử dụng S3 Client để sinh Presigned URL, ứng viên upload trực tiếp từ browser lên S3.
- **Email Notifications**: **AWS SES / SNS Sandbox** — tự động gửi email thông báo kết quả sơ tuyển và phân tích kỹ năng.
- **Deployment & Hosting**: **Docker Compose trên VPS cá nhân** — đóng gói Nginx reverse proxy, NestJS API, Web SPA build tĩnh, Redis và PostgreSQL.

---

## 3. Phân tích các đánh đổi kỹ thuật (Architectural Trade-offs)

### Trade-off 1: Web Speech API (Client) vs. Server-side Whisper / Gemini Live
- **Lựa chọn**: **Web Speech API trên Client**.
- **Lợi ích**: Không tốn chi phí hạ tầng streaming audio, không tốn quota STT/TTS của cloud, độ trễ tức thời (zero server audio latency), dễ triển khai trong 2–4 tuần.
- **Đánh đổi**: Phụ thuộc trình duyệt (Chrome/Edge hoạt động tốt nhất; Firefox hạn chế), chất lượng nhận diện giọng tiếng Việt phụ thuộc vào engine của hệ điều hành/trình duyệt.

### Trade-off 2: BullMQ + Redis vs. p-queue (In-memory)
- **Lựa chọn**: **BullMQ + Redis**.
- **Lợi ích**: Tránh mất job khi container restart, có cơ chế retry tự động khi Gemini API bị rate limit (429), theo dõi tiến trình job trực quan.
- **Đánh đổi**: Cần thêm service Redis trong Docker Compose (nhưng đã giải quyết gọn gàng qua container Redis).

### Trade-off 3: S3 Presigned URL vs. Multipart Upload qua Backend
- **Lựa chọn**: **S3 Presigned URL**.
- **Lợi ích**: Tiết kiệm RAM và băng thông của server NestJS; file đi thẳng từ trình duyệt lên AWS S3.
- **Đánh đổi**: Cần thêm 1 roundtrip API để xin presigned URL trước khi PUT file.

### Trade-off 4: Docker Compose trên VPS vs. Managed PaaS (Vercel + Railway)
- **Lựa chọn**: **Docker Compose trên VPS**.
- **Lợi ích**: Toàn quyền kiểm soát tài nguyên, không bị giới hạn timeout của serverless (rất quan trọng khi xử lý websocket dài và tác vụ AI), chi phí cố định.
- **Đánh đổi**: Đội ngũ phải tự cấu hình reverse proxy, SSL Certbot và backup dữ liệu database trên VPS.

---

## 4. Chiến lược bảo mật & Dữ liệu nhạy cảm

1. **Bảo mật API Key**: Toàn bộ Google Gemini Key, AWS Access Key/Secret Key tuyệt đối nằm trong `.env` của Backend; không bao giờ lộ ra Client.
2. **Bảo vệ PII (Thông tin định danh)**: Trước khi lưu trữ text bóc tách hoặc đưa vào vector search, xem xét loại bỏ các trường nhạy cảm không cần thiết (CMND/CCCD, thông tin tài chính).
3. **Presigned URL Expiration**: Presigned URL upload chỉ có thời hạn tối đa 5 phút; Presigned URL tải file CV cho HR xem chỉ cấp phát tạm thời qua API có JWT Guard.
4. **WebSocket Guard**: Handshake Socket.IO bắt buộc gửi kèm JWT Token; kiểm tra chặt chẽ `applicationId` và `userId` để ngăn ứng viên nghe lén phiên phỏng vấn của người khác.

---

## 5. Chiến lược kiểm thử (Testing Strategy)

Do thời hạn dự án ngắn (2–4 tuần) và quy mô 4 người:
- **Tập trung cốt lõi**: Viết Unit Test (Vitest/Jest) cho:
  - Logic trích xuất text từ PDF (`unpdf`).
  - Logic tính điểm vector cosine similarity.
  - Zod parser validator cho output của Gemini.
  - Các state transition của `Application` state machine.
- **Integration Test**: Kiểm thử luồng gửi nhận Socket.IO cho buổi phỏng vấn.
- **Bỏ qua (Deferred)**: E2E Playwright trên toàn bộ UI để giữ tốc độ phát triển.

