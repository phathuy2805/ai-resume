# Đặc tả Sự kiện Phỏng vấn Real-time (`InterviewGateway` — W3-BE-01)

Tài liệu thống nhất giao thức Socket.IO cho phiên phỏng vấn AI giữa **BE (Huy)**, **FE (Minh)** và **AI (Tài)**. Toàn bộ trạng thái phiên được lưu trong PostgreSQL (`interviews`, `interview_turns`) nên ứng viên có thể ngắt kết nối và vào lại bất cứ lúc nào để tiếp tục đúng câu đang dở.

> **Quy tắc chung của phiên phỏng vấn:**
>
> - **Luồng chính (`VOICE`):** Trong phiên, ứng viên đọc câu hỏi → ghi âm → nghe lại → có thể ghi lại tối đa **3 lần** trên trình duyệt → upload audio lên S3 qua API `W3-BE-02` (BE lưu `InterviewTurn.audioS3Key`) → gửi `interview:answer { turnId, source: "VOICE" }` (không gửi `text`) → chuyển ngay sang câu tiếp theo. **Không** chạy STT giữa phiên và **không** sửa transcript. Hết phiên hệ thống mới chạy STT hàng loạt rồi AI chấm điểm (`W3-BE-03`).
> - **Fallback (`TEXT`):** Khi máy ứng viên hỏng/không có micro, gửi `interview:answer { turnId, source: "TEXT", text }`. Nếu lượt đó đã từng upload audio trước đó, BE xóa `audioS3Key` và đặt `transcriptStatus = null`.
> - **2 mốc thời hạn (hằng số trong code):**
>   - **Hạn tham gia (`inviteExpiresAt`):** **7 ngày** kể từ lúc HR mời (`Interview.createdAt`). Quá hạn khi chưa bắt đầu → `interview:start` trả `INTERVIEW_EXPIRED`, `phase = "EXPIRED"`.
>   - **Hạn hoàn thành phiên (`sessionExpiresAt`):** **24 giờ** kể từ `Interview.startedAt`. Quá 24 giờ mà chưa trả lời hết → hệ thống tự kết thúc phiên (lưu `completedAt`, câu chưa trả lời để trống) và phát `interview.completed` để xử lý như bình thường (kiểm tra khi ứng viên `join`, khi HR mở kết quả và khi server khởi động).
> - **Job bị đóng (`CLOSED`) sau khi đã mời:** ứng viên vẫn phỏng vấn bình thường; đóng job chỉ chặn nộp CV mới.
> - **Ngoài phạm vi (không làm):** giới hạn thời gian đếm ngược mỗi câu, nhiều người cùng xem một phiên.

---

## 1. Kết nối & Xác thực

- **Giao thức:** Socket.IO
- **Namespace:** `/interview`
- **Path:** `/socket.io` (FE kết nối cùng domain: dev qua Vite proxy, production qua Caddy; CORS socket cấu hình theo `FRONTEND_ORIGIN` để dự phòng).
- **Xác thực:** gửi JWT access token qua `handshake.auth.token` (xác thực bằng `TokenService.verifyAccessToken`). `JwtAuthGuard`, `RolesGuard` và `HttpExceptionFilter` toàn cục bỏ qua context `'ws'`.

```ts
import { io } from 'socket.io-client';

const socket = io('/interview', {
  path: '/socket.io',
  auth: { token: accessToken },
});
```

### Lỗi xác thực ở bước Handshake (`connect_error`)

| `code` (`err.message`) | Nguyên nhân                                                         | Hành động gợi ý cho FE                                                                                                      |
|:-----------------------|:--------------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------|
| `AUTH_EXPIRED`         | Access token đã hết hạn (`TokenExpiredError`).                      | Gọi `POST /api/auth/refresh` lấy access token mới, cập nhật `socket.auth = { token: newToken }` rồi gọi `socket.connect()`. |
| `AUTH_INVALID`         | Thiếu token, token sai định dạng/chữ ký, hoặc payload không hợp lệ. | Xóa phiên đăng nhập và chuyển về `/login`.                                                                                  |

### Quy tắc sở hữu & Reconnect

- Chỉ tài khoản **`CANDIDATE`** sở hữu hồ sơ (`application.candidateId === user.id`) mới được phép vào phiên (`assertInterviewOwner`).
- Mỗi lần kết nối thành công (bao gồm cả **sau khi reconnect**), FE **bắt buộc** gửi lại `interview:join { interviewId }`.

---

## 2. Events Client → Server

### `interview:join`

Tham gia phiên phỏng vấn (lần đầu và mỗi lần reconnect).

```json
{
  "interviewId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- Kiểm tra sở hữu, tự kết thúc phiên nếu đã quá hạn 24 giờ kể từ `startedAt`, và trả về `interview:state`.

---

### `interview:start`

Bắt đầu buổi phỏng vấn sau khi ứng viên đồng ý cho AI xử lý và lưu câu trả lời phỏng vấn (áp dụng cho cả giọng nói và chữ).

```json
{
  "consent": true
}
```

- **Điều kiện:** đã `interview:join`, `consent === true`, trạng thái `INTERVIEW_INVITED`, chưa quá hạn mời 7 ngày (`inviteExpiresAt`).
- **Chống gọi trùng:** đang sinh câu hỏi mà nhận thêm `interview:start` (2 tab / bấm 2 lần) → server **bỏ qua**, không gọi AI lần 2 và không gửi lỗi.
- **Xử lý:** gửi `interview:preparing` → gọi `generateQuestionPlan` (`W3-AI-01`) qua `AiQueueService` (`lane: 'live'`, `priority: 10`) → transaction tạo sẵn toàn bộ `InterviewTurn` (lưu `askedAt = startedAt` cho câu 1), lưu `recordingConsentAt` & `startedAt`, chuyển `INTERVIEW_INVITED → INTERVIEWING` → gửi `interview:question` câu 1.
- **Lỗi sinh câu hỏi:** gửi `interview:error` (`QUESTION_GENERATION_FAILED`), giữ `INTERVIEW_INVITED` để ứng viên bấm bắt đầu lại.

---

### `interview:answer`

Gửi câu trả lời cho câu hỏi hiện tại (`turnId`).

**Nhánh `VOICE` (luồng chính):**

```json
{
  "turnId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "VOICE"
}
```

- Lượt phải đã upload audio lên S3 qua `W3-BE-02` (`InterviewTurn.audioS3Key !== null`); nếu chưa có audio → `interview:error` mã `AUDIO_NOT_UPLOADED`.
- **Không** gửi trường `text`. Server lưu `source = VOICE`, `answerText = null`, `transcriptStatus = PENDING`, `answeredAt = now`.

**Nhánh `TEXT` (fallback):**

```json
{
  "turnId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "TEXT",
  "text": "Ở dự án trước, em dùng NestJS kết hợp PostgreSQL..."
}
```

- `text` bắt buộc, sau `.trim()` dài `1..3000` ký tự.
- Server lưu `source = TEXT`, `answerText = text`, xóa `audioS3Key = null`, `transcriptStatus = null`, `answeredAt = now`.

- **Chuyển lượt & `askedAt`:**
  - Nếu còn câu kế tiếp → lưu `askedAt = now` cho câu kế tiếp (chỉ khi `askedAt IS NULL`, không ghi đè khi reconnect) và gửi `interview:question`.
  - Nếu là câu cuối → lưu `Interview.completedAt = now`, gửi `interview:completed`, và phát sự kiện nội bộ `interview.completed`.
  - Nếu gửi lại câu trả lời cho lượt đã trả lời (`answeredAt !== null`) → bỏ qua và gửi lại `interview:state`.

---

## 3. Events Server → Client

### `interview:state`

```json
{
  "interviewId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "INTERVIEWING",
  "phase": "IN_PROGRESS",
  "inviteExpiresAt": "2026-12-04T10:00:00.000Z",
  "sessionExpiresAt": "2026-11-28T12:00:03.000Z",
  "expiresAt": "2026-12-04T10:00:00.000Z",
  "isExpired": false,
  "recordingConsentAt": "2026-11-27T12:00:00.000Z",
  "startedAt": "2026-11-27T12:00:03.000Z",
  "completedAt": null,
  "transcriptStatus": "NONE",
  "processingDelayed": false,
  "totalQuestions": 3,
  "currentQuestion": {
    "turnId": "660e8400-e29b-41d4-a716-446655440002",
    "order": 2,
    "total": 3,
    "text": "Bạn đã xử lý tối ưu truy vấn chậm trên PostgreSQL trong thực tế như thế nào?"
  },
  "answeredTurns": [
    {
      "turnId": "660e8400-e29b-41d4-a716-446655440001",
      "order": 1,
      "question": "Hãy giới thiệu về hệ thống backend gần nhất bạn trực tiếp thiết kế.",
      "answerText": null,
      "source": "VOICE",
      "transcriptStatus": "PENDING",
      "askedAt": "2026-11-27T12:00:03.000Z",
      "answeredAt": "2026-11-27T12:01:45.000Z"
    }
  ]
}
```

- **`phase`:** `NOT_STARTED` | `IN_PROGRESS` | `SUBMITTED` (đã nộp / đang nhận dạng / đang chấm / đã có kết quả) | `EXPIRED` (quá hạn mời 7 ngày khi chưa bắt đầu).
- **`inviteExpiresAt`:** hạn tham gia (+7 ngày từ lúc HR mời).
- **`sessionExpiresAt`:** hạn hoàn thành phiên (+24 giờ từ `startedAt`, `null` khi chưa bắt đầu).

### `interview:preparing`
```json
{ "interviewId": "550e8400-e29b-41d4-a716-446655440000", "message": "Đang chuẩn bị bộ câu hỏi phỏng vấn..." }
```

### `interview:question`
```json
{ "turnId": "660e8400-e29b-41d4-a716-446655440001", "order": 1, "total": 3, "text": "..." }
```

### `interview:completed`
```json
{ "interviewId": "550e8400-e29b-41d4-a716-446655440000", "completedAt": "2026-11-27T12:08:20.000Z", "transcriptStatus": "TRANSCRIBING" }
```

### `interview:error`

| `code`                       | Khi nào xảy ra                                                                                     |
|:-----------------------------|:---------------------------------------------------------------------------------------------------|
| `NOT_JOINED`                 | Gửi `interview:start` hoặc `interview:answer` trước khi `interview:join`.                          |
| `INTERVIEW_NOT_FOUND`        | Không tìm thấy phiên phỏng vấn theo `interviewId`.                                                 |
| `FORBIDDEN`                  | Ứng viên không sở hữu hồ sơ này hoặc tài khoản không phải `CANDIDATE`.                             |
| `INTERVIEW_EXPIRED`          | Quá hạn tham gia 7 ngày khi bấm `interview:start`.                                                 |
| `CONSENT_REQUIRED`           | Gửi `interview:start` với `consent !== true`.                                                      |
| `INVALID_STATE`              | Trạng thái phiên không hợp lệ (`start` khi đã bắt đầu, `answer` khi chưa bắt đầu hoặc đã nộp).     |
| `INVALID_PAYLOAD`            | Payload sai định dạng, `turnId` không phải câu hiện tại, `VOICE` gửi kèm `text`, `TEXT` rỗng/>3000. |
| `AUDIO_NOT_UPLOADED`         | Gửi câu `VOICE` nhưng lượt chưa upload audio (`audioS3Key === null`).                              |
| `QUESTION_GENERATION_FAILED` | Lỗi gọi AI `generateQuestionPlan` (trạng thái vẫn giữ `INTERVIEW_INVITED`).                        |
| `INTERNAL_ERROR`             | Lỗi hệ thống ngoài dự kiến.                                                                        |

---

## 4. REST API liên quan (`GET /api/me/applications`)

Mỗi hồ sơ ứng viên trả thêm object `interview` (hoặc `null` nếu chưa được mời phỏng vấn):

```json
{
  "interview": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phase": "NOT_STARTED",
    "inviteExpiresAt": "2026-12-04T10:00:00.000Z"
  }
}
```

---

## 5. Sự kiện nội bộ BE (`EventEmitter2`)

- **Tên sự kiện:** `interview.completed`
- **Payload:** `{ interviewId, applicationId, jobId, candidateId, completedAt }`
- Được phát khi ứng viên hoàn thành câu cuối hoặc khi phiên tự kết thúc do quá hạn 24 giờ.
