import type { Role } from '../constants/role.enum.js';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload extends JwtAccessPayload {
  exp: number;
  iat: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

export interface RefreshTokenPayload extends JwtRefreshPayload {
  exp: number;
  iat: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
