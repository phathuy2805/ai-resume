import { apiClient } from '@/lib/axios';
import { authTransport } from '@/lib/authTransport';
import { acceptRefreshedToken, getSessionVersion } from '@/lib/tokenStore';
import { parseAuthResult, runSessionChange, staleSessionError } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import type { ApiResponse } from '@/types/api';
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  RegisterRequest,
  LogoutResponse,
  UserProfile,
} from '@/types/auth';
import { unwrap } from './response';

export { refreshSession, refreshSession as refresh } from '@/lib/session';
function clearSessionCache() {
  void queryClient.cancelQueries();
  queryClient.clear();
}
function authenticate(path: string, body: LoginRequest | RegisterRequest): Promise<AuthResult> {
  const task = runSessionChange(async (version) => {
    const { data } = await authTransport.post<ApiResponse<AuthResponse>>(path, body);
    if (version !== getSessionVersion()) throw staleSessionError(version);
    const result = parseAuthResult(data);
    acceptRefreshedToken(result.accessToken, version);
    return result;
  });
  clearSessionCache();
  return task;
}
export const register = (body: RegisterRequest) => authenticate('/auth/register', body);
export const login = (body: LoginRequest) => authenticate('/auth/login', body);
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
