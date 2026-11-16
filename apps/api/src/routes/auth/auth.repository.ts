import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service.js';

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
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
}
