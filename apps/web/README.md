# Web application

Frontend sử dụng các đường dẫn tương đối bắt đầu bằng `/api` để gọi backend.
Ở W1-FE-03, Vite proxy sẽ forward các request này tới giá trị `API_PROXY_TARGET`
trong file `.env` (mặc định là `http://localhost:3000`).
