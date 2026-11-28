import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../services/prisma.service.js';

export const notificationApplicationSelect = {
  id: true,
  status: true,
  candidate: {
    select: {
      fullName: true,
      email: true,
    },
  },
  job: {
    select: {
      title: true,
    },
  },
  interview: {
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export type NotificationApplicationRecord = Prisma.ApplicationGetPayload<{
  select: typeof notificationApplicationSelect;
}>;

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findApplicationById(applicationId: string): Promise<NotificationApplicationRecord | null> {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      select: notificationApplicationSelect,
    });
  }
}
