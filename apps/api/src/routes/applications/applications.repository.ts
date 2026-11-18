import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { PrismaService } from '../../shared/services/prisma.service.js';

/** Kèm thông tin tối thiểu của job để trả về cho ứng viên. */
export const applicationWithJobInclude = {
  job: { select: { id: true, title: true } },
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithJob = Prisma.ApplicationGetPayload<{
  include: typeof applicationWithJobInclude;
}>;

export interface CreateApplicationData {
  jobId: string;
  candidateId: string;
  cvS3Key: string;
  cvFileName: string;
  cvSizeBytes: number;
  cvMimeType: string;
  cvText: string;
}

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lấy cả job đã đóng để phân biệt 404 (không tồn tại) với 409 (đã đóng). */
  findJobForApply(jobId: string) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, status: true },
    });
  }

  async existsByJobAndCandidate(
    jobId: string,
    candidateId: string,
  ): Promise<boolean> {
    const found = await this.prisma.application.findUnique({
      where: { unique_application_per_job: { jobId, candidateId } },
      select: { id: true },
    });
    return found !== null;
  }

  /** Tạo hồ sơ SUBMITTED và 1 dòng lịch sử trạng thái trong cùng transaction. */
  createWithHistory(data: CreateApplicationData): Promise<ApplicationWithJob> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: { ...data, status: ApplicationStatus.SUBMITTED },
        include: applicationWithJobInclude,
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: ApplicationStatus.SUBMITTED,
          changedById: data.candidateId,
        },
      });
      return application;
    });
  }
}
