import type { AuthResponseDto } from './dto/auth-response.dto.js';

export type AuthTokensResult = AuthResponseDto;

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

