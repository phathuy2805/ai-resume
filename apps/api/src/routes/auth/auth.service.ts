import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import envConfig from '../../shared/config/env.config.js';
import type { Role } from '../../shared/constants/role.enum.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import type { JwtAccessPayload } from '../../shared/types/auth.type.js';
import { hashToken } from '../../shared/utils/crypto.util.js';
import { parseDurationMs } from '../../shared/utils/time.util.js';
import { type SafeUser, UsersService } from '../users/users.service.js';
import { BCRYPT_SALT_ROUNDS } from './auth.constant.js';
import type { AuthTokensResult, JwtRefreshPayload } from './auth.type.js';
import type { UserProfileResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
    userAgent?: string,
  ): Promise<AuthTokensResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createUser({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName.trim(),
      role: dto.role,
    });

    return this.issueTokens(user, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthTokensResult> {
    const userRecord = await this.usersService.findByEmail(dto.email);
    if (!userRecord) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await compare(
      dto.password,
      userRecord.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const { passwordHash: _passwordHash, ...safeUser } = userRecord;
    return this.issueTokens(safeUser, userAgent);
  }

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }
    return this.toUserProfile(user);
  }

  async refreshTokens(
    rawRefreshToken: string | undefined,
    userAgent?: string,
  ): Promise<AuthTokensResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Thiếu refresh token');
    }

    try {
      await this.jwtService.verifyAsync<JwtRefreshPayload>(rawRefreshToken, {
        secret: envConfig.REFRESH_TOKEN_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    if (storedToken.revokedAt !== null) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token đã bị thu hồi, vui lòng đăng nhập lại',
      );
    }

    if (storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    const user = await this.usersService.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const { accessToken, refreshToken, newTokenHash, expiresAt } =
      await this.createTokenPair(user);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
          userAgent,
        },
      }),
    ]);

    return { accessToken, refreshToken, user: this.toUserProfile(user) };
  }

  async logout(rawRefreshToken?: string): Promise<{ message: string }> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Đăng xuất thành công' };
  }

  verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    return this.jwtService.verifyAsync<JwtAccessPayload>(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET,
    });
  }

  getRefreshCookieMaxAgeMs(): number {
    return parseDurationMs(envConfig.REFRESH_TOKEN_EXPIRES_IN);
  }

  private toUserProfile(user: SafeUser): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async issueTokens(
    user: SafeUser,
    userAgent?: string,
  ): Promise<AuthTokensResult> {
    const { accessToken, refreshToken, newTokenHash, expiresAt } =
      await this.createTokenPair(user);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent,
      },
    });

    return { accessToken, refreshToken, user: this.toUserProfile(user) };
  }

  private async createTokenPair(user: SafeUser) {
    const accessExpiresInSec = Math.floor(
      parseDurationMs(envConfig.ACCESS_TOKEN_EXPIRES_IN) / 1000,
    );
    const refreshExpiresInMs = parseDurationMs(
      envConfig.REFRESH_TOKEN_EXPIRES_IN,
    );
    const refreshExpiresInSec = Math.floor(refreshExpiresInMs / 1000);

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: accessExpiresInSec,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: envConfig.REFRESH_TOKEN_SECRET,
        expiresIn: refreshExpiresInSec,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      newTokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshExpiresInMs),
    };
  }
}
