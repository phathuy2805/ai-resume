import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { JobStatus } from '../../shared/constants/job.constant.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import type { PrismaJobWithCount } from './jobs.mapper.js';
import type { FindMyJobsParams, FindOpenJobsParams } from './jobs.type.js';

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOpenJobs({ page, limit, search }: FindOpenJobsParams) {
    const where: Prisma.JobWhereInput = {
      status: JobStatus.OPEN,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return { items, total };
  }

  findOpenJobById(id: string) {
    return this.prisma.job.findFirst({
      where: { id, status: JobStatus.OPEN },
    });
  }

  async findMyJobs({ userId, page, limit, search, status }: FindMyJobsParams) {
    const where: Prisma.JobWhereInput = {
      createdById: userId,
      ...(status ? { status: status as JobStatus } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: { _count: { select: { applications: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where }),
    ]);

    return { items, total };
  }

  createJob(data: Prisma.JobUncheckedCreateInput): Promise<PrismaJobWithCount> {
    return this.prisma.job.create({
      data,
      include: { _count: { select: { applications: true } } },
    });
  }

  findJobById(id: string) {
    return this.prisma.job.findUnique({ where: { id } });
  }

  findJobByIdWithCount(id: string): Promise<PrismaJobWithCount | null> {
    return this.prisma.job.findUnique({
      where: { id },
      include: { _count: { select: { applications: true } } },
    });
  }

  updateOpenOwnedJob(
    id: string,
    userId: string,
    data: Prisma.JobUpdateManyMutationInput,
    clearEmbedding: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.job.updateMany({
        where: {
          id,
          createdById: userId,
          status: JobStatus.OPEN,
        },
        data,
      });

      if (result.count === 0) {
        const latest = await tx.job.findUnique({ where: { id } });
        return { updated: null as PrismaJobWithCount | null, latest };
      }

      if (clearEmbedding) {
        await tx.$executeRaw`
          UPDATE "jobs"
          SET "embedding" = NULL
          WHERE "id" = ${id}
        `;
      }

      const updated = await tx.job.findUniqueOrThrow({
        where: { id },
        include: { _count: { select: { applications: true } } },
      });

      return { updated, latest: updated };
    });
  }

  closeJob(id: string): Promise<PrismaJobWithCount> {
    return this.setStatus(id, JobStatus.CLOSED);
  }

  reopenJob(id: string): Promise<PrismaJobWithCount> {
    return this.setStatus(id, JobStatus.OPEN);
  }

  private setStatus(id: string, status: JobStatus): Promise<PrismaJobWithCount> {
    return this.prisma.job.update({
      where: { id },
      data: { status },
      include: { _count: { select: { applications: true } } },
    });
  }
}
