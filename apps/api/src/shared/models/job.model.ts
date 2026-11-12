import { z } from 'zod';
import { JobStatus } from '../constants/job-status.enum.js';

export const RubricWeightsSchema = z.object({
  technical: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(40)
    .describe('Trọng số chuyên môn (%)'),
  communication: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(20)
    .describe('Trọng số giao tiếp (%)'),
  relevance: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(20)
    .describe('Trọng số độ phù hợp (%)'),
  evidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(20)
    .describe('Trọng số minh chứng (%)'),
});

export const JobSchema = z.object({
  id: z.uuid().describe('Mã định danh công việc (UUID)'),
  title: z
    .string()
    .min(1, 'Tiêu đề tuyển dụng không được để trống')
    .describe('Tiêu đề tuyển dụng'),
  description: z
    .string()
    .min(1, 'Mô tả công việc không được để trống')
    .describe('Nội dung chi tiết của JD'),
  requiredSkills: z
    .array(z.string())
    .min(1, 'Cần ít nhất một kỹ năng bắt buộc')
    .describe('Danh sách kỹ năng bắt buộc'),
  preferredSkills: z.array(z.string()).describe('Danh sách kỹ năng ưu tiên'),
  minYearsExperience: z
    .number()
    .int()
    .min(0)
    .describe('Số năm kinh nghiệm tối thiểu'),
  status: z
    .enum(JobStatus)
    .describe('Trạng thái tin tuyển dụng (OPEN hoặc CLOSED)'),
  cvPassThreshold: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Điểm sàn qua vòng CV (0-100)'),
  interviewQuestionCount: z
    .number()
    .int()
    .min(3)
    .max(5)
    .describe('Số câu hỏi phỏng vấn Voice AI (3-5)'),
  rubricWeights: RubricWeightsSchema.optional().describe(
    'Trọng số 4 tiêu chí chấm điểm phỏng vấn',
  ),
  createdById: z.uuid().describe('ID người tạo (HR)'),
  createdAt: z.string().describe('Thời điểm đăng tin (ISO 8601)'),
  updatedAt: z.string().describe('Thời điểm cập nhật gần nhất (ISO 8601)'),
});

export const JobSummarySchema = JobSchema.pick({
  id: true,
  title: true,
});

export type RubricWeightsModel = z.infer<typeof RubricWeightsSchema>;
export type JobModel = z.infer<typeof JobSchema>;
export type JobSummaryModel = z.infer<typeof JobSummarySchema>;
