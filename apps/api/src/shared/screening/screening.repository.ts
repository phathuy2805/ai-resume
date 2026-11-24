import { Injectable } from '@nestjs/common';
import type { ApplicationStatusChangedPayload } from '../constants/application-event.constant.js';
import { ApplicationStatus } from '../constants/application-status.enum.js';
import { ApplicationStateService } from '../services/application-state.service.js';
import { PrismaService } from '../services/prisma.service.js';
import { SCREENABLE_STATUSES } from './screening.constant.js';

@Injectable()
export class ScreeningRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationStateService: ApplicationStateService,
  ) {}

  /** Dữ liệu tối thiểu để chấm: cvText đã lưu lúc nộp (không tải lại file từ S3). */
  findForScreening(applicationId: string) {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, jobId: true, status: true, cvText: true },
    });
  }

  /** Hồ sơ bị dở do server tắt (SUBMITTED chưa kịp chấm, SCREENING đang chấm), cũ nhất trước. */
  async findPendingIds(): Promise<string[]> {
    const rows = await this.prisma.application.findMany({
      where: { status: { in: [...SCREENABLE_STATUSES] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /**
   * SCREENING → SCREENING_FAILED và lưu `screeningError` trong cùng transaction.
   * Trả payload sự kiện để service phát sau khi commit.
   */
  markFailed(applicationId: string, message: string): Promise<ApplicationStatusChangedPayload> {
    return this.prisma.$transaction(async (tx) => {
      const result = await this.applicationStateService.transition(
        applicationId,
        ApplicationStatus.SCREENING_FAILED,
        { reason: message, tx },
      );
      await tx.application.update({
        where: { id: applicationId },
        data: { screeningError: message },
      });
      return result.event;
    });
  }

  /**
   * HR bấm chấm lại: SCREENED | SCREENING_FAILED → SCREENING (actorId = HR) và xóa `screeningError`
   * trong cùng transaction. Trả payload sự kiện để service phát sau khi commit.
   */
  startRescreen(applicationId: string, hrId: string): Promise<ApplicationStatusChangedPayload> {
    return this.prisma.$transaction(async (tx) => {
      const result = await this.applicationStateService.transition(
        applicationId,
        ApplicationStatus.SCREENING,
        { actorId: hrId, tx },
      );
      await tx.application.update({
        where: { id: applicationId },
        data: { screeningError: null },
      });
      return result.event;
    });
  }
}
