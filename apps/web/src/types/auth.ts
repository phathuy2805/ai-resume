export type Role = 'HR' | 'CANDIDATE' | 'ADMIN';
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface RegisterRequest extends LoginRequest {
  fullName: string;
  role: Role;
}
/** Public FE result: deliberately excludes the mock BE refresh token. */
export interface AuthResult {
  accessToken: string;
  user: UserProfile;
}
export interface AuthResponse extends AuthResult {
  refreshToken: string;
}
export interface LogoutResponse {
  message: string;
}
