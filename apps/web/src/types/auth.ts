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
  role: 'HR' | 'CANDIDATE';
}
/** Public FE result: excludes the refresh token; the browser uses the HttpOnly cookie. */
export interface AuthResult {
  accessToken: string;
  user: UserProfile;
}
/** Login/refresh JSON; refreshToken exists only in the HttpOnly cookie. */
export type AuthResponse = AuthResult;
/** Register returns a profile, not an authenticated token result. */
export type RegisterResponse = UserProfile;
export interface LogoutResponse {
  message: string;
}
