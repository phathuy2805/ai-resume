# Tài Liệu Quy Ước API (API Convention)

> **Dành cho:** Đội ngũ Frontend (Minh, Tài) & Backend (Huy)  
> **Dự án:**s AI Resume Screener & Candidate Evaluator  
> **Phiên bản tài liệu:** v1.0.0 (Áp dụng từ Tuần 1)  
> **Trạng thái:** CHÍNH THỨC (BASE CONTRACT)

---s

## 1. Thông Tin Chung & Địa Chỉ Truy Cập (General Info)

* **Base URL:** `http://localhost:3000/api`
* **Global Prefix:** Tất cả các endpoint đều bắt đầu bằng `/api/`
* **Tài liệu Swagger UI tương tác:** `http://localhost:3000/api/docs`
* **OpenAPI Specification (JSON):** 
  * Đường dẫn online: `http://localhost:3000/api/docs-json`
  * File offline trong repo: `openapi.json` (ngay thư mục gốc của repo).

> 💡 **Hướng dẫn cho FE (Minh, Tài):**  
> Các bạn có thể mở **Apidog** (hoặc Postman) $\rightarrow$ bấm **Import** $\rightarrow$ chọn file `openapi.json` trong thư mục gốc dự án (hoặc nhập link `http://localhost:3000/api/docs-json`). Apidog sẽ tự động tạo Mock Server với dữ liệu mẫu hoàn chỉnh 100% để các bạn dựng giao diện mà không cần chờ BE viết logic DB.

---

## 2. Quy Ước Xác Thực (Authentication)

* Hệ thống sử dụng **JSON Web Token (JWT)**.
* Với các endpoint yêu cầu đăng nhập, FE gửi header:
  ```http
  Authorization: Bearer <accessToken>
  ```
* **Vòng đời Token:**
  * `accessToken`: Thời hạn 15 phút.
  * `refreshToken`: Thời hạn 7 ngày.
* **Cơ chế Refresh Token:** Khi FE nhận về lỗi `401 Unauthorized` từ bất kỳ request nào, FE tự động gọi:
  * `POST /api/auth/refresh` kèm body `{ "refreshToken": "..." }` để nhận cặp token mới mà không bắt người dùng đăng nhập lại.

---

## 3. Quy Ước Cấu Trúc Response Thành Công (Success Response)

Toàn bộ response thành công từ server đều được tự động bọc qua `TransformInterceptor`.

### 3.1. Đối với dữ liệu đơn lẻ (Single Entity / Action)
Cấu trúc chuẩn: `{ data: T }`
```json
{
  "data": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "candidate@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "CANDIDATE",
    "createdAt": "2026-11-07T00:00:00.000Z"
  }
}
```

### 3.2. Đối với dữ liệu danh sách có phân trang (Paginated List)
Cấu trúc chuẩn: `{ data: T[], meta: PaginationMetaDto }`
```json
{
  "data": [
    {
      "id": "d19e9185-1715-46a2-94b2-e1e779a1d123",
      "title": "Senior Backend NodeJS / NestJS Developer",
      "status": "OPEN",
      "minYearsExperience": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

## 4. Quy Ước Truy Vấn Phân Trang (Pagination Query)

Mọi API danh sách phân trang (như `GET /api/jobs`) đều nhận các query params:

| Query Param | Kiểu     | Mặc định     | Mô tả                                            |
|:------------|:---------|:-------------|:-------------------------------------------------|
| `page`      | `number` | `1`          | Số trang cần lấy (bắt đầu từ 1, `min: 1`)        |
| `limit`     | `number` | `10`         | Số bản ghi trên mỗi trang (`min: 1`, `max: 100`) |
| `search`    | `string` | *(tùy chọn)* | Từ khóa tìm kiếm                                 |

**Ví dụ:**
```http
GET /api/jobs?page=2&limit=10&search=NodeJS
```

---

## 5. Quy Ước Cấu Trúc Response Lỗi (Error Response)

Toàn bộ lỗi phát sinh (Client error hoặc Server error) đều được chuẩn hóa qua `HttpExceptionFilter`.

### 5.1. Lỗi Nghiệp vụ & HTTP Thông Thường (401, 403, 404, 500...)
Cấu trúc: `{ statusCode, message, timestamp }`
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy tin tuyển dụng với ID đã cung cấp",
  "timestamp": "2026-11-07T16:00:00.000Z"
}
```

### 5.2. Lỗi Validation Dữ Liệu (400 Bad Request)
Khi FE gửi form sai định dạng hoặc thiếu trường, `ValidationPipe` sẽ chặn lại và trả về mảng danh sách chi tiết các trường bị lỗi trong key `errors`:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "Email không đúng định dạng",
    "Mật khẩu phải có ít nhất 8 ký tự",
    "Họ tên không được để trống"
  ],
  "timestamp": "2026-11-07T16:00:00.000Z"
}
```
> 💡 **Khuyến nghị cho FE:** Hiển thị mảng `errors` này trực tiếp lên toast notification hoặc ánh xạ báo đỏ dưới từng ô input của form.

---

## 6. Bảng Mã HTTP Status Code Được Sử Dụng

| HTTP Status              | Ý nghĩa              | Khi nào sử dụng                                                                                         |
|:-------------------------|:---------------------|:--------------------------------------------------------------------------------------------------------|
| **`200 OK`**             | Thành công           | Áp dụng cho các request `GET`, `PATCH`, `PUT` hoặc các action login/logout.                             |
| **`201 Created`**        | Tạo mới thành công   | Áp dụng khi tạo mới tài nguyên (`POST /api/auth/register`, `POST /api/jobs`, `POST /api/applications`). |
| **`400 Bad Request`**    | Dữ liệu không hợp lệ | Lỗi validation form, thiếu trường bắt buộc, sai định dạng UUID.                                         |
| **`401 Unauthorized`**   | Chưa xác thực        | Không gửi kèm token, token hết hạn hoặc token không hợp lệ.                                             |
| **`403 Forbidden`**      | Không có quyền       | Ứng viên cố tình gọi API dành riêng cho HR (ví dụ tạo job, đóng job).                                   |
| **`404 Not Found`**      | Không tìm thấy       | ID không tồn tại trong hệ thống.                                                                        |
| **`409 Conflict`**       | Xung đột dữ liệu     | Email đã được đăng ký, ứng viên nộp CV 2 lần vào cùng 1 job.                                            |
| **`500 Internal Error`** | Lỗi hệ thống server  | Sự cố không mong muốn phía backend.                                                                     |

---

## 7. Quy Ước Định Dạng Dữ Liệu (Data Formats)

1. **Chuẩn thời gian:** Mọi trường ngày tháng (`createdAt`, `updatedAt`, `expiresAt`) đều trả về theo chuẩn **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ss.sssZ`).
2. **Khóa chính (ID):** Toàn bộ ID của người dùng, công việc, đơn ứng tuyển đều là chuỗi **UUID v4** (VD: `d19e9185-1715-46a2-94b2-e1e779a1d123`).
3. **Upload File:**
   * Content-Type: `multipart/form-data`.
   * Định dạng file CV: Chỉ chấp nhận **PDF** (`application/pdf`).
   * Giới hạn dung lượng: Tối đa **5MB**.

---

## 8. Các Enum Dùng Chung (Shared Enums)

FE có thể copy nguyên mẫu các enum này vào code Frontend để đảm bảo Type-safe:

### Vai trò người dùng (`Role`)
```typescript
export enum Role {
  HR = 'HR',
  CANDIDATE = 'CANDIDATE',
}
```

### Trạng thái công việc (`JobStatus`)
```typescript
export enum JobStatus {
  OPEN = 'OPEN',     // Tin đang mở nhận CV
  CLOSED = 'CLOSED', // Tin đã đóng
}
```

### Trạng thái hồ sơ ứng tuyển (`ApplicationStatus`)
```typescript
export enum ApplicationStatus {
  SUBMITTED = 'SUBMITTED',                     // Vừa nộp CV
  SCREENING = 'SCREENING',                     // Đang trong hàng đợi AI chấm
  QUALIFIED = 'QUALIFIED',                     // Điểm CV >= điểm sàn, đủ điều kiện phỏng vấn
  REJECTED = 'REJECTED',                       // Không qua vòng lọc CV
  INTERVIEWING = 'INTERVIEWING',               // Đang trong phiên phỏng vấn Voice AI
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED', // Hoàn thành phỏng vấn
  UNDER_REVIEW = 'UNDER_REVIEW',               // Chờ HR xem báo cáo
  OFFERED = 'OFFERED',                         // HR quyết định tuyển
  REJECTED_BY_HR = 'REJECTED_BY_HR',           // HR từ chối sau phỏng vấn
  FEEDBACK_SENT = 'FEEDBACK_SENT',             // Đã gửi email phản hồi kỹ năng
}
```

---

## 9. Danh Sách Endpoint Dự Kiến (Tuần 2 & Tuần 3)

Dưới đây là kế hoạch chi tiết các endpoint phác thảo để Minh và Tài (FE) nắm trước kiến trúc luồng dữ liệu và thiết kế màn hình/mocking.

### 9.1. Phân Hệ Sàng Lọc CV Tự Động (Screening - Tuần 2)
Quản lý luồng chấm điểm hồ sơ tự động qua hàng đợi BullMQ và AI Gemini:

| Method | Endpoint                                | Quyền             | Mô tả                                       | Payload / Query / Response                                                                                                                              |
|:-------|:----------------------------------------|:------------------|:--------------------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST` | `/api/screening/trigger/:applicationId` | `HR`              | Kích hoạt hoặc yêu cầu chấm lại CV thủ công | Trả về `{ message, status: 'QUEUED' }`                                                                                                                  |
| `GET`  | `/api/screening/result/:applicationId`  | `HR`, `CANDIDATE` | Lấy kết quả AI đánh giá chi tiết            | **Data:** `{ score: 85, passed: true, matchRate: 90, matchingSkills: [...], missingSkills: [...], verifiedQuotes: [...], recommendation: 'QUALIFIED' }` |

### 9.2. Phân Hệ Bảng Điều Khiển & Xếp Hạng (Dashboard - Tuần 2 & 3)
Cung cấp số liệu thống kê và xếp hạng ứng viên theo độ tương đồng ngữ nghĩa vector:

| Method  | Endpoint                                   | Quyền | Mô tả                               | Payload / Query / Response                                                                                                                                       |
|:--------|:-------------------------------------------|:------|:------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `GET`   | `/api/dashboard/overview`                  | `HR`  | Thống kê tổng quan tuyển dụng       | **Data:** `{ totalJobs: 12, totalApplications: 145, passedScreeningRate: 68.5, completedInterviews: 28 }`                                                        |
| `GET`   | `/api/dashboard/candidates-ranking/:jobId` | `HR`  | Bảng xếp hạng ứng viên theo Job     | **Query:** `page, limit, minScore, sortBy=cosineSimilarity|score`<br>**Data:** Danh sách ứng viên kèm điểm vector tương đồng (0-100), điểm tổng và xếp hạng rank |
| `PATCH` | `/api/applications/:id/decision`           | `HR`  | HR ra quyết định tuyển dụng/từ chối | **Body:** `{ decision: 'OFFERED' \| 'REJECTED_BY_HR', hrNote: string }`                                                                                          |

### 9.3. Phân Hệ Phỏng Vấn Giọng Nói Voice AI (Interview - Tuần 3)
Hỗ trợ cả REST API quản trị phiên và WebSocket (Socket.IO) tương tác giọng nói thời gian thực:

| Method / Protocol | Endpoint / Event                            | Quyền             | Mô tả                                                     | Payload / Response                                                                                                                                                         |
|:------------------|:--------------------------------------------|:------------------|:----------------------------------------------------------|:---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST` (REST)     | `/api/interviews/session/:applicationId`    | `CANDIDATE`       | Khởi tạo phiên phỏng vấn Voice AI (khi hồ sơ `QUALIFIED`) | **Data:** `{ interviewId, questionCount: 3, timeLimitMinutes: 15 }`                                                                                                        |
| `GET` (REST)      | `/api/interviews/session/:interviewId/turn` | `CANDIDATE`       | Nhận nội dung câu hỏi hiện tại                            | **Data:** `{ turnIndex: 1, questionText: "...", audioUrl?: "..." }`                                                                                                        |
| `POST` (REST)     | `/api/interviews/complete/:interviewId`     | `CANDIDATE`       | Hoàn tất phỏng vấn, đẩy vào hàng đợi chấm transcript      | Trả về `{ message: "Đang chấm điểm...", status: 'EVALUATING' }`                                                                                                            |
| `GET` (REST)      | `/api/interviews/report/:interviewId`       | `HR`, `CANDIDATE` | Báo cáo 4 cột điểm phỏng vấn theo Rubric                  | **Data:** `{ overallScore: 82, rubric: { technical: 85, communication: 80, relevance: 85, evidence: 78 }, strengths: [...], weaknesses: [...], fullTranscriptUrl: "..." }` |
| `WS` (Socket.IO)  | `ws://localhost:3000/interview`             | `JWT`             | Kênh đàm thoại âm thanh hai chiều                         | Events: `join_room`, `submit_audio_turn`, `ai_speaking`, `session_ended`                                                                                                   |

---

## 10. Checklist Bàn Giao Cho Frontend (Tài & Minh)
1. **Import OpenAPI vào Apidog/Postman:**
   - Dùng file: `openapi.json` ở root thư mục dự án hoặc URL: `http://localhost:3000/api/docs-json`.
   - Bật **Cloud Mock** hoặc **Local Mock Server** của Apidog để nhận ngay base URL mock phục vụ dev giao diện.
2. **Kiểm tra và Thống nhất tên Field (Field Naming):**
   - Đảm bảo tuân thủ `camelCase` cho toàn bộ key (ví dụ: `cvPassThreshold`, `interviewQuestionCount`, `rubricWeights`, `cvUrl`).
   - Mọi mảng trả về từ server đều nằm trong thuộc tính `data`, thông tin phân trang nằm trong `meta`.
3. **Cập nhật thay đổi:**
   - Mỗi khi Backend có cập nhật spec DTO mới, chạy lại server dev sẽ tự động xuất mới file `openapi.json`.


---

## 9. Danh Sách Endpoint Dự Kiến (Tuần 2 & Tuần 3)

Dưới đây là kế hoạch chi tiết các endpoint phác thảo để Minh và Tài (FE) nắm trước kiến trúc luồng dữ liệu và thiết kế màn hình/mocking.

### 9.1. Phân Hệ Sàng Lọc CV Tự Động (Screening - Tuần 2)
Quản lý luồng chấm điểm hồ sơ tự động qua hàng đợi BullMQ và AI Gemini:

| Method | Endpoint | Quyền | Mô tả | Payload / Query / Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/screening/trigger/:applicationId` | `HR` | Kích hoạt hoặc yêu cầu chấm lại CV thủ công | Trả về `{ message, status: 'QUEUED' }` |
| `GET` | `/api/screening/result/:applicationId` | `HR`, `CANDIDATE` | Lấy kết quả AI đánh giá chi tiết | **Data:** `{ score: 85, passed: true, matchRate: 90, matchingSkills: [...], missingSkills: [...], verifiedQuotes: [...], recommendation: 'QUALIFIED' }` |

### 9.2. Phân Hệ Bảng Điều Khiển & Xếp Hạng (Dashboard - Tuần 2 & 3)
Cung cấp số liệu thống kê và xếp hạng ứng viên theo độ tương đồng ngữ nghĩa vector:

| Method | Endpoint | Quyền | Mô tả | Payload / Query / Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/overview` | `HR` | Thống kê tổng quan tuyển dụng | **Data:** `{ totalJobs: 12, totalApplications: 145, passedScreeningRate: 68.5, completedInterviews: 28 }` |
| `GET` | `/api/dashboard/candidates-ranking/:jobId` | `HR` | Bảng xếp hạng ứng viên theo Job | **Query:** `page, limit, minScore, sortBy=cosineSimilarity|score`<br>**Data:** Danh sách ứng viên kèm điểm vector tương đồng (0-100), điểm tổng và xếp hạng rank |
| `PATCH` | `/api/applications/:id/decision` | `HR` | HR ra quyết định tuyển dụng/từ chối | **Body:** `{ decision: 'OFFERED' \| 'REJECTED_BY_HR', hrNote: string }` |

### 9.3. Phân Hệ Phỏng Vấn Giọng Nói Voice AI (Interview - Tuần 3)
Hỗ trợ cả REST API quản trị phiên và WebSocket (Socket.IO) tương tác giọng nói thời gian thực:

| Method / Protocol | Endpoint / Event | Quyền | Mô tả | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `POST` (REST) | `/api/interviews/session/:applicationId` | `CANDIDATE` | Khởi tạo phiên phỏng vấn Voice AI (khi hồ sơ `QUALIFIED`) | **Data:** `{ interviewId, questionCount: 3, timeLimitMinutes: 15 }` |
| `GET` (REST) | `/api/interviews/session/:interviewId/turn` | `CANDIDATE` | Nhận nội dung câu hỏi hiện tại | **Data:** `{ turnIndex: 1, questionText: "...", audioUrl?: "..." }` |
| `POST` (REST) | `/api/interviews/complete/:interviewId` | `CANDIDATE` | Hoàn tất phỏng vấn, đẩy vào hàng đợi chấm transcript | Trả về `{ message: "Đang chấm điểm...", status: 'EVALUATING' }` |
| `GET` (REST) | `/api/interviews/report/:interviewId` | `HR`, `CANDIDATE` | Báo cáo 4 cột điểm phỏng vấn theo Rubric | **Data:** `{ overallScore: 82, rubric: { technical: 85, communication: 80, relevance: 85, evidence: 78 }, strengths: [...], weaknesses: [...], fullTranscriptUrl: "..." }` |
| `WS` (Socket.IO) | `ws://localhost:3000/interview` | `JWT` | Kênh đàm thoại âm thanh hai chiều | Events: `join_room`, `submit_audio_turn`, `ai_speaking`, `session_ended` |

---

## 10. Checklist Bàn Giao Cho Frontend (Tài & Minh)
1. **Import OpenAPI vào Apidog/Postman:**
   - Dùng file: `openapi.json` ở root thư mục dự án hoặc URL: `http://localhost:3000/api/docs-json`.
   - Bật **Cloud Mock** hoặc **Local Mock Server** của Apidog để nhận ngay base URL mock phục vụ dev giao diện.
2. **Kiểm tra và Thống nhất tên Field (Field Naming):**
   - Đảm bảo tuân thủ `camelCase` cho toàn bộ key (ví dụ: `cvPassThreshold`, `interviewQuestionCount`, `rubricWeights`, `cvUrl`).
   - Mọi mảng trả về từ server đều nằm trong thuộc tính `data`, thông tin phân trang nằm trong `meta`.
3. **Cập nhật thay đổi:**
   - Mỗi khi Backend có cập nhật spec DTO mới, chạy lại server dev sẽ tự động xuất mới file `openapi.json`.


