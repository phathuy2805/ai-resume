import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import { PrismaService } from '../services/prisma.service.js';
import type {
  CreateInitialHistoryInput,
  UpdateStatusWithHistoryInput,
} from '../types/application-state.type.js';

@Injectable()
export class SharedApplicationStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(applicationId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.application.findUnique({
      where: { id: applicationId },
      select: { id: true, jobId: true, status: true },
    });
  }

  runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async updateStatusOptimistic(
    input: UpdateStatusWithHistoryInput,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const updated = await tx.application.updateMany({
      where: {
        id: input.applicationId,
        status: input.fromStatus,
      },
      data: {
        status: input.toStatus,
      },
    });

    if (updated.count === 0) {
      return false;
    }

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedById: input.actorId,
        reason: input.reason,
      },
    });

    return true;
  }

  createInitialHistory(input: CreateInitialHistoryInput, tx: Prisma.TransactionClient) {
    return tx.applicationStatusHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: null,
        toStatus: ApplicationStatus.SUBMITTED,
        changedById: input.actorId,
        reason: input.reason,
      },
    });
  }
}
