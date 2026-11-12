# W1-FE-03 — Tầng API dùng chung

Phần nền cho W1-FE-04/05/06: transport, types, Query, helpers và hook mẫu. Không xây UI nghiệp vụ hay backend. Đã tích hợp refresh cookie với contract W1-BE-03; AuthProvider và UI đăng nhập nghiệp vụ thuộc W1-FE-04.

## Chạy và chuyển BE/mock

Từ gốc repo:

```sh
npm install
# Sao chép apps/web/.env.example thành apps/web/.env nếu cần đổi target
npm run dev -w apps/web
npm run build -w apps/web
npm run lint -w apps/web
npm test -w apps/web
npm run smoke:api -w apps/web # cần BE đang chạy ở localhost:3000; chỉ GET
```

Vite dùng `loadEnv(mode, webRoot, '')`; `root` và `envDir` tính từ file config. Biến không có tiền tố `VITE_` được đọc từ **apps/web**, dù chạy workspace script hay từ gốc bằng `--config apps/web/vite.config.ts`.

```dotenv
API_PROXY_TARGET=http://localhost:3000
```

Trình duyệt luôn gọi `/api` cùng domain, timeout 15 giây, `withCredentials: true`. Proxy giữ nguyên `/api`; `/socket.io` dùng `http://localhost:3000`, `ws: true`. Khởi động lại Vite sau khi đổi target. `API_PROXY_TARGET` chỉ phục vụ dev server, không đưa vào client bundle. Production dùng Caddy của Huy chuyển `/api` và `/socket.io`; không thêm URL BE production vào FE.

Quy ước mock: target là URL gốc **đứng trước** `/api`, có thể chứa path project. Ví dụ cấu trúc (không phải URL Apidog thật): target có path `/mock-project` → request `/api/jobs` được forward tới `/mock-project/api/jobs`. Không thêm `/api` cuối target khi mock dùng path `/api/...` trong OpenAPI. Không tự rewrite để đoán contract; khi có URL cần xác minh cách ghép đường dẫn thực tế. Không đặt secret trong URL hoặc commit `.env`.

### Apidog — chưa kiểm chứng

Chưa được cung cấp URL/tài khoản/quyền truy cập Apidog. Prefix có path đã kiểm thử với upstream HTTP cục bộ, **không phải kiểm thử Apidog**. Người có quyền import `openapi.json` tại gốc repo, chỉnh mock response đúng envelope dưới đây rồi đặt `API_PROXY_TARGET`. Cần xác minh jobs, detail, lỗi validation và pagination qua URL thật. Thay đổi này không cài/bật MSW trong app hoặc production.

## Contract và types

Đối chiếu OpenAPI, DTO/controller, `TransformInterceptor` và `HttpExceptionFilter` của BE:

- Axios giữ `AxiosResponse<ApiResponse<T>>`; API module unwrap đúng **một** envelope thành `T`.
- `getJobs(params)` trả `{ data: Job[], meta: { page, limit, total, totalPages? } }`.
- `getMyJobs()` và `getMyApplications()` trả mảng đã unwrap, chưa có phân trang trong DTO.
- Lỗi chuyển thành `ApiError`: `status` lấy từ HTTP response, `message` ưu tiên BE, `errors` là `string[]`, `kind` phân biệt http/network/cancelled/unknown/contract. Exception JavaScript không được coi là mất mạng.
- Response thiếu envelope hoặc pagination meta báo lỗi contract; không fallback nhận cả dữ liệu trần và `{ data }`.
- Types ở `src/types/{api,auth,jobs,applications}.ts`. `rubricWeights` đầu vào cho phép thiếu thành phần vì DTO Zod có default từng trọng số; output đủ thành phần nếu trường này có mặt.

### Chênh lệch cần Huy xử lý

Swagger mô tả auth register/login/me, job detail/create/update/close và upload application là DTO trần; jobs/mine và me/applications là mảng trần; logout là `{ message }`. Thực tế interceptor bọc tất cả trong `{ data }`. GET jobs đã có `{ data, meta }` nên được giữ nguyên. Huy cần cập nhật Swagger để import mock không sinh response sai.

Error filter trả `{ statusCode, message, errors?: string[], timestamp? }`, validation thường là `field: message`; Swagger chưa mô tả đầy đủ response lỗi. Cần schema lỗi và ví dụ field lồng nhau.

RegisterSchema và RegisterRequest chỉ cho đăng ký HR/CANDIDATE. Role của UserProfile vẫn có ADMIN để đọc tài khoản quản trị đã được cấp.

W1-BE-03 dùng JWT và cookie HttpOnly `refresh_token`, path `/api/auth`, SameSite=Lax. BE vẫn trả refreshToken trong JSON; FE bỏ trường này và chỉ trả `{ accessToken, user }`. Cookie được trình duyệt gửi qua `withCredentials: true`, không đọc bằng JavaScript hoặc lưu vào storage/cache.

## Token và phiên

`tokenStore` giữ accessToken trong bộ nhớ; không localStorage/sessionStorage/persisted cache. Bearer tính lại cho từng request. Login/logout đổi phiên và làm vô hiệu request cũ; rotation chỉ thay accessToken trong cùng phiên.

`main.tsx` cài lifecycle handler rồi khôi phục phiên một lần trước khi render App (ngoài StrictMode). `refreshSession()`/`refresh()` từ `@/api/auth` gửi POST `/auth/refresh` với body `{}` qua transport riêng không có interceptor refresh. Promise dùng chung cho các lời gọi đồng thời. Kết quả chỉ chứa accessToken và user.

```ts
import { refreshSession } from '@/api/auth';
// W1-FE-04: dùng kết quả để cập nhật AuthProvider.
const { user } = await refreshSession();
```

Khi tích hợp AuthProvider, chuyển quyền khôi phục phiên từ bootstrap hiện tại sang provider; không giữ cả hai lần gọi tuần tự vì mỗi lần sẽ rotate cookie. Subscribe `onSessionExpired()` để xóa user trong provider; nhớ unsubscribe. UI đăng nhập hiện còn là placeholder, chưa kết nối API.

- Request có Bearer nhận 401: đợi một refresh chung rồi gửi lại tối đa một lần, giữ body/params/FormData/signal.
- Request mới đợi refresh đang chạy. 401 trả về trễ của token cũ dùng token mới, không rotate thêm.
- Request đã hủy không replay; hủy một request không hủy refresh của các request khác.
- Không tự refresh login/register/refresh/logout, 403 hoặc request không mang accessToken. Guest startup khôi phục bằng lời gọi refresh tường minh.
- Refresh 401 hoặc replay vẫn 401: xóa token, hủy query và dọn cache; lifecycle thông báo và điều hướng `/login` một lần. Thiếu cookie lúc mở trang công khai là trạng thái guest bình thường, không toast/redirect.
- Refresh gặp mạng/timeout/5xx hoặc response sai contract: giữ trạng thái phiên, trả lỗi không được Query tự retry. Các 401 đến sau dùng cùng lỗi cho tới khi đổi phiên hoặc gọi `refreshSession()` tường minh để thử lại. Không tự lặp một thao tác rotation có thể đã hoàn tất trên server.
- Login/register/logout được tuần tự hóa với refresh. Logout dọn token/cache ngay, chờ refresh đã gửi kết thúc rồi mới gửi logout để cookie mới được thu hồi/xóa. Login chờ các thao tác cookie trước đó; response của tài khoản cũ không được đưa vào cache tài khoản mới. UI nên khóa submit auth trong khi đang gửi.
- Logout lỗi vẫn reject về caller; local đã đăng xuất nhưng cookie phía server chưa được xác nhận xóa. Không coi logout khi mất mạng là đã thu hồi phiên trên server.

Phạm vi đồng bộ là **một tab**. Nhiều tab dùng chung cookie vẫn có thể refresh đồng thời. BE hiện đọc revokedAt trước transaction; cần phối hợp BE để xử lý rotation đồng thời một cách nguyên tử. FE chưa có khóa liên tab. Access token không được ghi log.

Local HTTP dùng `COOKIE_SECURE=false`; production HTTPS dùng `true`. Proxy giữ `/api` để cookie path `/api/auth` khớp refresh/logout; không cần sửa cookie path. `.env.example` BE còn API_PREFIX nhưng bootstrap thực tế đặt prefix `api`.

## API và hooks

```ts
import { getJobs, getJob } from '@/api/jobs';
import { notifyError } from '@/lib/errorUtils';
try {
  const { data: jobs, meta } = await getJobs({ page: 1, limit: 10, search: 'SQL', status: 'OPEN' });
  console.log(jobs, meta.total);
  const detail = await getJob('job-uuid');
  console.log(detail.title); // không cần .data.data
} catch (error) {
  notifyError(error); // API trực tiếp: caller sở hữu thông báo
}
```

API exports: auth có register/login/logout/getMe/refresh/refreshSession; jobs có getJobs/getJob/getMyJobs/createJob/updateJob/closeJob; applications có applyJob/getMyApplications. Có refresh/refreshSession dùng chung luồng rotation.

Trong component: `const jobs = useJobs({ page, search, status });` dùng `jobs.data?.data` và `jobs.data?.meta`. `const create = useCreateJob(); create.mutate(body);` sẽ invalidate namespace jobs, gồm public lists, mine và detail. Truyền options onSuccess/onError/meta vẫn giữ invalidation. Khi update/close trực tiếp, caller invalidate `queryKeys.jobs.all` sau thành công.

Provider ở `main.tsx` dùng QueryClient tạo một lần. Giữ một Toaster trong App. Devtools lazy import chỉ khi `import.meta.env.DEV`.

Query: staleTime 30s, không refetch khi focus; mạng/timeout/5xx retry đúng 1 lần; mọi 4xx, lỗi JS/contract và cancellation không retry. Mutation mặc định retry=false để tránh tạo/nộp trùng.

Query keys (`src/api/queryKeys.ts`): `auth.all/me()`, `jobs.all/public()/list(params)/mine()/detail(id)`, `applications.all/mine()`, `interviews.all`. Interviews chỉ có namespace, chưa giả định endpoint. List key chứa params ảnh hưởng dữ liệu. Dùng factory và key gốc để invalidate, không đưa token vào key.

## Lỗi và react-hook-form

Mỗi request có một nơi sở hữu thông báo:

1. Interceptor/API không toast.
2. QueryCache toast khi thất bại sau retry cuối, một lần cho shared query. Component không toast lại query.error. Muốn tự xử lý: `meta: { errorMode: 'local' }` hoặc `'silent'`.
3. MutationCache toast mặc định. Khi có **hook-level onError**, caller sở hữu thông báo. Callback chỉ truyền vào `mutate()` không thay quyền sở hữu; dùng hook options hoặc `meta.errorMode='local'`.
4. API trực tiếp: catch rồi gọi notifyError hoặc handleFormError, không cả hai cho validation. Helper chặn toast trùng trên cùng đối tượng lỗi và bỏ qua cancellation.

Ví dụ trong component form:

```tsx
import { useForm } from 'react-hook-form';
import { useCreateJob } from '@/hooks/useJobs';
import { handleFormError } from '@/lib/errorUtils';

type JobForm = { title: string; rubricWeights: { technical: number } };
const form = useForm<JobForm>();
const create = useCreateJob({
  onError: (error) =>
    handleFormError<JobForm>(error, form.setError, ['title', 'rubricWeights.technical']),
});
// Render errors.title?.message và errors.root?.server?.message.
// Trước submit: form.clearErrors(); tạo đủ CreateJobRequest rồi create.mutate(body).
```

Truyền generic rõ ràng cho helper. 400/422 gắn lỗi vào form, lỗi không map được giữ tại `root.server`. Các lỗi khác dùng sonner, ưu tiên message BE, fallback tiếng Việt cho mạng/5xx/403.

`applyFieldErrors<FormValues>(errors, setError, allowedFields, aliases?)` tách ở dấu `:` đầu tiên. Allow-list chứa field RHF (`profile.name`, `items.0.name`...), alias chỉ định rõ như `{ fullName: 'profile.name' }`. Không đoán field từ câu tiếng Việt. Nhiều lỗi cùng field ghép newline; lỗi không có field/không được phép đưa vào root.server.

## Upload

```ts
import { applyJob } from '@/api/applications';
import { notifyError } from '@/lib/errorUtils';
const controller = new AbortController();
try {
  const application = await applyJob(jobId, file, {
    signal: controller.signal,
    onUploadProgress: ({ loaded, total, percent }) => {
      // percent undefined: dùng trạng thái không xác định, không chia cho total.
      console.log({ loaded, total, percent });
    },
  });
  console.log(application.id); // Chỉ tới đây server mới trả thành công.
} catch (error) {
  notifyError(error);
}
// Hủy bằng controller.abort(): không toast.
```

FormData dùng field `file`, không tự đặt Content-Type/boundary. Upload 100% chưa có nghĩa server đã xử lý xong. Khi wrap trong useMutation, dùng MutationCache thay vì catch/toast kép.

## Kiểm thử và phần chờ

`npm test -w apps/web`: Vitest + Testing Library, Axios adapter kiểm thử modules/hooks/form; proxy test dùng Vite thật và HTTP upstream cục bộ. Adapter không dùng trong app. Smoke script chỉ GET qua Vite tới BE local: jobs phân trang, detail, validation 400.

Đã kiểm tra tại thời điểm bàn giao: build, lint, tests, smoke BE local. Chưa kiểm chứng Apidog thật, Caddy production, upload tới dịch vụ lưu CV thật hoặc Socket.IO backend (mới cấu hình proxy).

### Kiểm thử refresh

`src/lib/session.test.ts` kiểm tra đồng thời 401, late 401, replay tối đa một lần, loại trừ auth/403, cancellation, timeout/network/5xx/contract, logout/login khi rotation đang chạy, response tài khoản cũ và bootstrap guest. `api.test.tsx` giữ kiểm thử transport/Query/form/upload hiện có.

Kiểm tra thủ công với BE local và trình duyệt:

1. Chạy PostgreSQL và BE W1-BE-03; chạy `npm run dev -w apps/web`.
2. Trong console của Vite dev, dùng `const auth = await import('/src/api/auth.ts')`, rồi `await auth.login({ email: 'tài-khoản-test', password: 'mật-khẩu-test' })`. Không dùng form placeholder để kết luận API đã gọi.
3. DevTools Application/Cookies: `refresh_token` là HttpOnly, path `/api/auth`; FE storage không chứa token.
4. Với tài khoản test, cấu hình BE access token TTL ngắn, restart và login lại. Sau khi token hết hạn, gọi đồng thời `Promise.all([auth.getMe(), auth.getMe(), auth.getMe()])`. Network phải có một refresh và các request replay thành công.
5. Reload: bootstrap refresh thành công; gọi getMe nhận được user. Không in token lên log hoặc đưa token vào ảnh chụp.
6. Xóa cookie refresh, làm access token hết hạn: request protected đưa về login, cache được dọn, không refresh lặp.
7. Login lại rồi logout: cookie biến mất; reload trở thành guest. Thử ngắt mạng khi refresh để xác nhận không bị ép logout do lỗi kết nối.

Kết quả ngày 12/11/2026:

- Build FE, lint và 49 tests tự động đều đạt.
- 8 kịch bản trên Edge headless với Vite + NestJS W1-BE-03 + PostgreSQL thật đã đạt: guest startup im lặng; register đặt cookie HttpOnly và FE bỏ refreshToken; 5 request JWT hết hạn chỉ rotate một lần; reload khôi phục user; refresh 500 giữ phiên và explicit retry khôi phục; xóa cookie + JWT hết hạn dọn cache/chuyển login; logout trong lúc rotation xóa cookie mới; reload sau logout vẫn guest.
- Backend kiểm thử dùng access TTL 2 giây bằng biến môi trường của process. Database tạm được migrate và xóa sau kiểm tra; không sửa .env hoặc database ứng dụng. Kịch bản 500 dùng network interception có chủ đích; các luồng JWT/cookie còn lại gọi BE thật.
- Khóa liên tab và cookie Secure trên production HTTPS chưa được kiểm chứng. Không coi unit tests hoặc bài kiểm tra một browser context là bằng chứng cho các trường hợp đó.
