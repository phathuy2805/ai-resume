import { z } from 'zod';
import { JobLevel, JobStatus } from '../constants/job.constant.js';

export const RubricWeightsSchema = z
  .object({
    technical: z
      .number()
      .int('Trọng số chuyên môn phải là số nguyên')
      .min(0, 'Trọng số tối thiểu là 0')
      .max(100, 'Trọng số tối đa là 100')
      .describe('Trọng số chuyên môn (%)'),
    communication: z
      .number()
      .int('Trọng số giao tiếp phải là số nguyên')
      .min(0, 'Trọng số tối thiểu là 0')
      .max(100, 'Trọng số tối đa là 100')
      .describe('Trọng số giao tiếp (%)'),
    relevance: z
      .number()
      .int('Trọng số độ phù hợp phải là số nguyên')
      .min(0, 'Trọng số tối thiểu là 0')
      .max(100, 'Trọng số tối đa là 100')
      .describe('Trọng số độ phù hợp (%)'),
    evidence: z
      .number()
      .int('Trọng số minh chứng phải là số nguyên')
      .min(0, 'Trọng số tối thiểu là 0')
      .max(100, 'Trọng số tối đa là 100')
      .describe('Trọng số minh chứng (%)'),
  })
  .strict()
  .superRefine((weights, ctx) => {
    const sum = weights.technical + weights.communication + weights.relevance + weights.evidence;
    if (sum !== 100) {
      ctx.addIssue({
        code: 'custom',
        message: `Tổng trọng số rubric phải bằng 100 (hiện tại: ${sum})`,
      });
    }
  });

export const JobSchema = z.object({
  id: z.uuid().describe('Mã định danh công việc (UUID)'),
  title: z.string().min(1).describe('Tiêu đề tuyển dụng'),
  description: z.string().min(1).describe('Nội dung chi tiết của JD'),
  requirements: z.string().nullable().describe('Yêu cầu ứng viên'),
  requiredSkills: z.array(z.string()).describe('Danh sách kỹ năng bắt buộc'),
  preferredSkills: z.array(z.string()).describe('Danh sách kỹ năng ưu tiên'),
  minYearsExperience: z.number().int().min(0).describe('Số năm kinh nghiệm tối thiểu'),
  level: z.enum(JobLevel).nullable().describe('Cấp độ vị trí tuyển dụng'),
  status: z.enum(JobStatus).describe('Trạng thái tin tuyển dụng (OPEN hoặc CLOSED)'),
  cvPassThreshold: z.number().int().min(0).max(100).describe('Điểm sàn qua vòng CV (0-100)'),
  interviewQuestionCount: z
    .number()
    .int()
    .min(3)
    .max(5)
    .describe('Số câu hỏi phỏng vấn Voice AI (3-5)'),
  rubricWeights: RubricWeightsSchema.describe('Trọng số 4 tiêu chí chấm điểm phỏng vấn'),
  parsedJd: z.unknown().nullable().describe('Dữ liệu JD đã được AI phân tích (JSON)'),
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
