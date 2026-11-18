import type {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import type { ApplicationModel } from '../../shared/models/application.model.js';
import type { ApplicationWithJob } from './applications.repository.js';

/**
 * Hồ sơ trả cho ứng viên. Chọn từng trường để không bao giờ lộ cvText, cvS3Key, parsedCv,
 * ghi chú của HR...
 */
export function toApplicationDto(app: ApplicationWithJob): ApplicationModel {
  return {
    id: app.id,
    status: app.status as ApplicationStatus,
    job: { id: app.job.id, title: app.job.title },
    cvFileName: app.cvFileName,
    cvSizeBytes: app.cvSizeBytes,
    cvMimeType: app.cvMimeType,
    aiRecommendation: (app.aiRecommendation as AiRecommendation | null) ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  };
}
