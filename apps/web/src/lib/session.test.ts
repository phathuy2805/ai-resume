import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { apiClient } from './axios';
import { authTransport } from './authTransport';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';
import { getPendingRefresh, onSessionExpired, refreshSession } from './session';
import { initializeSession, installSessionLifecycle } from './sessionLifecycle';
import { createQueryClient, queryClient, shouldRetryQuery } from './queryClient';
import { notifyError } from './errorUtils';
import { login, logout, register } from '@/api/auth';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const apiAdapter = apiClient.defaults.adapter;
const authAdapter = authTransport.defaults.adapter;
const profile = {
  id: 'u1',
  email: 'test@example.com',
  fullName: 'Test',
  role: 'HR',
  createdAt: '2026-11-12',
};
const envelope = (token = 'new') => ({
  data: { accessToken: token, user: profile },
});
function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: 'test', headers: {} };
}
function fail(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('HTTP', 'ERR_BAD_RESPONSE', config, undefined, response(config, {}, status));
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
  queryClient.clear();
});
afterEach(() => {
  apiClient.defaults.adapter = apiAdapter;
  authTransport.defaults.adapter = authAdapter;
  queryClient.clear();
});

describe('refresh and replay', () => {
  it('shares one cookie rotation across five 401s and preserves request parameters/body', async () => {
    setAccessToken('old');
    const gate = deferred();
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.url).toBe('/auth/refresh');
      expect(config.withCredentials).toBe(true);
      expect(config.headers.get('Authorization')).toBeUndefined();
      expect(JSON.parse(config.data)).toEqual({});
      await gate.promise;
      return response(config, envelope());
    });
    authTransport.defaults.adapter = refresh;
    const original = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers.get('Authorization') === 'Bearer old') fail(config, 401);
      expect(config.headers.get('Authorization')).toBe('Bearer new');
      expect(config.params).toEqual({ page: 2 });
      expect(JSON.parse(config.data)).toEqual({ title: 'Keep body' });
      return response(config, { data: 'ok' });
    });
    apiClient.defaults.adapter = original;
    const pending = Promise.all(
      Array.from({ length: 5 }, () =>
        apiClient.post('/jobs', { title: 'Keep body' }, { params: { page: 2 } }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    gate.resolve();
    expect(await pending).toHaveLength(5);
    expect(original).toHaveBeenCalledTimes(10);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('new');
  });

  it('replays a delayed old-token 401 using the new token without a second refresh', async () => {
    setAccessToken('old');
    const slow = deferred();
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) =>
      response(config, envelope()),
    );
    authTransport.defaults.adapter = refresh;
    apiClient.defaults.adapter = async (config) => {
      if (config.headers.get('Authorization') === 'Bearer old') {
        if (config.url === '/slow') await slow.promise;
        fail(config, 401);
      }
      return response(config, { data: 'ok' });
    };
    const delayed = apiClient.get('/slow');
    await apiClient.get('/fast');
    slow.resolve();
    await delayed;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops after a replayed 401 and expires the session once', async () => {
    setAccessToken('old');
    const expired = vi.fn();
    const dispose = onSessionExpired(expired);
    try {
      authTransport.defaults.adapter = async (config) => response(config, envelope());
      const request = vi.fn(async (config: InternalAxiosRequestConfig) => fail(config, 401));
      apiClient.defaults.adapter = request;
      await expect(apiClient.get('/private')).rejects.toMatchObject({ status: 401 });
      expect(request).toHaveBeenCalledTimes(2);
      expect(expired).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
    } finally {
      dispose();
    }
  });

  it.each(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'])(
    'does not refresh for %s',
    async (url) => {
      setAccessToken('old');
      const refresh = vi.fn();
      authTransport.defaults.adapter = refresh;
      apiClient.defaults.adapter = async (config) => fail(config, 401);
      await expect(apiClient.post(url, {})).rejects.toMatchObject({ status: 401 });
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('does not refresh a forbidden response or a failed login/register', async () => {
    setAccessToken('old');
    const requests: string[] = [];
    authTransport.defaults.adapter = async (config) => {
      requests.push(config.url!);
      fail(config, 401);
    };
    apiClient.defaults.adapter = async (config) => fail(config, 403);
    await expect(apiClient.get('/private')).rejects.toMatchObject({ status: 403 });
    await expect(login({ email: 'test@example.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      register({ email: 'test@example.com', password: 'wrong', fullName: 'Test', role: 'HR' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(requests).toEqual(['/auth/login', '/auth/register']);
  });

  it('cancels one waiter without aborting the shared refresh or replaying that request', async () => {
    setAccessToken('old');
    const gate = deferred();
    authTransport.defaults.adapter = async (config) => {
      await gate.promise;
      return response(config, envelope());
    };
    const calls: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      calls.push(`${config.url}:${config.headers.get('Authorization')}`);
      if (config.headers.get('Authorization') === 'Bearer old') fail(config, 401);
      return response(config, {});
    };
    const controller = new AbortController();
    const cancelled = apiClient
      .get('/cancelled', { signal: controller.signal })
      .catch((error) => error);
    const kept = apiClient.get('/kept');
    await waitFor(() => expect(getPendingRefresh()).not.toBeNull());
    controller.abort();
    expect(await cancelled).toMatchObject({ kind: 'cancelled' });
    gate.resolve();
    await kept;
    expect(calls).not.toContain('/cancelled:Bearer new');
    expect(calls).toContain('/kept:Bearer new');
  });

  it.each(['network', 'timeout', '500', 'contract'])(
    'does not automatically retry or sign out on refresh %s failure',
    async (mode) => {
      setAccessToken('old');
      const expired = vi.fn();
      const dispose = onSessionExpired(expired);
      const client = createQueryClient();
      client.setDefaultOptions({
        queries: { ...client.getDefaultOptions().queries, retryDelay: 0 },
      });
      try {
        const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => {
          if (mode === 'network') throw new AxiosError('Offline', 'ERR_NETWORK', config);
          if (mode === 'timeout') throw new AxiosError('Timeout', 'ECONNABORTED', config);
          if (mode === '500') fail(config, 500);
          return response(config, { data: { accessToken: '', user: profile } });
        });
        authTransport.defaults.adapter = refresh;
        apiClient.defaults.adapter = async (config) => fail(config, 401);
        const error = await client
          .fetchQuery({ queryKey: ['private'], queryFn: () => apiClient.get('/private') })
          .catch((error) => error);
        expect(shouldRetryQuery(0, error)).toBe(false);
        // A late failure from another request cannot start a new rotation either.
        await expect(apiClient.get('/private')).rejects.toBe(error);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(expired).not.toHaveBeenCalled();
        expect(getAccessToken()).toBe('old');
        expect(toast.error).toHaveBeenCalledTimes(1);
        authTransport.defaults.adapter = async (config) => response(config, envelope('recovered'));
        await refreshSession(); // explicit retry is allowed
        expect(getAccessToken()).toBe('recovered');
      } finally {
        client.clear();
        dispose();
      }
    },
  );

  it('preserves multipart file and progress callback when replaying an upload', async () => {
    setAccessToken('old');
    authTransport.defaults.adapter = async (config) => response(config, envelope());
    const body = new FormData();
    const file = new File(['test resume'], 'resume.pdf', { type: 'application/pdf' });
    body.append('file', file);
    const progress = vi.fn();
    const request = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.data).toBe(body);
      expect(config.data.get('file')).toBe(file);
      expect(config.onUploadProgress).toBe(progress);
      if (config.headers.get('Authorization') === 'Bearer old') fail(config, 401);
      return response(config, { data: { id: 'application' } });
    });
    apiClient.defaults.adapter = request;
    await apiClient.post('/jobs/one/applications', body, { onUploadProgress: progress });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('session lifecycle', () => {
  it('discards a late register profile after logout and orders the cookie writes', async () => {
    const gate = deferred();
    const calls: string[] = [];
    authTransport.defaults.adapter = async (config) => {
      calls.push(config.url!);
      if (config.url === '/auth/register') {
        await gate.promise;
        return response(config, { data: profile }, 201);
      }
      return response(config, { data: { message: 'Signed out' } });
    };
    const registering = register({
      email: 'test@example.com',
      password: 'password',
      fullName: 'Test',
      role: 'HR',
    }).catch((error) => error);
    await waitFor(() => expect(calls).toEqual(['/auth/register']));
    const signingOut = logout();
    gate.resolve();
    expect(await registering).toMatchObject({ kind: 'cancelled' });
    await signingOut;
    expect(calls).toEqual(['/auth/register', '/auth/logout']);
    expect(getAccessToken()).toBeNull();
  });
  it('clears private cache, toasts and navigates once for concurrent expired-cookie failures', async () => {
    setAccessToken('old');
    queryClient.setQueryData(['private'], 'secret');
    const navigate = vi.fn();
    const dispose = installSessionLifecycle(navigate, () => false);
    try {
      authTransport.defaults.adapter = async (config) => fail(config, 401);
      apiClient.defaults.adapter = async (config) => fail(config, 401);
      const results = await Promise.allSettled([apiClient.get('/a'), apiClient.get('/b')]);
      for (const result of results) if (result.status === 'rejected') notifyError(result.reason);
      expect(getAccessToken()).toBeNull();
      expect(queryClient.getQueryData(['private'])).toBeUndefined();
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  it('restores a memory-empty session and makes new API requests wait for startup', async () => {
    const gate = deferred();
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => {
      await gate.promise;
      return response(config, envelope());
    });
    authTransport.defaults.adapter = refresh;
    const request = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.headers.get('Authorization')).toBe('Bearer new');
      return response(config, { data: profile });
    });
    apiClient.defaults.adapter = request;
    const a = refreshSession();
    const b = refreshSession();
    expect(a).toBe(b);
    const me = apiClient.get('/auth/me');
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(request).not.toHaveBeenCalled();
    gate.resolve();
    expect(await a).toEqual({ accessToken: 'new', user: profile });
    await me;
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('treats missing startup cookies on a public page as a silent guest session', async () => {
    const navigate = vi.fn();
    const dispose = installSessionLifecycle(navigate, () => true);
    try {
      authTransport.defaults.adapter = async (config) => fail(config, 401);
      await initializeSession();
      expect(navigate).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('waits for rotation before logout, clears locally immediately, never restores the old token', async () => {
    setAccessToken('old');
    const gate = deferred();
    const order: string[] = [];
    authTransport.defaults.adapter = async (config) => {
      order.push(config.url!);
      if (config.url === '/auth/refresh') {
        await gate.promise;
        return response(config, envelope());
      }
      return response(config, { data: { message: 'Signed out' } });
    };
    const refreshing = refreshSession().catch((error) => error);
    await waitFor(() => expect(order).toEqual(['/auth/refresh']));
    const signingOut = logout();
    expect(getAccessToken()).toBeNull();
    expect(order).toEqual(['/auth/refresh']);
    await expect(refreshSession()).rejects.toMatchObject({ kind: 'cancelled' });
    gate.resolve();
    expect(await refreshing).toMatchObject({ kind: 'cancelled' });
    await signingOut;
    expect(order).toEqual(['/auth/refresh', '/auth/logout']);
    expect(getAccessToken()).toBeNull();
  });

  it.each([200, 401])(
    'serializes account changes after rotation and rejects late HTTP %s from the old account',
    async (status) => {
      setAccessToken('old');
      const gate = deferred();
      const oldResponse = deferred();
      const started = deferred();
      apiClient.defaults.adapter = async (config) => {
        started.resolve();
        await oldResponse.promise;
        if (status === 401) fail(config, 401);
        return response(config, { data: 'private old user' });
      };
      const stale = apiClient.get('/private').catch((error) => error);
      await started.promise;
      authTransport.defaults.adapter = async (config) => {
        if (config.url === '/auth/refresh') await gate.promise;
        return response(
          config,
          envelope(config.url === '/auth/login' ? 'other-user' : 'rotated-old'),
        );
      };
      const refresh = refreshSession().catch((error) => error);
      const signin = login({ email: 'other@example.com', password: 'password' });
      gate.resolve();
      expect(await refresh).toMatchObject({ kind: 'cancelled' });
      await signin;
      oldResponse.resolve();
      expect(await stale).toMatchObject({ kind: 'cancelled' });
      expect(getAccessToken()).toBe('other-user');
    },
  );
});
