import { ApiError, type ApiResponse } from '@/types/api';
import type { AuthResponse, AuthResult, UserProfile } from '@/types/auth';
import { unwrap } from '@/api/response';
import { toApiError } from './apiError';
import { authTransport } from './authTransport';
import {
  acceptRefreshedToken,
  clearAccessToken,
  getAccessToken,
  getSessionVersion,
} from './tokenStore';

type Expiration = { error: ApiError; hadAccessToken: boolean };
const listeners = new Set<(event: Expiration) => void>();
let pendingRefresh: Promise<AuthResult> | null = null;
let sessionChange: Promise<unknown> | null = null;
let lastFailure: { version: number; error: ApiError } | null = null;
let lastExpiration: { version: number; error: ApiError } | null = null;

export function onSessionExpired(listener: (event: Expiration) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function isSessionChanging(): boolean {
  return sessionChange !== null;
}
export function getPendingRefresh(): Promise<AuthResult> | null {
  return pendingRefresh;
}
export function staleSessionError(version: number): ApiError {
  return lastExpiration?.version === version
    ? lastExpiration.error
    : new ApiError('Phiên đăng nhập đã thay đổi.', { kind: 'cancelled' });
}

export function expireSession(version: number): ApiError {
  if (version !== getSessionVersion()) return staleSessionError(version);
  const hadAccessToken = !!getAccessToken();
  const error = new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
    kind: 'http',
    status: 401,
    retryable: false,
  });
  lastExpiration = { version, error };
  clearAccessToken();
  for (const listener of listeners) listener({ error, hadAccessToken });
  return error;
}

export function parseUserProfile(data: unknown): UserProfile {
  if (
    !data ||
    typeof data !== 'object' ||
    !('id' in data) ||
    typeof data.id !== 'string' ||
    !('email' in data) ||
    typeof data.email !== 'string' ||
    !('fullName' in data) ||
    typeof data.fullName !== 'string' ||
    !('createdAt' in data) ||
    typeof data.createdAt !== 'string' ||
    !('role' in data) ||
    (data.role !== 'HR' && data.role !== 'CANDIDATE' && data.role !== 'ADMIN')
  ) {
    throw new ApiError('Response thông tin người dùng không đúng contract.', { kind: 'contract' });
  }
  return {
    id: data.id,
    email: data.email,
    fullName: data.fullName,
    createdAt: data.createdAt,
    role: data.role,
  };
}

export function parseAuthResult(body: ApiResponse<AuthResponse>): AuthResult {
  const data = unwrap(body);
  if (!data || typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
    throw new ApiError('Response xác thực không đúng contract.', { kind: 'contract' });
  }
  return { accessToken: data.accessToken, user: parseUserProfile(data.user) };
}

// Explicit call for startup/manual retry. Concurrent callers share one rotation.
export function refreshSession(): Promise<AuthResult> {
  if (sessionChange) return Promise.reject(staleSessionError(-1));
  if (pendingRefresh) return pendingRefresh;
  const version = getSessionVersion();
  lastFailure = null;
  const task = (async () => {
    try {
      const response = await authTransport.post<ApiResponse<AuthResponse>>('/auth/refresh', {});
      if (version !== getSessionVersion()) throw staleSessionError(version);
      const result = parseAuthResult(response.data);
      acceptRefreshedToken(result.accessToken, version);
      return result;
    } catch (cause) {
      if (version !== getSessionVersion()) throw staleSessionError(version);
      const error = toApiError(cause);
      if (error.status === 401) throw expireSession(version);
      // Rotation may have succeeded at the server despite a lost response.
      // Never let Query automatically repeat the refresh operation.
      const failure = new ApiError(error.message, {
        kind: error.kind,
        status: error.status,
        errors: error.errors,
        retryable: false,
      });
      lastFailure = { version, error: failure };
      throw failure;
    }
  })();
  pendingRefresh = task;
  const cleanup = () => {
    if (pendingRefresh === task) pendingRefresh = null;
  };
  void task.then(cleanup, cleanup);
  return task;
}

export function recoverSession(): Promise<AuthResult> {
  if (lastFailure?.version === getSessionVersion()) return Promise.reject(lastFailure.error);
  return refreshSession();
}

// Cookie writes must finish in order: refresh -> logout/login. Invalidate the
// old session immediately; do not abort a rotation whose Set-Cookie may arrive.
export function runSessionChange<T>(operation: (version: number) => Promise<T>): Promise<T> {
  const previous = sessionChange;
  const refresh = pendingRefresh;
  clearAccessToken();
  const version = getSessionVersion();
  const task = (async () => {
    await previous?.catch(() => undefined);
    await refresh?.catch(() => undefined);
    if (version !== getSessionVersion()) throw staleSessionError(version);
    return operation(version);
  })();
  sessionChange = task;
  const cleanup = () => {
    if (sessionChange === task) sessionChange = null;
  };
  void task.then(cleanup, cleanup);
  return task;
}
