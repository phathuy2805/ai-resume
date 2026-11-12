import { z } from 'zod';
import { JobStatus } from '../../shared/constants/job-status.enum.js';
import {
  JobSchema,
  RubricWeightsSchema,
} from '../../shared/models/job.model.js';
import {
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../../shared/models/pagination.model.js';

export { JobSchema, RubricWeightsSchema };

export const CreateJobSchema = JobSchema.pick({
  title: true,
  description: true,
  requiredSkills: true,
  minYearsExperience: true,
  rubricWeights: true,
}).extend({
  preferredSkills: JobSchema.shape.preferredSkills.optional().default([]),
  cvPassThreshold: JobSchema.shape.cvPassThreshold.default(70),
  interviewQuestionCount: JobSchema.shape.interviewQuestionCount.default(3),
});

export const UpdateJobSchema = CreateJobSchema.partial();

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

export const JobListResponseSchema = z.object({
  data: z.array(JobSchema).describe('Danh sách công việc'),
  meta: PaginationMetaSchema.describe('Thông tin phân trang'),
});

export type CreateJobBody = z.infer<typeof CreateJobSchema>;
export type UpdateJobBody = z.infer<typeof UpdateJobSchema>;
export type JobListQuery = z.infer<typeof JobListQuerySchema>;
export type JobListResponse = z.infer<typeof JobListResponseSchema>;

