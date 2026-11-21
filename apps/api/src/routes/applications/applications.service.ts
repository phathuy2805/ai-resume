import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApplicationStatus } from '../../shared/constants/application-status.enum.js';
import { JobStatus } from '../../shared/constants/job.constant.js';
import { SIGNED_URL_EXPIRES_SEC } from '../../shared/constants/storage.constant.js';
import { isUniqueConstraintPrismaError } from '../../shared/helper.js';
import type { ApplicationModel } from '../../shared/models/application.model.js';
import { ApplicationStateService } from '../../shared/services/application-state.service.js';
import { StorageService } from '../../shared/services/storage.service.js';
import { CV_MIME_TYPE } from './applications.constant.js';
import {
  AlreadyAppliedException,
  ApplicationForbiddenException,
  ApplicationNotFoundException,
  InvalidDecisionStatusException,
  JobClosedException,
  JobNotFoundForApplyException,
  JobNotFoundForHrException,
} from './applications.error.js';
import {
  toApplicationDetailDto,
  toApplicationDto,
  toDecisionDto,
  toJobApplicationListItem,
  toJobStatsDto,
  toMyApplicationDto,
} from './applications.mapper.js';
import { ApplicationsRepository } from './applications.repository.js';
import type {
  DecisionBodyType,
  DecisionResType,
  GetApplicationCvUrlResType,
  GetApplicationDetailResType,
  GetJobApplicationsQueryType,
  GetJobApplicationsResType,
  GetJobStatsResType,
  MyApplicationResType,
} from './applications.schema.js';
import { CvTextExtractor } from './cv-text.extractor.js';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly storage: StorageService,
    private readonly cvTextExtractor: CvTextExtractor,
    private readonly applicationStateService: ApplicationStateService,
  ) {}

  /** Kiểm tra job tồn tại và thuộc quyền sở hữu của HR đang đăng nhập. */
  async assertJobOwner(jobId: string, userId: string): Promise<void> {
    const job = await this.applicationsRepo.findJobOwner(jobId);
    if (!job) {
      throw JobNotFoundForHrException;
    }
    if (job.createdById !== userId) {
      throw ApplicationForbiddenException;
    }
  }

  /**
   * Ứng viên nộp CV vào một job. File đã được kiểm tra (PDF, ≤5MB) ở controller.
   * Thứ tự kiểm tra từ rẻ đến tốn kém; lỗi ở bước nào thì không lưu gì:
   * job → đã nộp chưa → trích text (422) → upload S3 → lưu DB (lỗi thì xóa file trên S3).
   */
  async apply(
    candidateId: string,
    jobId: string,
    file: Express.Multer.File,
  ): Promise<ApplicationModel> {
    const job = await this.applicationsRepo.findJobForApply(jobId);
    if (!job) {
      throw JobNotFoundForApplyException;
    }
    if (job.status !== JobStatus.OPEN) {
      throw JobClosedException;
    }
    if (await this.applicationsRepo.existsByJobAndCandidate(jobId, candidateId)) {
      throw AlreadyAppliedException;
    }

    const { text: cvText } = await this.cvTextExtractor.extract(file.buffer);

    const cvS3Key = `cvs/${jobId}/${randomUUID()}.pdf`;
    await this.storage.putObject(cvS3Key, file.buffer, CV_MIME_TYPE);

    try {
      const application = await this.applicationsRepo.createWithHistory({
        jobId,
        candidateId,
        cvS3Key,
        cvFileName: file.originalname,
        cvSizeBytes: file.size,
        cvMimeType: CV_MIME_TYPE,
        cvText,
      });

      this.applicationStateService.emitStatusChanged({
        applicationId: application.id,
        jobId,
        fromStatus: null,
        toStatus: ApplicationStatus.SUBMITTED,
        actorId: candidateId,
      });

      return toApplicationDto(application);
    } catch (error) {
      await this.deleteOrphanCv(cvS3Key);
      // 2 request cùng lúc đều qua bước kiểm tra "đã nộp chưa": ràng buộc unique chặn request sau.
      if (isUniqueConstraintPrismaError(error)) {
        throw AlreadyAppliedException;
      }
      throw error;
    }
  }

  /** Hồ sơ của chính ứng viên (job, trạng thái, ngày nộp, interviewId); không trả cvText, cvS3Key, link CV. */
  async findMine(candidateId: string): Promise<MyApplicationResType[]> {
    const applications = await this.applicationsRepo.findByCandidate(candidateId);
    return applications.map(toMyApplicationDto);
  }

  async findByJobForHr(
    userId: string,
    jobId: string,
    query: GetJobApplicationsQueryType,
  ): Promise<GetJobApplicationsResType> {
    await this.assertJobOwner(jobId, userId);

    const { items, total } = await this.applicationsRepo.findByJobForHr({
      jobId,
      ...query,
    });

    return {
      data: items.map(toJobApplicationListItem),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findDetailForHr(
    userId: string,
    applicationId: string,
  ): Promise<GetApplicationDetailResType> {
    const application = await this.applicationsRepo.findDetailById(applicationId);
    if (!application) {
      throw ApplicationNotFoundException;
    }
    if (application.job.createdById !== userId) {
      throw ApplicationForbiddenException;
    }
    return toApplicationDetailDto(application);
  }

  async decide(
    userId: string,
    applicationId: string,
    body: DecisionBodyType,
  ): Promise<DecisionResType> {
    const context = await this.applicationsRepo.findDecisionContext(applicationId);
    if (!context) {
      throw ApplicationNotFoundException;
    }
    if (context.job.createdById !== userId) {
      throw ApplicationForbiddenException;
    }
    if (context.status !== ApplicationStatus.SCREENED) {
      throw InvalidDecisionStatusException;
    }

    const result = await this.applicationsRepo.applyDecision({
      applicationId,
      hrId: userId,
      decision: body.decision,
      note: body.note,
    });
    if (!result) {
      throw InvalidDecisionStatusException;
    }

    for (const event of result.events) {
      this.applicationStateService.emitStatusChanged(event);
    }

    return toDecisionDto(result);
  }

  async getJobStats(userId: string, jobId: string): Promise<GetJobStatsResType> {
    await this.assertJobOwner(jobId, userId);
    const rows = await this.applicationsRepo.getJobStatsRows(jobId);
    return toJobStatsDto(rows);
  }

  async getCvSignedUrl(userId: string, applicationId: string): Promise<GetApplicationCvUrlResType> {
    const application = await this.applicationsRepo.findCvKeyById(applicationId);
    if (!application) {
      throw ApplicationNotFoundException;
    }
    if (application.job.createdById !== userId) {
      throw ApplicationForbiddenException;
    }

    const url = await this.storage.getSignedUrl(application.cvS3Key, SIGNED_URL_EXPIRES_SEC);
    return {
      url,
      expiresInSec: SIGNED_URL_EXPIRES_SEC,
    };
  }

  /** Lưu DB lỗi thì xóa file vừa upload; xóa lỗi chỉ ghi log để không che mất lỗi gốc. */
  private async deleteOrphanCv(key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Không xóa được CV mồ côi ${key}: ${reason}`);
    }
  }
}
