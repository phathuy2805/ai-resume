import { apiClient } from '@/lib/axios';
import { clearAccessToken, setAccessToken } from '@/lib/tokenStore';
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

async function authenticate(
  path: string,
  body: LoginRequest | RegisterRequest,
): Promise<AuthResult> {
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>(path, body);
  const { accessToken, user } = unwrap(data);
  await queryClient.cancelQueries();
  queryClient.clear(); // Also isolates accounts when signing in as another user.
  setAccessToken(accessToken);
  return { accessToken, user };
}
export const register = (body: RegisterRequest) => authenticate('/auth/register', body);
export const login = (body: LoginRequest) => authenticate('/auth/login', body);
export async function getMe(signal?: AbortSignal): Promise<UserProfile> {
  return unwrap((await apiClient.get<ApiResponse<UserProfile>>('/auth/me', { signal })).data);
}
export async function logout(): Promise<LogoutResponse> {
  try {
    return unwrap((await apiClient.post<ApiResponse<LogoutResponse>>('/auth/logout')).data);
  } finally {
    clearAccessToken();
    await queryClient.cancelQueries();
    queryClient.clear(); // Local sign-out even on failure; the error still reaches the caller.
  }
}
