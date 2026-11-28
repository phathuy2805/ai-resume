import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service.js';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

export interface CreatePasswordResetOtpInput {
  userId: string;
  codeHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshToken(data: CreateRefreshTokenInput) {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ip,
      },
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  rotateRefreshToken(oldTokenId: string, newData: CreateRefreshTokenInput) {
    return this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: oldTokenId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: newData.userId,
          tokenHash: newData.tokenHash,
          expiresAt: newData.expiresAt,
          userAgent: newData.userAgent,
          ipAddress: newData.ip,
        },
      }),
    ]);
  }

  revokeByTokenHash(tokenHash: string) {
    return this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  replacePasswordAndRotateSession(
    userId: string,
    passwordHash: string,
    newRefreshToken: CreateRefreshTokenInput,
  ) {
    const now = new Date();
    return this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: newRefreshToken.userId,
          tokenHash: newRefreshToken.tokenHash,
          expiresAt: newRefreshToken.expiresAt,
          userAgent: newRefreshToken.userAgent,
          ipAddress: newRefreshToken.ip,
        },
      }),
    ]);
  }

  replacePasswordResetOtp(data: CreatePasswordResetOtpInput) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.passwordResetOtp.updateMany({
        where: { userId: data.userId, usedAt: null },
        data: { usedAt: now },
      });

      return tx.passwordResetOtp.create({
        data: {
          userId: data.userId,
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
        },
      });
    });
  }

  findLatestActivePasswordResetOtp(userId: string) {
    return this.prisma.passwordResetOtp.findFirst({
      where: {
        userId,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementOtpAttempt(otpId: string, maxAttempts: number): Promise<number> {
    const updated = await this.prisma.passwordResetOtp.update({
      where: { id: otpId },
      data: {
        attempts: { increment: 1 },
      },
      select: { attempts: true },
    });

    if (updated.attempts >= maxAttempts) {
      await this.prisma.passwordResetOtp.update({
        where: { id: otpId },
        data: { usedAt: new Date() },
      });
    }

    return updated.attempts;
  }

  consumeOtpAndResetPassword(otpId: string, userId: string, passwordHash: string): Promise<boolean> {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetOtp.updateMany({
        where: {
          id: otpId,
          userId,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count === 0) {
        return false;
      }

      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      return true;
    });
  }
}
