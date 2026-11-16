import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import envConfig from '../config/env.config.js';
import type {
  AccessTokenPayload,
  JwtAccessPayload,
  JwtRefreshPayload,
  RefreshTokenPayload,
} from '../types/auth.type.js';
import { parseDurationSec } from '../utils/time.util.js';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: JwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
      expiresIn: parseDurationSec(envConfig.ACCESS_TOKEN_EXPIRES_IN),
      algorithm: 'HS256',
    });
  }

  signRefreshToken(userId: string): Promise<string> {
    const payload: JwtRefreshPayload = {
      sub: userId,
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
      expiresIn: parseDurationSec(envConfig.REFRESH_TOKEN_EXPIRES_IN),
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
      secret: envConfig.REFRESH_TOKEN_SECRET,
    });
  }
}
