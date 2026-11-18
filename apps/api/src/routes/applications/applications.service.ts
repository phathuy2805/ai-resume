import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { JobStatus } from '../../shared/constants/job.constant.js';
import { isUniqueConstraintPrismaError } from '../../shared/helper.js';
import type { ApplicationModel } from '../../shared/models/application.model.js';
import { StorageService } from '../../shared/services/storage.service.js';
import { CV_MIME_TYPE } from './applications.constant.js';
import {
  AlreadyAppliedException,
  JobClosedException,
  JobNotFoundForApplyException,
} from './applications.error.js';
import { toApplicationDto } from './applications.mapper.js';
import { ApplicationsRepository } from './applications.repository.js';
import { CvTextExtractor } from './cv-text.extractor.js';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly applicationsRepo: ApplicationsRepository,
    private readonly storage: StorageService,
    private readonly cvTextExtractor: CvTextExtractor,
  ) {}

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
    if (
      await this.applicationsRepo.existsByJobAndCandidate(jobId, candidateId)
    ) {
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

  /** Hồ sơ của chính ứng viên (job, trạng thái, ngày nộp); không trả cvText, cvS3Key, link CV. */
  async findMine(candidateId: string): Promise<ApplicationModel[]> {
    const applications =
      await this.applicationsRepo.findByCandidate(candidateId);
    return applications.map(toApplicationDto);
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
