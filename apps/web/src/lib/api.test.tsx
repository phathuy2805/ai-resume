import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AxiosError,
  CanceledError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { apiClient, toApiError } from './axios';
import { authTransport } from './authTransport';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';
import { applyFieldErrors, handleFormError, notifyError } from './errorUtils';
import { createQueryClient, queryClient } from './queryClient';
import { ApiError } from '@/types/api';
import { getJob, getJobs, getMyJobs, updateJob, closeJob } from '@/api/jobs';
import { login, register, logout, getMe } from '@/api/auth';
import { applyJob, getMyApplications } from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { useJobs, useCreateJob } from '@/hooks/useJobs';
import type { Job } from '@/types/jobs';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const originalAdapter = apiClient.defaults.adapter;
const originalAuthAdapter = authTransport.defaults.adapter;
const job: Job = {
  id: 'job-1',
  title: 'Backend',
  description: 'Build API',
  requiredSkills: ['SQL'],
  preferredSkills: [],
  minYearsExperience: 3,
  status: 'OPEN',
  cvPassThreshold: 70,
  interviewQuestionCount: 3,
  createdById: 'hr-1',
  createdAt: '2026-11-09',
  updatedAt: '2026-11-09',
};
const profile = {
  id: 'u1',
  email: 'test@example.com',
  fullName: 'Test',
  role: 'HR',
  createdAt: '2026-11-09',
};
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: 'test', headers: {} };
}
function failingAdapter(status: number, body: unknown = {}) {
  return vi.fn<AxiosAdapter>(async (config) => {
    throw new AxiosError(
      'HTTP error',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      response(config, body, status),
    );
  });
}
beforeEach(() => {
  clearAccessToken();
  vi.clearAllMocks();
  queryClient.clear();
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  apiClient.defaults.adapter = originalAdapter;
  authTransport.defaults.adapter = originalAuthAdapter;
});

describe('transport and contracts', () => {
  it('uses memory token at request time and removes a stale Authorization header', async () => {
    const headers: unknown[] = [];
    apiClient.defaults.adapter = async (config) => {
      expect(config.baseURL).toBe('/api');
      expect(config.timeout).toBe(15000);
      expect(config.withCredentials).toBe(true);
      headers.push(config.headers.get('Authorization'));
      return response(config, { data: job });
    };
    setAccessToken('first');
    await getJob('1');
    setAccessToken('second');
    await getJob('1');
    clearAccessToken();
    await apiClient.get('/jobs/1', { headers: { Authorization: 'Bearer old' } });
    expect(headers).toEqual(['Bearer first', 'Bearer second', undefined]);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('keeps AxiosResponse, unwraps one envelope and retains pagination meta', async () => {
    apiClient.defaults.adapter = async (config) =>
      response(config, { data: [job], meta: { page: 2, limit: 5, total: 9 } });
    expect((await apiClient.get('/jobs')).status).toBe(200);
    expect(await getJobs({ page: 2, limit: 5 })).toEqual({
      data: [job],
      meta: { page: 2, limit: 5, total: 9 },
    });
    apiClient.defaults.adapter = async (config) => response(config, { data: job });
    expect(await getJob('job-1')).toEqual(job);
  });
  it('rejects bare Swagger objects and list responses without meta', async () => {
    apiClient.defaults.adapter = async (config) => response(config, job);
    await expect(getJob('1')).rejects.toMatchObject({ kind: 'contract' });
    apiClient.defaults.adapter = async (config) => response(config, { data: [job] });
    await expect(getJobs()).rejects.toMatchObject({ kind: 'contract' });
  });
  it('propagates a guest 401 without starting an automatic cookie refresh', async () => {
    const adapter = failingAdapter(401, { statusCode: 401, message: 'Hết phiên' });
    apiClient.defaults.adapter = adapter;
    const href = window.location.href;
    await expect(getMe()).rejects.toMatchObject({ status: 401, message: 'Hết phiên' });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe('/auth/me');
    expect(getAccessToken()).toBeNull();
    expect(window.location.href).toBe(href);
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('login/register keep only access token and drop refresh from the returned value', async () => {
    authTransport.defaults.adapter = async (config) =>
      response(config, {
        data: { accessToken: 'new', refreshToken: 'do-not-store', user: profile },
      });
    queryClient.setQueryData(['private'], 'old user');
    expect(await login({ email: 'test@example.com', password: 'example-password' })).toEqual({
      accessToken: 'new',
      user: profile,
    });
    expect(getAccessToken()).toBe('new');
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(
      await register({
        email: 'test@example.com',
        password: 'example-password',
        fullName: 'Test',
        role: 'HR',
      }),
    ).not.toHaveProperty('refreshToken');
  });
  it('logout clears token and cache even if server rejects, while preserving the error', async () => {
    authTransport.defaults.adapter = failingAdapter(500);
    setAccessToken('old');
    queryClient.setQueryData(['private'], profile);
    await expect(logout()).rejects.toMatchObject({ status: 500 });
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
  it('routes mine, updates, closes and applications to the documented endpoints', async () => {
    const calls: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      calls.push(`${config.method} ${config.url}`);
      return response(config, { data: config.method === 'get' ? [] : job });
    };
    expect(await getMyJobs()).toEqual([]);
    expect(await getMyApplications()).toEqual([]);
    await updateJob('job-1', { title: 'Updated' });
    await closeJob('job-1');
    expect(calls).toEqual([
      'get /jobs/mine',
      'get /me/applications',
      'patch /jobs/job-1',
      'patch /jobs/job-1/close',
    ]);
  });
});

describe('error presentation', () => {
  it('maps nested paths/aliases, splits only the first colon and retains unknown errors at root', () => {
    const setError = vi.fn<UseFormSetError<{ email: string; profile: { name: string } }>>();
    applyFieldErrors<{ email: string; profile: { name: string } }>(
      [
        'email: Sai: định dạng',
        'fullName: Thiếu tên',
        'unknown: Không hợp lệ',
        'Lỗi không có field',
      ],
      setError,
      ['email', 'profile.name'],
      { fullName: 'profile.name' },
    );
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Sai: định dạng' });
    expect(setError).toHaveBeenCalledWith('profile.name', { type: 'server', message: 'Thiếu tên' });
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'unknown: Không hợp lệ\nLỗi không có field',
    });
  });
  it('validation handled by a form never produces a duplicate toast; cancellation is silent', () => {
    const error = new ApiError('Validation failed', {
      kind: 'http',
      status: 400,
      errors: ['email: Sai email'],
    });
    const setError = vi.fn<UseFormSetError<{ email: string }>>();
    handleFormError<{ email: string }>(error, setError, ['email']);
    notifyError(error);
    notifyError(new CanceledError());
    expect(toast.error).not.toHaveBeenCalled();
    handleFormError<{ email: string }>(
      new ApiError('Sai thông tin', { kind: 'http', status: 400 }),
      setError,
      ['email'],
    );
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Sai thông tin',
    });
  });
  it.each([403, 500])(
    'uses a Vietnamese fallback for %s and deduplicates the same failure',
    async (status) => {
      apiClient.defaults.adapter = failingAdapter(status);
      const error: unknown = await getJobs().catch((failure: unknown) => failure);
      notifyError(error);
      notifyError(error);
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        status === 403
          ? 'Bạn không có quyền thực hiện thao tác này.'
          : 'Máy chủ gặp lỗi. Vui lòng thử lại sau.',
      );
    },
  );
  it('reports network failure in Vietnamese for a direct API caller', async () => {
    apiClient.defaults.adapter = async () => {
      throw new AxiosError('Network Error', 'ERR_NETWORK');
    };
    const error: unknown = await getJobs().catch((failure: unknown) => failure);
    notifyError(error);
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      'Không thể kết nối máy chủ hoặc yêu cầu đã hết thời gian chờ.',
    );
  });
  it('preserves actual HTTP status and backend message, not an inconsistent body status', async () => {
    apiClient.defaults.adapter = failingAdapter(403, {
      statusCode: 500,
      message: 'Chỉ HR được phép',
      errors: ['role: HR only'],
    });
    await expect(getJobs()).rejects.toMatchObject({
      status: 403,
      message: 'Chỉ HR được phép',
      errors: ['role: HR only'],
    });
  });
});

describe('Query retries and notification ownership', () => {
  it.each([400, 401, 403, 404, 422, 429, 500, 503])(
    'retries the correct number of times for HTTP %s; toasts once after failure',
    async (status) => {
      const client = createQueryClient();
      client.setDefaultOptions({
        queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
      });
      const adapter = failingAdapter(status);
      apiClient.defaults.adapter = adapter;
      await expect(
        client.fetchQuery({ queryKey: ['test'], queryFn: () => getJobs() }),
      ).rejects.toMatchObject({ status });
      expect(adapter).toHaveBeenCalledTimes(status >= 500 ? 2 : 1);
      expect(toast.error).toHaveBeenCalledTimes(1);
      client.clear();
    },
  );
  it('retries a transport network error once, not arbitrary JS errors, configuration errors or cancellations', async () => {
    for (const [error, count] of [
      [new AxiosError('offline', 'ERR_NETWORK'), 2],
      [new TypeError('bug'), 1],
      [new AxiosError('bad config', 'ERR_BAD_OPTION'), 1],
      [new CanceledError(), 1],
    ] as const) {
      const client = createQueryClient();
      client.setDefaultOptions({
        queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
      });
      const queryFn = vi.fn().mockRejectedValue(toApiError(error));
      await expect(
        client.fetchQuery({ queryKey: ['test'], queryFn, meta: { errorMode: 'silent' } }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(queryFn).toHaveBeenCalledTimes(count);
      client.clear();
    }
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('does not toast when the retry succeeds', async () => {
    const client = createQueryClient();
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 0 } });
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('offline', { kind: 'network' }))
      .mockResolvedValueOnce('ok');
    expect(await client.fetchQuery({ queryKey: ['test'], queryFn })).toBe('ok');
    expect(toast.error).not.toHaveBeenCalled();
    client.clear();
  });
  it('uses list params in cache keys and invalidates jobs after creating', async () => {
    const client = createQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    apiClient.defaults.adapter = async (config) =>
      response(
        config,
        config.method === 'post'
          ? { data: job }
          : { data: [job], meta: { page: config.params.page, limit: 10, total: 1 } },
      );
    const list = renderHook(() => useJobs({ page: 2, search: 'SQL' }), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data?.meta.page).toBe(2);
    expect(queryKeys.jobs.list({ page: 1 })).not.toEqual(queryKeys.jobs.list({ page: 2 }));
    expect(queryKeys.jobs.mine()).not.toEqual(queryKeys.jobs.public());
    client.setQueryData(queryKeys.jobs.mine(), [job]);
    client.setQueryData(queryKeys.jobs.detail('job-1'), job);
    const mutation = renderHook(() => useCreateJob(), { wrapper });
    await act(async () => {
      await mutation.result.current.mutateAsync({
        title: 'Backend',
        description: 'Build',
        requiredSkills: ['SQL'],
        minYearsExperience: 3,
      });
    });
    expect(client.getQueryState(queryKeys.jobs.mine())?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.jobs.detail('job-1'))?.isInvalidated).toBe(true);
    list.unmount();
    mutation.unmount();
    client.clear();
  });
  it('mutation has no retry; hook-level form handler owns validation without global toast', async () => {
    const client = createQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const adapter = failingAdapter(400, {
      message: 'Validation failed',
      errors: ['title: Thiếu tiêu đề'],
    });
    apiClient.defaults.adapter = adapter;
    const setError = vi.fn<UseFormSetError<{ title: string }>>();
    const hook = renderHook(
      () =>
        useCreateJob({
          onError: (error) => handleFormError<{ title: string }>(error, setError, ['title']),
        }),
      { wrapper },
    );
    await act(async () => {
      await expect(
        hook.result.current.mutateAsync({
          title: '',
          description: '',
          requiredSkills: [],
          minYearsExperience: 0,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    hook.unmount();
    client.clear();
  });
  it('a failed create with HTTP 500 is not retried and has one global toast', async () => {
    const client = createQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const adapter = failingAdapter(500);
    apiClient.defaults.adapter = adapter;
    const hook = renderHook(() => useCreateJob(), { wrapper });
    await act(async () => {
      await expect(
        hook.result.current.mutateAsync({
          title: 'Job',
          description: 'Description',
          requiredSkills: ['SQL'],
          minYearsExperience: 0,
        }),
      ).rejects.toMatchObject({ status: 500 });
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    hook.unmount();
    client.clear();
  });
});

describe('upload', () => {
  it('uses field file, supports unknown total and does not resolve at upload 100%', async () => {
    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    const controller = new AbortController();
    const progress = vi.fn();
    let finish: (() => void) | undefined;
    apiClient.defaults.adapter = async (config) => {
      expect(config.data).toBeInstanceOf(FormData);
      expect(config.data.get('file')).toBe(file);
      expect(config.signal).toBe(controller.signal);
      // No manually chosen multipart boundary (browser adapter owns it).
      expect(String(config.headers.getContentType())).not.toContain('boundary=');
      config.onUploadProgress?.({ loaded: 1, bytes: 1, lengthComputable: false });
      config.onUploadProgress?.({ loaded: 2, total: 2, bytes: 1, lengthComputable: true });
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return response(config, { data: { id: 'application-1' } });
    };
    let settled = false;
    const pending = applyJob('job-1', file, {
      signal: controller.signal,
      onUploadProgress: progress,
    }).then((value) => {
      settled = true;
      return value;
    });
    await waitFor(() => expect(progress).toHaveBeenCalledTimes(2));
    expect(progress.mock.calls[0][0].percent).toBeUndefined();
    expect(progress.mock.calls[1][0].percent).toBe(100);
    expect(settled).toBe(false);
    finish?.();
    expect(await pending).toEqual({ id: 'application-1' });
  });
  it('a pre-aborted upload is cancelled without an HTTP attempt or error toast', async () => {
    const adapter = vi.fn<AxiosAdapter>();
    apiClient.defaults.adapter = adapter;
    const controller = new AbortController();
    controller.abort();
    await expect(
      applyJob('job-1', new File(['cv'], 'cv.pdf'), { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(adapter).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
