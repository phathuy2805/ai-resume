import { z } from 'zod';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../constants/application-status.enum.js';
import { JobSummarySchema } from './job.model.js';

export const ApplicationSchema = z.object({
  id: z.uuid().describe('Mã định danh đơn ứng tuyển (UUID)'),
  status: z.enum(ApplicationStatus).describe('Trạng thái đơn ứng tuyển'),
  job: JobSummarySchema.describe('Thông tin công việc ứng tuyển'),
  cvFileName: z.string().describe('Tên file CV đã nộp'),
  cvSizeBytes: z.number().int().min(0).describe('Dung lượng file CV (byte)'),
  cvMimeType: z.string().describe('Định dạng file CV (application/pdf)'),
  cvUrl: z
    .url()
    .optional()
    .describe('Link xem CV có chữ ký, hết hạn sau thời gian ngắn'),
  aiRecommendation: z
    .enum(AiRecommendation)
    .nullable()
    .optional()
    .describe('Kết luận của AI sau khi sàng lọc CV (null nếu chưa chấm)'),
  createdAt: z.string().describe('Thời điểm nộp đơn (ISO 8601)'),
  updatedAt: z
    .string()
    .describe('Thời điểm cập nhật trạng thái gần nhất (ISO 8601)'),
});

export type ApplicationModel = z.infer<typeof ApplicationSchema>;

