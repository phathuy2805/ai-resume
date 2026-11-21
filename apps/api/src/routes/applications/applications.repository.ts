import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ApplicationStatusChangedPayload } from '../../shared/constants/application-event.constant.js';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { isUniqueConstraintPrismaError } from '../../shared/helper.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { PrismaService } from '../../shared/services/prisma.service.js';
import { InvalidDecisionStatusException } from './applications.error.js';
import type { GetJobApplicationsQueryType } from './applications.schema.js';

/**
 * Các trường trả cho ứng viên, kèm thông tin tối thiểu của job và interviewId.
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

export const myApplicationSelect = {
  ...applicationSummarySelect,
  interview: { select: { id: true } },
} satisfies Prisma.ApplicationSelect;

export type MyApplicationRow = Prisma.ApplicationGetPayload<{
  select: typeof myApplicationSelect;
}>;

export const hrApplicationListSelect = {
  id: true,
  status: true,
  aiRecommendation: true,
  createdAt: true,
  candidate: { select: { fullName: true } },
  screeningResult: { select: { totalScore: true } },
} satisfies Prisma.ApplicationSelect;

export type HrApplicationListItem = Prisma.ApplicationGetPayload<{
  select: typeof hrApplicationListSelect;
}>;

export const hrApplicationDetailSelect = {
  id: true,
  status: true,
  cvFileName: true,
  cvSizeBytes: true,
  cvMimeType: true,
  aiRecommendation: true,
  screeningError: true,
  hrDecisionAt: true,
  hrNote: true,
  createdAt: true,
  updatedAt: true,
  candidate: { select: { id: true, fullName: true, email: true } },
  job: { select: { id: true, title: true, cvPassThreshold: true, createdById: true } },
  screeningResult: {
    select: {
      totalScore: true,
      breakdown: true,
      explanation: true,
      timings: true,
      processingDurationMs: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  hrDecisionBy: { select: { id: true, fullName: true } },
  interview: { select: { id: true } },
  statusHistories: {
    orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      changedById: true,
      reason: true,
      changedAt: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export type HrApplicationDetail = Prisma.ApplicationGetPayload<{
  select: typeof hrApplicationDetailSelect;
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

export interface FindJobApplicationsParams extends GetJobApplicationsQueryType {
  jobId: string;
}

export interface ApplyDecisionParams {
  applicationId: string;
  hrId: string;
  decision: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface ApplyDecisionResult {
  id: string;
  status: ApplicationStatus;
  interviewId: string | null;
  hrDecisionById: string;
  hrDecisionAt: Date;
  hrNote: string | null;
  events: ApplicationStatusChangedPayload[];
}

export interface JobStatsRow {
  status: string;
  aiRecommendation: string | null;
  hrDecisionAt: Date | null;
  screeningResult: { totalScore: number } | null;
}

@Injectable()
export class ApplicationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationStateService: ApplicationStateService,
  ) {}

  /** Lấy cả job đã đóng để phân biệt 404 (không tồn tại) với 409 (đã đóng). */
  findJobForApply(jobId: string) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, status: true },
    });
  }

  findJobOwner(jobId: string) {
    return this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, createdById: true },
    });
  }

  async existsByJobAndCandidate(jobId: string, candidateId: string): Promise<boolean> {
    const found = await this.prisma.application.findUnique({
      where: { unique_application_per_job: { jobId, candidateId } },
      select: { id: true },
    });
    return found !== null;
  }

  /** Hồ sơ của một ứng viên, mới nhất trước (kèm interviewId nếu đã có). */
  findByCandidate(candidateId: string): Promise<MyApplicationRow[]> {
    return this.prisma.application.findMany({
      where: { candidateId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: myApplicationSelect,
    });
  }

  /** Tạo hồ sơ SUBMITTED và 1 dòng lịch sử trạng thái trong cùng transaction. */
  createWithHistory(data: CreateApplicationData): Promise<ApplicationSummary> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: { ...data, status: ApplicationStatus.SUBMITTED },
        select: applicationSummarySelect,
      });
      await this.applicationStateService.recordInitial(tx, application.id, data.candidateId);
      return application;
    });
  }

  async findByJobForHr({
    jobId,
    status,
    minScore,
    maxScore,
    sort,
    order,
    page,
    limit,
  }: FindJobApplicationsParams): Promise<{ items: HrApplicationListItem[]; total: number }> {
    const hasScoreFilter = minScore !== undefined || maxScore !== undefined;
    const where: Prisma.ApplicationWhereInput = {
      jobId,
      ...(status ? { status } : {}),
      ...(hasScoreFilter
        ? {
            screeningResult: {
              is: {
                totalScore: {
                  ...(minScore !== undefined ? { gte: minScore } : {}),
                  ...(maxScore !== undefined ? { lte: maxScore } : {}),
                },
              },
            },
          }
        : {}),
    };

    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] =
      sort === 'score'
        ? [{ screeningResult: { totalScore: order } }, { createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: order }, { id: order }];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: hrApplicationListSelect,
      }),
      this.prisma.application.count({ where }),
    ]);

    return { items, total };
  }

  findDetailById(id: string): Promise<HrApplicationDetail | null> {
    return this.prisma.application.findUnique({
      where: { id },
      select: hrApplicationDetailSelect,
    });
  }

  findDecisionContext(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        job: { select: { createdById: true } },
      },
    });
  }

  findCvKeyById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        cvS3Key: true,
        job: { select: { createdById: true } },
      },
    });
  }

  async applyDecision({
    applicationId,
    hrId,
    decision,
    note,
  }: ApplyDecisionParams): Promise<ApplyDecisionResult | null> {
    const decidedAt = new Date();
    const hrNote = note ?? null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.application.updateMany({
          where: { id: applicationId, status: ApplicationStatus.SCREENED },
          data: {
            hrDecisionById: hrId,
            hrDecisionAt: decidedAt,
            hrNote,
          },
        });
        if (claimed.count === 0) {
          return null;
        }

        if (decision === 'APPROVE') {
          const shortlisted = await this.applicationStateService.transition(
            applicationId,
            ApplicationStatus.SHORTLISTED,
            { actorId: hrId, reason: hrNote, tx },
          );
          const interview = await tx.interview.create({
            data: { applicationId },
            select: { id: true },
          });
          const invited = await this.applicationStateService.transition(
            applicationId,
            ApplicationStatus.INTERVIEW_INVITED,
            { actorId: hrId, reason: 'Tạo phiên phỏng vấn AI', tx },
          );

          return {
            id: applicationId,
            status: ApplicationStatus.INTERVIEW_INVITED,
            interviewId: interview.id,
            hrDecisionById: hrId,
            hrDecisionAt: decidedAt,
            hrNote,
            events: [shortlisted.event, invited.event],
          };
        }

        const rejected = await this.applicationStateService.transition(
          applicationId,
          ApplicationStatus.REJECTED,
          { actorId: hrId, reason: hrNote, tx },
        );

        return {
          id: applicationId,
          status: ApplicationStatus.REJECTED,
          interviewId: null,
          hrDecisionById: hrId,
          hrDecisionAt: decidedAt,
          hrNote,
          events: [rejected.event],
        };
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw InvalidDecisionStatusException;
      }
      throw error;
    }
  }

  getJobStatsRows(jobId: string): Promise<JobStatsRow[]> {
    return this.prisma.application.findMany({
      where: { jobId },
      select: {
        status: true,
        aiRecommendation: true,
        hrDecisionAt: true,
        screeningResult: { select: { totalScore: true } },
      },
    });
  }
}
