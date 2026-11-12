import axios, { CanceledError, type AxiosRequestConfig } from 'axios';
import { toApiError } from './apiError';
import { getAccessToken, getSessionVersion } from './tokenStore';
import {
  expireSession,
  getPendingRefresh,
  isSessionChanging,
  recoverSession,
  staleSessionError,
} from './session';

export { toApiError } from './apiError';
declare module 'axios' {
  interface AxiosRequestConfig {
    _sessionVersion?: number;
    _sentToken?: string | null;
    _authRetried?: boolean;
  }
}
const cookieEndpoint = (url = '') =>
  /^\/(?:api\/)?auth\/(login|register|refresh|logout)\/?(?:[?#]|$)/.test(url);

async function waitForRefresh(task: Promise<unknown>, signal: AxiosRequestConfig['signal']) {
  if (signal?.aborted) throw new CanceledError();
  if (!signal) return task;
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(new CanceledError());
    };
    const cleanup = () => signal.removeEventListener?.('abort', abort);
    signal.addEventListener?.('abort', abort);
    void task.then(
      () => {
        cleanup();
        resolve();
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}

export const apiClient = axios.create({ baseURL: '/api', timeout: 15_000, withCredentials: true });
apiClient.interceptors.request.use(async (config) => {
  if (!cookieEndpoint(config.url)) {
    if (isSessionChanging()) throw new CanceledError('Session is changing');
    const version = config._sessionVersion ?? getSessionVersion();
    const pending = getPendingRefresh();
    if (pending) await waitForRefresh(pending, config.signal);
    if (version !== getSessionVersion()) throw staleSessionError(version);
    config._sessionVersion = version;
  }
  const token = getAccessToken();
  config._sentToken = token;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  else config.headers.delete('Authorization');
  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    const version = response.config._sessionVersion;
    if (version !== undefined && version !== getSessionVersion()) throw staleSessionError(version);
    return response;
  },
  async (cause: unknown) => {
    const error = toApiError(cause);
    const config = axios.isAxiosError(cause) ? cause.config : undefined;
    if (!config || cookieEndpoint(config.url)) throw error;
    const version = config._sessionVersion;
    if (version !== undefined && version !== getSessionVersion()) throw staleSessionError(version);
    if (error.status !== 401 || !config._sentToken || version === undefined) throw error;
    if (config.signal?.aborted) throw toApiError(new CanceledError());
    if (config._authRetried) throw expireSession(version);
    config._authRetried = true;
    // A late 401 from the previous token must not rotate again.
    if (config._sentToken === getAccessToken()) {
      try {
        await waitForRefresh(recoverSession(), config.signal);
      } catch (failure) {
        throw toApiError(failure);
      }
    }
    if (version !== getSessionVersion()) throw staleSessionError(version);
    if (config.signal?.aborted) throw toApiError(new CanceledError());
    return apiClient.request(config);
  },
);
