import type { AuthResponseDto } from './auth.dto.js';

export type AuthTokensResult = AuthResponseDto;

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}
