import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../services/prisma.service.js';

export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  bio: true,
  avatarS3Key: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

export interface UpdateUserProfileData {
  fullName?: string;
  phone?: string | null;
  bio?: string | null;
}

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  findByIdWithPassword(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  createUser(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data,
      select: safeUserSelect,
    });
  }

  updateProfile(id: string, data: UpdateUserProfileData): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  updateAvatarKey(id: string, avatarS3Key: string | null): Promise<SafeUser> {
    return this.prisma.user.update({
      where: { id },
      data: { avatarS3Key },
      select: safeUserSelect,
    });
  }
}
