# W1-FE-03 — Tầng API dùng chung

Phần nền cho W1-FE-04/05/06: transport, types, Query, helpers và hook mẫu. Không xây UI nghiệp vụ hay backend. Luồng refresh **đang hoãn**, không coi task đã hoàn tất phần refresh.

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

Enum Role và RegisterSchema hiện cho phép cả `ADMIN`, dù mô tả đăng ký nói HR/CANDIDATE. FE types phản ánh DTO này; Huy cần chốt và giới hạn role tự đăng ký ở BE. Khi làm UI đăng ký, chỉ hiển thị HR/CANDIDATE, không coi việc ẩn lựa chọn ADMIN ở FE là kiểm soát quyền backend.

Auth BE vẫn trả token mock và refreshToken trong JSON; chưa xác nhận cookie HttpOnly hoặc enforcement 401/403 thật. FE chỉ giữ accessToken trong bộ nhớ và chỉ trả `{ accessToken, user }` từ login/register. RefreshToken không được lưu hoặc đưa vào cache. Tests 401/403 dùng adapter kiểm thử, không chứng minh auth BE thật đã hoạt động.

## Token và phiên

`tokenStore` có get/set/clearAccessToken, không localStorage/sessionStorage/persisted cache. Bearer tính lại cho từng request; xóa header cũ khi token rỗng. Reload mất accessToken, chưa khôi phục phiên.

Login/register thành công: hủy query đang chạy, xóa cache tài khoản cũ, đặt accessToken mới và trả user. AuthProvider do Minh bổ sung bên trong QueryClientProvider hiện có.

Logout gửi POST logout rồi **luôn** xóa token, hủy queries và xóa query/mutation cache bằng singleton `queryClient.clear()`, kể cả khi server lỗi. Lỗi vẫn trả về caller để thông báo logout phía server chưa xác nhận. UI dọn AuthProvider state và tự quyết định điều hướng. Không chạy login/register/logout đồng thời hoặc đổi tài khoản khi mutation riêng tư còn đang gửi; khóa thao tác phiên khi tích hợp AuthProvider. Factory QueryClient dùng cho test isolation, app sử dụng singleton.

401 hiện reject về caller, không retry ở Query, không xóa token, không chuyển trang và không gọi endpoint khác.

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

API exports: auth có register/login/logout/getMe; jobs có getJobs/getJob/getMyJobs/createJob/updateJob/closeJob; applications có applyJob/getMyApplications. Không có refresh API.

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
  onError: error => handleFormError<JobForm>(error, form.setError,
    ['title', 'rubricWeights.technical']),
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
} catch (error) { notifyError(error); }
// Hủy bằng controller.abort(): không toast.
```

FormData dùng field `file`, không tự đặt Content-Type/boundary. Upload 100% chưa có nghĩa server đã xử lý xong. Khi wrap trong useMutation, dùng MutationCache thay vì catch/toast kép.

## Kiểm thử và phần chờ

`npm test -w apps/web`: Vitest + Testing Library, Axios adapter kiểm thử modules/hooks/form; proxy test dùng Vite thật và HTTP upstream cục bộ. Adapter không dùng trong app. Smoke script chỉ GET qua Vite tới BE local: jobs phân trang, detail, validation 400.

Đã kiểm tra tại thời điểm bàn giao: build, lint, tests, smoke BE local. Chưa kiểm chứng Apidog thật, Caddy production, upload tới dịch vụ lưu CV thật, JWT/cookie thật hoặc Socket.IO backend (mới cấu hình proxy).

### Refresh hoãn — tất cả chưa triển khai

- [ ] Tự gọi POST /auth/refresh khi 401.

- [ ] Shared refresh promise/hàng đợi request 401.

- [ ] Gửi lại request sau refresh.

- [ ] auth.refresh() / refreshSession().

- [ ] Khôi phục phiên sau reload.

- [ ] Xóa token và chuyển /login theo kết quả refresh.

- [ ] Kiểm thử tích hợp refresh cookie thật.

Chờ Huy hoàn thành W1-BE-03 và chốt cookie/contract. Không có refresh giả hoặc placeholder trả thành công.