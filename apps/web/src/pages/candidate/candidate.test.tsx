import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { toast } from 'sonner';
import CandidateJobsPage from './CandidateJobsPage';
import CandidateJobDetailPage from './CandidateJobDetailPage';
import LoginPage from '@/pages/auth/LoginPage';
import { apiClient, toApiError } from '@/lib/axios';
import { authTransport } from '@/lib/authTransport';
import { createQueryClient } from '@/lib/queryClient';
import { clearAccessToken, setAccessToken } from '@/lib/tokenStore';
import { MAX_CV_BYTES, validateCv } from '@/lib/cvValidation';
import { safeCandidateReturnTo } from '@/lib/loginRedirect';
import type { Job } from '@/types/jobs';
import type { Application } from '@/types/applications';
import type { UserProfile } from '@/types/auth';
import AuthProvider from '@/providers/AuthProvider';
import { StrictMode } from 'react';
import { expireSession } from '@/lib/session';
import { getSessionVersion } from '@/lib/tokenStore';
import { GuestRoute } from '@/routes/guards';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const originalAdapter = apiClient.defaults.adapter;
const originalAuthAdapter = authTransport.defaults.adapter;
const profile: UserProfile = {
  id: 'candidate-1',
  email: 'candidate@example.com',
  fullName: 'Ứng viên thử',
  role: 'CANDIDATE',
  createdAt: '2026-11-15',
};
const template: Job = {
  id: 'job-1',
  title: 'Backend Developer',
  description: 'Phát triển API',
  requiredSkills: ['TypeScript'],
  preferredSkills: [],
  minYearsExperience: 2,
  status: 'OPEN',
  cvPassThreshold: 70,
  interviewQuestionCount: 3,
  createdById: 'hr',
  createdAt: '2026-11-15',
  updatedAt: '2026-11-15',
};
const application: Application = {
  id: 'application-1',
  job: { id: 'job-1', title: template.title },
  status: 'SUBMITTED',
  cvFileName: 'cv.pdf',
  cvSizeBytes: 100,
  cvMimeType: 'application/pdf',
  createdAt: '2026-11-15',
  updatedAt: '2026-11-15',
};
let rows: Job[];
let applications: Application[];
let user: UserProfile;
let calls: InternalAxiosRequestConfig[];
let uploadError: { status: number; code?: string } | undefined;
let appsFail: boolean;
let uploadGate: Promise<void> | undefined;
let client: ReturnType<typeof createQueryClient>;
function reply(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: 'Test', headers: {} };
}
function reject(config: InternalAxiosRequestConfig, status: number, code?: string): never {
  throw new AxiosError(
    'Test error',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    reply(config, { message: 'Lỗi từ máy chủ', code }, status),
  );
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  clearAccessToken();
  vi.clearAllMocks();
  rows = [{ ...template }];
  applications = [];
  user = { ...profile };
  calls = [];
  uploadError = undefined;
  appsFail = false;
  uploadGate = undefined;
  authTransport.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') reject(config, 401);
    return reply(config, { data: { accessToken: 'logged-in', user } });
  };
  client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false },
  });
  apiClient.defaults.adapter = async (config) => {
    calls.push(config);
    if (config.url === '/auth/me') return reply(config, { data: user });
    if (config.url === '/me/applications') {
      if (appsFail) reject(config, 500);
      return reply(config, { data: [...applications] });
    }
    if (config.url === '/jobs') {
      const { page, limit, search = '' } = config.params;
      const filtered = rows.filter(
        (job) => job.status === 'OPEN' && job.title.toLowerCase().includes(search.toLowerCase()),
      );
      return reply(config, {
        data: filtered.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: filtered.length },
      });
    }
    if (config.method === 'post') {
      expect(config.data).toBeInstanceOf(FormData);
      config.onUploadProgress?.({ loaded: 100, total: 100, bytes: 100, lengthComputable: true });
      if (uploadGate) await uploadGate;
      if (uploadError) reject(config, uploadError.status, uploadError.code);
      applications = [application];
      return reply(config, { data: application }, 201);
    }
    const job = rows.find((item) => config.url === `/jobs/${item.id}`);
    if (!job) reject(config, 404);
    return reply(config, { data: job });
  };
});
afterEach(() => {
  cleanup();
  client.clear();
  apiClient.defaults.adapter = originalAdapter;
  authTransport.defaults.adapter = originalAuthAdapter;
  clearAccessToken();
});
function Location() {
  const loc = useLocation();
  return (
    <div data-testid="location">
      {loc.pathname}
      {loc.search}
    </div>
  );
}
function mount(path = '/candidate/jobs/job-1') {
  return render(
    <QueryClientProvider client={client}>
      <StrictMode>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/candidate/jobs" element={<CandidateJobsPage />} />
              <Route path="/candidate/jobs/:id" element={<CandidateJobDetailPage />} />
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
            </Routes>
            <Location />
          </MemoryRouter>
        </AuthProvider>
      </StrictMode>
    </QueryClientProvider>,
  );
}
async function readyToApply() {
  setAccessToken('test-access');
  const view = mount();
  await screen.findByRole('button', { name: 'Nộp CV' });
  return view;
}
function choose(file = new File(['%PDF-1.4 test'], 'cv.pdf', { type: 'application/pdf' })) {
  fireEvent.change(screen.getByLabelText('Chọn CV PDF'), { target: { files: [file] } });
}
const posts = () => calls.filter((call) => call.method === 'post');

describe('candidate jobs', () => {
  it('renders BE-04 requirements and level without requiring private HR fields', async () => {
    rows[0] = {
      ...template,
      requirements: 'Build reliable APIs and review code.',
      level: 'SENIOR',
    };
    mount();
    await screen.findByText('Cấp độ: SENIOR');
    expect(screen.getByText('Build reliable APIs and review code.')).toBeTruthy();
  });
  it('restores one refresh rotation in StrictMode and removes identity on expiration', async () => {
    let rotations = 0;
    authTransport.defaults.adapter = async (config) => {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return reply(config, { data: { accessToken: 'restored', user: profile } });
    };
    mount();
    await screen.findByRole('button', { name: 'Nộp CV' });
    expect(rotations).toBe(1);
    act(() => {
      expireSession(getSessionVersion());
    });
    await screen.findByRole('link', { name: 'Đăng nhập để nộp CV' });
    expect(screen.queryByRole('button', { name: 'Nộp CV' })).toBeNull();
  });
  it('debounces search for 300ms and resets pagination using the URL', async () => {
    rows = Array.from({ length: 7 }, (_, index) => ({
      ...template,
      id: `job-${index + 1}`,
      title: `Backend ${index + 1}`,
    }));
    mount('/candidate/jobs?page=2');
    await screen.findByRole('link', { name: 'Backend 7' });
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Back' } });
    fireEvent.change(input, { target: { value: 'Backend 1' } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    expect(calls.filter((call) => call.url === '/jobs')).toHaveLength(1);
    await screen.findByRole('link', { name: 'Backend 1' });
    const requests = calls.filter((call) => call.url === '/jobs');
    expect(requests).toHaveLength(2);
    expect(requests[1].params).toMatchObject({
      page: 1,
      search: 'Backend 1',
      limit: 6,
    });
    expect(screen.getByTestId('location').textContent).toContain('page=1');
  });
  it('paginates using meta.total and shows only open jobs', async () => {
    rows = Array.from({ length: 7 }, (_, index) => ({
      ...template,
      id: `job-${index + 1}`,
      title: `Job ${index + 1}`,
    }));
    rows.push({ ...template, id: 'closed', title: 'Closed Job', status: 'CLOSED' });
    mount('/candidate/jobs');
    await screen.findByRole('link', { name: 'Job 1' });
    expect(screen.queryByText('Closed Job')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await screen.findByRole('link', { name: 'Job 7' });
    expect((screen.getByRole('button', { name: 'Trang sau' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    await screen.findByRole('link', { name: 'Job 1' });
  });
  it('has distinct empty and detail 404 states', async () => {
    rows = [];
    const view = mount('/candidate/jobs');
    await screen.findByText('Không tìm thấy việc làm phù hợp');
    view.unmount();
    mount('/candidate/jobs/missing');
    await screen.findByText('Không tìm thấy việc làm');
    expect(screen.queryByRole('button', { name: 'Nộp CV' })).toBeNull();
  });
  it('treats a malformed UUID rejected by BE-04 as an invalid job link', async () => {
    apiClient.defaults.adapter = async (config) => reject(config, 400);
    mount('/candidate/jobs/not-a-uuid');
    await screen.findByText('Không tìm thấy việc làm');
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
  });
  it('shows loading and recoverable request errors instead of an empty success', async () => {
    const gate = deferred();
    apiClient.defaults.adapter = async (config) => {
      await gate.promise;
      reject(config, 500);
    };
    mount('/candidate/jobs');
    await screen.findByText(/Đang tìm/);
    gate.resolve();
    await screen.findByRole('alert');
    expect(screen.queryByText('Không tìm thấy việc làm phù hợp')).toBeNull();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
  it('lets a guest read details without fetching private applications and preserves returnTo', async () => {
    mount();
    await screen.findByText('Cấp độ: Chưa cung cấp');
    const link = screen.getByRole('link', { name: 'Đăng nhập để nộp CV' });
    expect(link.getAttribute('href')).toBe('/login?returnTo=%2Fcandidate%2Fjobs%2Fjob-1');
    expect(calls.some((call) => call.url === '/me/applications')).toBe(false);
  });
  it('uses real login and returns a candidate to the requested job', async () => {
    mount('/login?returnTo=%2Fcandidate%2Fjobs%2Fjob-1');
    await screen.findByLabelText('Email');
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'candidate@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await screen.findByRole('button', { name: 'Nộp CV' });
    expect(screen.getByTestId('location').textContent).toBe('/candidate/jobs/job-1');
  });
});

describe('candidate upload', () => {
  it('blocks non-PDF, empty and over-limit files before sending a request', async () => {
    await readyToApply();
    for (const file of [
      new File(['doc'], 'cv.docx'),
      new File([], 'cv.pdf', { type: 'application/pdf' }),
      new File([new Uint8Array(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }),
    ]) {
      choose(file);
      expect(screen.getByRole('alert')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
    }
    expect(posts()).toHaveLength(0);
  });
  it('supports drop and waits for server confirmation at 100%, prevents double submit, persists submitted state after remount', async () => {
    const gate = deferred();
    uploadGate = gate.promise;
    const view = await readyToApply();
    fireEvent.drop(screen.getByRole('button', { name: /Kéo thả CV/ }), {
      dataTransfer: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })] },
    });
    const submit = screen.getByRole('button', { name: 'Nộp CV' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await screen.findByText('Đang kiểm tra CV…');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(toast.success).not.toHaveBeenCalled();
    expect(posts()).toHaveLength(1);
    gate.resolve();
    await screen.findByRole('button', { name: 'Đã nộp' });
    expect(toast.success).toHaveBeenCalledTimes(1);
    view.unmount();
    client.clear();
    mount();
    await screen.findByRole('button', { name: 'Đã nộp' });
    expect(posts()).toHaveLength(1);
  });
  it.each([
    ['CV_FILE_REQUIRED', 'chọn file CV'],
    ['CV_INVALID_FILE_TYPE', 'phải là file PDF'],
    ['CV_FILE_TOO_LARGE', 'tối đa 5MB'],
    ['JOB_NOT_FOUND', 'không còn tồn tại'],
    ['SCANNED', 'chọn và sao chép chữ'],
    ['ENCRYPTED', 'bỏ mật khẩu'],
    ['CORRUPTED', 'không đọc được'],
    ['EMPTY', 'không có nội dung văn bản'],
    ['TOO_MANY_PAGES', 'số trang cho phép'],
  ])(
    'maps %s to actionable Vietnamese guidance and allows a replacement file',
    async (code, message) => {
      uploadError = { status: 422, code };
      await readyToApply();
      choose();
      fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message));
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      choose(new File(['%PDF replacement'], 'replacement.pdf', { type: 'application/pdf' }));
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it('handles a closed job before sending and JOB_CLOSED during submission', async () => {
    rows[0].status = 'CLOSED';
    const view = mount();
    await screen.findByText('Vị trí này đã ngừng nhận hồ sơ.');
    expect(posts()).toHaveLength(0);
    view.unmount();
    client.clear();
    rows[0].status = 'OPEN';
    uploadError = { status: 409, code: 'JOB_CLOSED' };
    await readyToApply();
    choose();
    fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
    await screen.findByText('Vị trí này đã ngừng nhận hồ sơ.');
    expect(screen.queryByRole('button', { name: 'Đã nộp' })).toBeNull();
  });
  it('uses ALREADY_APPLIED as submitted, and never retries the POST', async () => {
    uploadError = { status: 409, code: 'ALREADY_APPLIED' };
    await readyToApply();
    choose();
    fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
    await screen.findByRole('button', { name: 'Đã nộp' });
    expect(posts()).toHaveLength(1);
  });
  it.each([409, 500])(
    'reconciles an ambiguous HTTP %s against GET applications before another POST',
    async (status) => {
      uploadError = { status };
      await readyToApply();
      choose();
      fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
      await screen.findByRole('button', { name: 'Kiểm tra trạng thái hồ sơ' });
      expect((screen.getByRole('button', { name: 'Nộp CV' }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      applications = [application]; // The server had accepted it despite the ambiguous response.
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái hồ sơ' }));
      await screen.findByRole('button', { name: 'Đã nộp' });
      expect(posts()).toHaveLength(1);
    },
  );
  it('blocks submission when application history cannot be loaded', async () => {
    appsFail = true;
    setAccessToken('test');
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Nộp CV' })).toBeNull();
    expect(posts()).toHaveLength(0);
  });
  it('cancels upload without a success toast and requires reconciliation', async () => {
    const base = apiClient.defaults.adapter as AxiosAdapter;
    apiClient.defaults.adapter = async (config) => {
      if (config.method !== 'post') return base(config);
      calls.push(config);
      config.onUploadProgress?.({ loaded: 50, bytes: 50, lengthComputable: false });
      await new Promise<void>((_resolve, reject) => {
        config.signal?.addEventListener?.('abort', () => reject(new CanceledError()));
      });
      return reply(config, {});
    };
    await readyToApply();
    choose();
    fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
    await screen.findByText('Đang tải CV…');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy tải lên' }));
    await screen.findByRole('button', { name: 'Kiểm tra trạng thái hồ sơ' });
    expect(toast.success).not.toHaveBeenCalled();
    expect(posts()).toHaveLength(1);
  });
  it('does not enable another upload when reconciliation itself fails', async () => {
    uploadError = { status: 500 };
    await readyToApply();
    choose();
    fireEvent.click(screen.getByRole('button', { name: 'Nộp CV' }));
    await screen.findByRole('button', { name: 'Kiểm tra trạng thái hồ sơ' });
    appsFail = true;
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái hồ sơ' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Không kiểm tra được hồ sơ'),
    );
    expect((screen.getByRole('button', { name: 'Nộp CV' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(posts()).toHaveLength(1);
  });
  it('blocks HR from applying and shows applied badges from the server on the job list', async () => {
    user.role = 'HR';
    setAccessToken('test');
    const view = mount();
    await screen.findByText('Chức năng nộp CV dành cho tài khoản ứng viên.');
    expect(calls.some((call) => call.url === '/me/applications')).toBe(false);
    view.unmount();
    client.clear();
    user.role = 'CANDIDATE';
    applications = [application];
    mount('/candidate/jobs');
    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Danh sách việc làm' })).getByText('Đã nộp'),
      ).toBeTruthy(),
    );
  });
});

describe('CV and error contracts', () => {
  it('accepts the exact size boundary, permits missing MIME for .pdf, rejects conflicting MIME', () => {
    expect(
      validateCv(new File([new Uint8Array(MAX_CV_BYTES)], 'CV.PDF', { type: 'application/pdf' })),
    ).toBeNull();
    expect(validateCv(new File(['%PDF'], 'cv.pdf'))).toBeNull();
    expect(validateCv(new File(['doc'], 'cv.pdf', { type: 'application/msword' }))).not.toBeNull();
  });
  it('preserves the explicit BE code instead of guessing from message', () => {
    const config = {} as InternalAxiosRequestConfig;
    const error = toApiError(
      new AxiosError(
        'request',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        reply(config, { code: 'SCANNED', message: 'any language' }, 422),
      ),
    );
    expect(error).toMatchObject({ code: 'SCANNED', status: 422 });
  });
  it('rejects external and malformed return URLs', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/candidate/jobs/../..',
      '/hr/jobs',
      '/candidate/jobs\\evil',
    ])
      expect(safeCandidateReturnTo(value)).toBeNull();
    expect(safeCandidateReturnTo('/candidate/jobs/job-1?from=list')).toBe(
      '/candidate/jobs/job-1?from=list',
    );
  });
});
