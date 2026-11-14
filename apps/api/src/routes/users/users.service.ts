import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/services/prisma.service.js';

export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
  }

  createUser(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.trim().toLowerCase(),
      },
      select: safeUserSelect,
    });
  }
}
