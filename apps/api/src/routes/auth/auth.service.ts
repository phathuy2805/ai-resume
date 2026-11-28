import { Injectable, Logger } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_OTP_LENGTH,
  PASSWORD_RESET_OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_OTP_TTL_MINUTES,
  type Role,
} from '../../shared/constants/auth.constant.js';
import { AVATAR_URL_EXPIRES_SEC } from '../../shared/constants/storage.constant.js';
import { isUniqueConstraintPrismaError } from '../../shared/helper.js';
import {
  SharedUserRepository,
  type SafeUser,
} from '../../shared/repositories/shared-user.repository.js';
import { MailService } from '../../shared/notification/mail.service.js';
import { StorageService } from '../../shared/services/storage.service.js';
import { TokenService } from '../../shared/services/token.service.js';
import {
  generateNumericOtp,
  hashToken,
  safeCompareHexHash,
} from '../../shared/utils/crypto.util.js';
import { getRefreshTokenExpiresInMs } from '../../shared/utils/time.util.js';
import {
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  InvalidCurrentPasswordException,
  InvalidRefreshTokenException,
  MissingRefreshTokenException,
  OtpInvalidOrExpiredException,
  OtpTooManyAttemptsException,
  RefreshTokenExpiredException,
  RefreshTokenNotFoundException,
  RefreshTokenRevokedException,
  SameAsCurrentPasswordException,
  UserNotFoundException,
} from './auth.error.js';
import { AuthRepository } from './auth.repository.js';
import type {
  ChangePasswordBodyType,
  ForgotPasswordBodyType,
  GetProfileResType,
  LoginBodyType,
  LogoutResType,
  MessageResType,
  RegisterBodyType,
  RegisterResType,
  ResetPasswordBodyType,
  UpdateProfileBodyType,
  UpdateProfileResType,
} from './auth.schema.js';
import type {
  LoginResult,
  RefreshTokenResult,
  RegisterResult,
  SessionContext,
} from './auth.type.js';
import { validateAvatarFile } from './avatar-file.validator.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly authRepo: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly storage: StorageService,
    private readonly mailService: MailService,
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
        user: await this.toUserProfile(user),
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
      user: await this.toUserProfile(safeUser),
    };
  }

  async getProfile(userId: string): Promise<GetProfileResType> {
    const user = await this.sharedUserRepo.findById(userId);
    if (!user) {
      throw UserNotFoundException;
    }
    return this.toUserProfile(user);
  }

  async updateProfile(
    userId: string,
    body: UpdateProfileBodyType,
  ): Promise<UpdateProfileResType> {
    const existing = await this.sharedUserRepo.findById(userId);
    if (!existing) {
      throw UserNotFoundException;
    }

    const updated = await this.sharedUserRepo.updateProfile(userId, {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
    });

    return this.toUserProfile(updated);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<UpdateProfileResType> {
    const validated = validateAvatarFile(file);
    const existing = await this.sharedUserRepo.findById(userId);
    if (!existing) {
      throw UserNotFoundException;
    }

    const newAvatarKey = `avatars/${userId}/${randomUUID()}.${validated.extension}`;
    await this.storage.putObject(newAvatarKey, validated.buffer, validated.mimeType);

    let updated: SafeUser;
    try {
      updated = await this.sharedUserRepo.updateAvatarKey(userId, newAvatarKey);
    } catch (error) {
      await this.deleteS3ObjectSafe(newAvatarKey);
      throw error;
    }

    if (existing.avatarS3Key && existing.avatarS3Key !== newAvatarKey) {
      await this.deleteS3ObjectSafe(existing.avatarS3Key);
    }

    return this.toUserProfile(updated);
  }

  async deleteAvatar(userId: string): Promise<UpdateProfileResType> {
    const existing = await this.sharedUserRepo.findById(userId);
    if (!existing) {
      throw UserNotFoundException;
    }

    const updated = await this.sharedUserRepo.updateAvatarKey(userId, null);
    if (existing.avatarS3Key) {
      await this.deleteS3ObjectSafe(existing.avatarS3Key);
    }

    return this.toUserProfile(updated);
  }

  async changePassword(
    userId: string,
    body: ChangePasswordBodyType,
    context: SessionContext = {},
  ): Promise<{ message: string; refreshToken: string }> {
    const user = await this.sharedUserRepo.findByIdWithPassword(userId);
    if (!user) {
      throw UserNotFoundException;
    }

    const isCurrentValid = await compare(body.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw InvalidCurrentPasswordException;
    }

    if (body.currentPassword === body.newPassword) {
      throw SameAsCurrentPasswordException;
    }

    const [newPasswordHash, newRefreshToken] = await Promise.all([
      hash(body.newPassword, BCRYPT_SALT_ROUNDS),
      this.tokenService.signRefreshToken(user.id),
    ]);

    await this.authRepo.replacePasswordAndRotateSession(user.id, newPasswordHash, {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + getRefreshTokenExpiresInMs()),
      userAgent: context.userAgent,
      ip: context.ip,
    });

    return {
      message: 'Đổi mật khẩu thành công',
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(body: ForgotPasswordBodyType): Promise<MessageResType> {
    const genericResponse: MessageResType = {
      message: 'Nếu email tồn tại trong hệ thống, mã OTP đặt lại mật khẩu đã được gửi.',
    };

    const user = await this.sharedUserRepo.findByEmail(body.email);
    if (!user) {
      return genericResponse;
    }

    const otp = generateNumericOtp(PASSWORD_RESET_OTP_LENGTH);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000);

    await this.authRepo.replacePasswordResetOtp({
      userId: user.id,
      codeHash: hashToken(otp),
      expiresAt,
    });

    await this.mailService.sendPasswordResetOtp({
      to: user.email,
      fullName: user.fullName,
      otp,
      expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
    });

    return genericResponse;
  }

  async resetPassword(body: ResetPasswordBodyType): Promise<MessageResType> {
    const user = await this.sharedUserRepo.findByEmail(body.email);
    if (!user) {
      throw OtpInvalidOrExpiredException;
    }

    const otpRecord = await this.authRepo.findLatestActivePasswordResetOtp(user.id);
    if (!otpRecord || otpRecord.expiresAt <= new Date()) {
      throw OtpInvalidOrExpiredException;
    }

    if (otpRecord.attempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
      throw OtpTooManyAttemptsException;
    }

    const submittedHash = hashToken(body.otp);
    if (!safeCompareHexHash(submittedHash, otpRecord.codeHash)) {
      const attempts = await this.authRepo.incrementOtpAttempt(
        otpRecord.id,
        PASSWORD_RESET_OTP_MAX_ATTEMPTS,
      );
      if (attempts >= PASSWORD_RESET_OTP_MAX_ATTEMPTS) {
        throw OtpTooManyAttemptsException;
      }
      throw OtpInvalidOrExpiredException;
    }

    const newPasswordHash = await hash(body.newPassword, BCRYPT_SALT_ROUNDS);
    const consumed = await this.authRepo.consumeOtpAndResetPassword(
      otpRecord.id,
      user.id,
      newPasswordHash,
    );
    if (!consumed) {
      throw OtpInvalidOrExpiredException;
    }

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
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

    return { accessToken, refreshToken, user: await this.toUserProfile(user) };
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

  private async toUserProfile(user: SafeUser): Promise<RegisterResType> {
    let avatarUrl: string | null = null;
    if (user.avatarS3Key) {
      try {
        avatarUrl = await this.storage.getSignedUrl(user.avatarS3Key, AVATAR_URL_EXPIRES_SEC);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Không tạo được presigned URL cho avatar ${user.avatarS3Key}: ${reason}`);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      bio: user.bio ?? null,
      avatarUrl,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async deleteS3ObjectSafe(key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Không xóa được avatar cũ trên S3 (${key}): ${reason}`);
    }
  }
}
