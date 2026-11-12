import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { JobStatus } from '../../../shared/constants/job-status.enum.js';
import { PaginationMetaSchema } from '../../../shared/dto/pagination.dto.js';
import { RubricWeightsSchema } from './create-job.dto.js';

export const JobSchema = z.object({
  id: z.uuid().describe('Mã định danh công việc (UUID)'),
  title: z.string().describe('Tiêu đề tuyển dụng'),
  description: z.string().describe('Nội dung chi tiết của JD'),
  requiredSkills: z.array(z.string()).describe('Kỹ năng bắt buộc'),
  preferredSkills: z.array(z.string()).describe('Kỹ năng ưu tiên'),
  minYearsExperience: z.number().int().describe('Số năm kinh nghiệm tối thiểu'),
  status: z
    .enum(JobStatus)
    .describe('Trạng thái tin tuyển dụng (OPEN hoặc CLOSED)'),
  cvPassThreshold: z.number().int().describe('Điểm sàn qua vòng CV (0-100)'),
  interviewQuestionCount: z
    .number()
    .int()
    .describe('Số câu hỏi phỏng vấn Voice AI (3-5)'),
  rubricWeights: RubricWeightsSchema.optional().describe(
    'Trọng số 4 tiêu chí chấm điểm phỏng vấn',
  ),
  createdById: z.uuid().describe('ID người tạo (HR)'),
  createdAt: z.string().describe('Thời điểm đăng tin (ISO 8601)'),
  updatedAt: z.string().describe('Thời điểm cập nhật gần nhất (ISO 8601)'),
});

export class JobDto extends createZodDto(JobSchema) {}
export const JobResponseDto = JobDto;
export type JobResponseDto = JobDto;

export const JobListResponseSchema = z.object({
  data: z.array(JobSchema).describe('Danh sách công việc'),
  meta: PaginationMetaSchema.describe('Thông tin phân trang'),
});

export class JobListResponseDto extends createZodDto(JobListResponseSchema) {}
