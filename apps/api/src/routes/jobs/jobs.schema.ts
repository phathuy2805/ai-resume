import { z } from 'zod';
import {
  DEFAULT_RUBRIC_WEIGHTS,
  JobLevel,
  JobStatus,
} from '../../shared/constants/job.constant.js';
import { JobSchema, RubricWeightsSchema } from '../../shared/models/job.model.js';
import {
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../../shared/models/pagination.model.js';

export const PublicJobSchema = JobSchema.omit({
  cvPassThreshold: true,
  rubricWeights: true,
  parsedJd: true,
  createdById: true,
});

export const HrJobSchema = JobSchema.omit({
  parsedJd: true,
}).extend({
  applicationCount: z.number().int().min(0).describe('Tổng số hồ sơ đã nộp vào tin tuyển dụng'),
  isAnalyzed: z.boolean().describe('Đã được AI phân tích và tạo vector JD hay chưa'),
});

const SkillItemSchema = z
  .string()
  .trim()
  .min(1, 'Tên kỹ năng không được để trống')
  .max(50, 'Tên kỹ năng tối đa 50 ký tự');

const RequirementsSchema = z
  .string()
  .trim()
  .max(10000, 'Yêu cầu ứng viên tối đa 10.000 ký tự')
  .transform((value) => (value.length === 0 ? null : value));

const JobContentBaseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề tuyển dụng không được để trống')
    .max(200, 'Tiêu đề tuyển dụng tối đa 200 ký tự')
    .describe('Tiêu đề tuyển dụng'),
  description: z
    .string()
    .trim()
    .min(1, 'Mô tả công việc không được để trống')
    .max(20000, 'Mô tả công việc tối đa 20.000 ký tự')
    .describe('Nội dung chi tiết của JD'),
  requirements: RequirementsSchema.nullable().optional().describe('Yêu cầu ứng viên'),
  requiredSkills: z
    .array(SkillItemSchema)
    .min(1, 'Cần ít nhất một kỹ năng bắt buộc')
    .max(30, 'Tối đa 30 kỹ năng bắt buộc')
    .describe('Danh sách kỹ năng bắt buộc'),
  preferredSkills: z
    .array(SkillItemSchema)
    .max(30, 'Tối đa 30 kỹ năng ưu tiên')
    .describe('Danh sách kỹ năng ưu tiên'),
  minYearsExperience: z
    .number()
    .int('Số năm kinh nghiệm phải là số nguyên')
    .min(0, 'Số năm kinh nghiệm tối thiểu là 0')
    .max(50, 'Số năm kinh nghiệm tối đa là 50')
    .describe('Số năm kinh nghiệm tối thiểu'),
  level: z
    .enum(JobLevel)
    .nullable()
    .optional()
    .describe('Cấp độ vị trí (INTERN, JUNIOR, MIDDLE, SENIOR)'),
  cvPassThreshold: z
    .number()
    .int('Ngưỡng điểm CV phải là số nguyên')
    .min(0, 'Ngưỡng điểm CV tối thiểu là 0')
    .max(100, 'Ngưỡng điểm CV tối đa là 100')
    .describe('Điểm sàn qua vòng CV (0-100)'),
  interviewQuestionCount: z
    .number()
    .int('Số câu hỏi phỏng vấn phải là số nguyên')
    .min(3, 'Số câu hỏi phỏng vấn tối thiểu là 3')
    .max(5, 'Số câu hỏi phỏng vấn tối đa là 5')
    .describe('Số câu hỏi phỏng vấn Voice AI (3-5)'),
  rubricWeights: RubricWeightsSchema.describe(
    'Trọng số 4 tiêu chí chấm điểm phỏng vấn (tổng phải bằng 100)',
  ),
});

// ==================== Request Schemas (Body / Query) ====================

export const CreateJobBodySchema = JobContentBaseSchema.extend({
  preferredSkills: JobContentBaseSchema.shape.preferredSkills.default([]),
  minYearsExperience: JobContentBaseSchema.shape.minYearsExperience.default(0),
  cvPassThreshold: JobContentBaseSchema.shape.cvPassThreshold.default(70),
  interviewQuestionCount: JobContentBaseSchema.shape.interviewQuestionCount.default(3),
  rubricWeights: RubricWeightsSchema.default(DEFAULT_RUBRIC_WEIGHTS),
}).strict();

export const UpdateJobBodySchema = JobContentBaseSchema.partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần cung cấp ít nhất một trường để cập nhật',
  });

export const GetJobsQuerySchema = PaginationQuerySchema.extend({
  search: z
    .string()
    .trim()
    .max(200, 'Từ khóa tìm kiếm tối đa 200 ký tự')
    .optional()
    .describe('Từ khóa tìm kiếm theo tiêu đề công việc'),
});

export const GetMyJobsQuerySchema = GetJobsQuerySchema.extend({
  status: z
    .enum(JobStatus)
    .optional()
    .describe('Lọc theo trạng thái tin tuyển dụng (OPEN hoặc CLOSED)'),
});

export const JobIdParamSchema = z.object({
  id: z.uuid('ID tin tuyển dụng không đúng định dạng UUID').describe('Job UUID'),
});

// ==================== Response Schemas ====================

export const GetJobsResSchema = z.object({
  data: z.array(PublicJobSchema).describe('Danh sách công việc công khai'),
  meta: PaginationMetaSchema.describe('Thông tin phân trang'),
});

export const GetJobResSchema = PublicJobSchema;

export const GetMyJobsResSchema = z.object({
  data: z.array(HrJobSchema).describe('Danh sách công việc của HR'),
  meta: PaginationMetaSchema.describe('Thông tin phân trang'),
});

export const GetMyJobResSchema = HrJobSchema;
export const CreateJobResSchema = HrJobSchema;
export const UpdateJobResSchema = HrJobSchema;
export const CloseJobResSchema = HrJobSchema;
export const ReopenJobResSchema = HrJobSchema;

// ==================== Inferred Types ====================

export type CreateJobBodyType = z.infer<typeof CreateJobBodySchema>;
export type UpdateJobBodyType = z.infer<typeof UpdateJobBodySchema>;
export type GetJobsQueryType = z.infer<typeof GetJobsQuerySchema>;
export type GetMyJobsQueryType = z.infer<typeof GetMyJobsQuerySchema>;
export type JobIdParamType = z.infer<typeof JobIdParamSchema>;
export type GetJobsResType = z.infer<typeof GetJobsResSchema>;
export type GetJobResType = z.infer<typeof GetJobResSchema>;
export type GetMyJobsResType = z.infer<typeof GetMyJobsResSchema>;
export type GetMyJobResType = z.infer<typeof GetMyJobResSchema>;
export type CreateJobResType = z.infer<typeof CreateJobResSchema>;
export type UpdateJobResType = z.infer<typeof UpdateJobResSchema>;
export type CloseJobResType = z.infer<typeof CloseJobResSchema>;
export type ReopenJobResType = z.infer<typeof ReopenJobResSchema>;
