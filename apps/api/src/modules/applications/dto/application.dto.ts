import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApplicationStatus } from '../../../shared/constants/application-status.enum.js';

export const JobSummarySchema = z.object({
  id: z.uuid().describe('Mã định danh công việc (UUID)'),
  title: z.string().describe('Tiêu đề vị trí tuyển dụng'),
});
export class JobSummaryDto extends createZodDto(JobSummarySchema) {}

export const ApplicationSchema = z.object({
  id: z.uuid().describe('Mã định danh đơn ứng tuyển (UUID)'),
  status: z.enum(ApplicationStatus).describe('Trạng thái đơn ứng tuyển'),
  job: JobSummarySchema.describe('Thông tin công việc ứng tuyển'),
  cvUrl: z.url().optional().describe('Đường dẫn tải/xem file CV'),
  createdAt: z.string().describe('Thời điểm nộp đơn (ISO 8601)'),
  updatedAt: z
    .string()
    .describe('Thời điểm cập nhật trạng thái gần nhất (ISO 8601)'),
});

export class ApplicationDto extends createZodDto(ApplicationSchema) {}

export const ApplicationResponseDto = ApplicationDto;
export type ApplicationResponseDto = ApplicationDto;
