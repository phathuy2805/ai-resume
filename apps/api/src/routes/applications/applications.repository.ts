import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { PrismaService } from '../../shared/services/prisma.service.js';

/**
 * Các trường trả cho ứng viên, kèm thông tin tối thiểu của job.
 * Dùng select (không include) để không đọc cvText (tới 20.000 ký tự), parsedCv, embedding
 * khi chỉ cần hiển thị danh sách.
 */
export const applicationSummarySelect = {
  id: true,
  status: true,
  cvFileName: true,
  cvSizeBytes: true,
  cvMimeType: true,
  aiRecommendation: true,
  createdAt: true,
  updatedAt: true,
  job: { select: { id: true, title: true } },
} satisfies Prisma.ApplicationSelect;

export type ApplicationSummary = Prisma.ApplicationGetPayload<{
  select: typeof applicationSummarySelect;
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

  /** Hồ sơ của một ứng viên, mới nhất trước. */
  findByCandidate(candidateId: string): Promise<ApplicationSummary[]> {
    return this.prisma.application.findMany({
      where: { candidateId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: applicationSummarySelect,
    });
  }

  /** Tạo hồ sơ SUBMITTED và 1 dòng lịch sử trạng thái trong cùng transaction. */
  createWithHistory(data: CreateApplicationData): Promise<ApplicationSummary> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: { ...data, status: ApplicationStatus.SUBMITTED },
        select: applicationSummarySelect,
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
