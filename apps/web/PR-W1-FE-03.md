# [W1-FE-03] Tầng API dùng chung, proxy và Query cho frontend

FE cần gọi chung một contract khi BE còn mock. Bổ sung Axios client `/api`, token trong bộ nhớ, types auth/jobs/applications, API modules và hooks jobs để W1-FE-04/05/06 tích hợp.

- Vite đọc API_PROXY_TARGET từ apps/web; giữ prefix /api, chuẩn bị /socket.io local.
- API unwrap envelope một lần, giữ pagination meta. Validation map theo allow-list field RHF, lỗi chung không mất; toast thuộc một nơi xử lý.
- Query retry một lần mạng/5xx, không retry 4xx/cancellation/lỗi JS. Mutation mặc định không retry; tạo job invalidate jobs.
- Upload field file, progress có/không total và AbortSignal.
- Login/register chỉ giữ accessToken; logout dọn token/cache. 401 không refresh, replay hay redirect.
- README ghi ví dụ, chênh lệch Swagger/interceptor và checklist bàn giao.

Kiểm tra ngày 10/11/2026:
- `npm run build -w apps/web`: đạt.
- `npm run lint -w apps/web`: đạt.
- `npm test -w apps/web`: 29 tests đạt (2 files), gồm transport, hooks, form và proxy.
- `npm run smoke:api -w apps/web`: đạt; GET qua Vite tới BE local xác nhận danh sách kèm meta, detail envelope và validation 400.
- `git diff --check`: đạt.

Chưa kiểm chứng Apidog (chưa có URL/quyền), Caddy production và auth/upload backend thật. Toàn bộ refresh hoãn, chờ W1-BE-03; không đánh dấu phần đó hoàn thành. Không sửa backend hay xây UI nghiệp vụ.
