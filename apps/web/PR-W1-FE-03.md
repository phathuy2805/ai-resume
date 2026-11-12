# [W1-FE-03] API dùng chung và refresh phiên với backend W1-BE-03

FE có tầng API dùng chung cho auth/jobs/applications và tự khôi phục phiên bằng cookie HttpOnly của backend. Khi access token hết hạn, các request 401 trong cùng tab dùng một lần refresh, rồi gửi lại tối đa một lần. Reload khôi phục access token trong bộ nhớ; refresh bị từ chối dọn cache và chuyển login.

- Vite proxy `/api`, `/socket.io`, cấu hình API_PROXY_TARGET; types và API unwrap đúng envelope, giữ pagination meta.
- Axios client 15 giây, Bearer từ memory tokenStore; transport cookie riêng không có vòng lặp refresh.
- Query retry một lần mạng/5xx, không retry lỗi refresh; hooks jobs và invalidation, upload FormData/progress/cancellation; helpers validation RHF và toast một nơi.
- Refresh dùng promise chung, xử lý 401 trả về trễ, giữ body/params/FormData khi replay. Không refresh endpoint login/register/refresh/logout hoặc lỗi 403.
- Login/logout được tuần tự hóa với refresh; đổi phiên chặn request/response tài khoản cũ. Logout dọn local ngay và chờ rotation trước khi thu hồi cookie.
- Refresh 401 kết thúc phiên; mạng/timeout/5xx không ép logout và không tự lặp rotation. Có refreshSession/refresh để bootstrap hoặc thử lại tường minh.
- Đồng bộ main `1f0af87`: register trả UserProfile, không đòi accessToken hoặc tự gọi thêm login/refresh. Login/refresh chỉ nhận accessToken và user; refresh token chỉ nằm trong cookie HttpOnly. Thêm validation profile và tests response mới, response sai contract, đăng ký đua với logout.
- RegisterRequest chỉ cho HR/CANDIDATE theo BE mới. README có contract, checklist kiểm thử và hướng dẫn bàn giao AuthProvider.

Kiểm tra ngày 12/11/2026:
- `npm run build -w apps/web`: đạt.
- `npm run lint -w apps/web`: đạt.
- `npm test -w apps/web`: 54 tests đạt, 3 files.
- Build packages/ai và apps/api: đạt để chạy kiểm tra tích hợp.
- Edge headless + Vite + NestJS + PostgreSQL thật: 8 kịch bản đạt (guest startup, cookie HttpOnly, 5 request hết hạn dùng 1 rotation, reload, refresh 500/recovery, expired cookie/redirect/cache, logout trong rotation, reload sau logout). 500 được giả lập qua network interception; các luồng cookie/JWT còn lại dùng BE thật.
- Test dùng database tạm riêng đã được xóa, access token TTL 2 giây qua process env, không sửa .env hoặc dữ liệu ứng dụng.

Giới hạn: đồng bộ refresh trong một tab; chưa có khóa liên tab và BE cần xử lý rotation đồng thời nguyên tử. Apidog, Caddy/HTTPS production, upload lưu trữ thật chưa kiểm chứng. AuthProvider và UI đăng nhập nghiệp vụ thuộc W1-FE-04; form hiện tại vẫn là placeholder. Bootstrap hiện đã restore một lần; khi tích hợp provider cần chuyển quyền restore, tránh gọi thêm lần thứ hai. Logout lỗi mạng chỉ đảm bảo dọn local, chưa xác nhận cookie đã được server thu hồi.
