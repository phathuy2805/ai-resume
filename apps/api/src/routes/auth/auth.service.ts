import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../../shared/constants/auth.constant.js';
import type { Role } from '../../shared/constants/auth.constant.js';
import { isUniqueConstraintPrismaError } from '../../shared/helper.js';
import {
  SharedUserRepository,
  type SafeUser,
} from '../../shared/repositories/shared-user.repository.js';
import { TokenService } from '../../shared/services/token.service.js';
import { hashToken } from '../../shared/utils/crypto.util.js';
import { getRefreshTokenExpiresInMs } from '../../shared/utils/time.util.js';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
  MissingRefreshTokenException,
  RefreshTokenExpiredException,
  RefreshTokenNotFoundException,
  RefreshTokenRevokedException,
  UserNotFoundException,
} from './auth.error.js';
import { AuthRepository } from './auth.repository.js';
import type {
  GetProfileResType,
  LoginBodyType,
  LogoutResType,
  RegisterBodyType,
  RegisterResType,
} from './auth.schema.js';
import type {
  LoginResult,
  RefreshTokenResult,
  RegisterResult,
  SessionContext,
} from './auth.type.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
  ) {}

  async register(body: RegisterBodyType, context: SessionContext = {}): Promise<RegisterResult> {
    try {
      const passwordHash = await hash(body.password, BCRYPT_SALT_ROUNDS);
      const user = await this.sharedUserRepo.createUser({
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        role: body.role,
      });

      const { refreshToken } = await this.generateTokens(user, context);

      return {
        user: this.toUserProfile(user),
        refreshToken,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException;
      }
      throw error;
    }
  }

  async login(body: LoginBodyType, context: SessionContext = {}): Promise<LoginResult> {
    const user = await this.sharedUserRepo.findByEmail(body.email);
    if (!user) {
      throw InvalidCredentialsException;
    }

    const isPasswordValid = await compare(body.password, user.passwordHash);
    if (!isPasswordValid) {
      throw InvalidCredentialsException;
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    const tokens = await this.generateTokens(safeUser, context);
    return {
      ...tokens,
      user: this.toUserProfile(safeUser),
    };
  }

  async getProfile(userId: string): Promise<GetProfileResType> {
    const user = await this.sharedUserRepo.findById(userId);
    if (!user) {
      throw UserNotFoundException;
    }
    return this.toUserProfile(user);
  }

  async refreshTokens(
    rawRefreshToken: string | undefined,
    context: SessionContext = {},
  ): Promise<RefreshTokenResult> {
    if (!rawRefreshToken) {
      throw MissingRefreshTokenException;
    }

    try {
      await this.tokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw InvalidRefreshTokenException;
    }

    const storedToken = await this.authRepo.findByTokenHash(hashToken(rawRefreshToken));
    if (!storedToken) {
      throw RefreshTokenNotFoundException;
    }

    if (storedToken.revokedAt !== null) {
      await this.authRepo.revokeAllUserTokens(storedToken.userId);
      throw RefreshTokenRevokedException;
    }

    if (storedToken.expiresAt <= new Date()) {
      throw RefreshTokenExpiredException;
    }

    const user = await this.sharedUserRepo.findById(storedToken.userId);
    if (!user) {
      throw UserNotFoundException;
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role as Role,
      }),
      this.tokenService.signRefreshToken(user.id),
    ]);

    await this.authRepo.rotateRefreshToken(storedToken.id, {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + getRefreshTokenExpiresInMs()),
      userAgent: context.userAgent,
      ip: context.ip,
    });

    return { accessToken, refreshToken, user: this.toUserProfile(user) };
  }

  async logout(rawRefreshToken?: string): Promise<LogoutResType> {
    if (rawRefreshToken) {
      await this.authRepo.revokeByTokenHash(hashToken(rawRefreshToken));
    }

    return { message: 'Đăng xuất thành công' };
  }

  private async generateTokens(
    user: SafeUser,
    context: SessionContext = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role as Role,
      }),
      this.tokenService.signRefreshToken(user.id),
    ]);

    await this.authRepo.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + getRefreshTokenExpiresInMs()),
      userAgent: context.userAgent,
      ip: context.ip,
    });

    return { accessToken, refreshToken };
  }

  private toUserProfile(user: SafeUser): RegisterResType {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
