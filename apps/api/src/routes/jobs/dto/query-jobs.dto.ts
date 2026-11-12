import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { JobStatus } from '../../../shared/constants/job-status.enum.js';
import { PaginationQuerySchema } from '../../../shared/dto/pagination.dto.js';

export const JobListQuerySchema = PaginationQuerySchema.extend({
  search: z
    .string()
    .optional()
    .describe(
      'Từ khóa tìm kiếm theo tên/tiêu đề công việc hoặc kỹ năng yêu cầu',
    ),
  status: z
    .enum(JobStatus)
    .optional()
    .describe('Lọc theo trạng thái tin tuyển dụng (OPEN hoặc CLOSED)'),
});

export class JobListQueryDto extends createZodDto(JobListQuerySchema) {}
export const QueryJobsDto = JobListQueryDto;
export type QueryJobsDto = JobListQueryDto;
