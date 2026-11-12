import type { AuthResponseDto } from './auth.dto.js';

export type AuthTokensResult = AuthResponseDto & {
  refreshToken: string;
};

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}
