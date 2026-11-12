import { apiClient } from '@/lib/axios';
import { authTransport } from '@/lib/authTransport';
import { acceptRefreshedToken, getSessionVersion } from '@/lib/tokenStore';
import {
  parseAuthResult,
  parseUserProfile,
  runSessionChange,
  staleSessionError,
} from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import type { ApiResponse } from '@/types/api';
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  LogoutResponse,
  UserProfile,
} from '@/types/auth';
import { unwrap } from './response';

export { refreshSession, refreshSession as refresh } from '@/lib/session';
function clearSessionCache() {
  void queryClient.cancelQueries();
  queryClient.clear();
}
export function login(body: LoginRequest): Promise<AuthResult> {
  const task = runSessionChange(async (version) => {
    const { data } = await authTransport.post<ApiResponse<AuthResponse>>('/auth/login', body);
    if (version !== getSessionVersion()) throw staleSessionError(version);
    const result = parseAuthResult(data);
    acceptRefreshedToken(result.accessToken, version);
    return result;
  });
  clearSessionCache();
  return task;
}
export function register(body: RegisterRequest): Promise<RegisterResponse> {
  const task = runSessionChange(async (version) => {
    const { data } = await authTransport.post<ApiResponse<RegisterResponse>>(
      '/auth/register',
      body,
    );
    if (version !== getSessionVersion()) throw staleSessionError(version);
    // BE sets the cookie but returns only the profile. Do not invent an access
    // token or couple successful account creation to a second network request.
    return parseUserProfile(unwrap(data));
  });
  clearSessionCache();
  return task;
}
export async function getMe(signal?: AbortSignal): Promise<UserProfile> {
  return unwrap((await apiClient.get<ApiResponse<UserProfile>>('/auth/me', { signal })).data);
}
export function logout(): Promise<LogoutResponse> {
  const task = runSessionChange(async () =>
    unwrap((await authTransport.post<ApiResponse<LogoutResponse>>('/auth/logout', {})).data),
  );
  // Clear locally immediately, even if the HTTP logout subsequently fails.
  clearSessionCache();
  return task;
}
