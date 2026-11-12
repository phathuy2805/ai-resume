import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RubricWeightsSchema = z.object({
  technical: z.number().int().min(0).max(100).default(40).describe('Trọng số chuyên môn (%)'),
  communication: z.number().int().min(0).max(100).default(20).describe('Trọng số giao tiếp (%)'),
  relevance: z.number().int().min(0).max(100).default(20).describe('Trọng số độ phù hợp (%)'),
  evidence: z.number().int().min(0).max(100).default(20).describe('Trọng số minh chứng (%)'),
});
export class RubricWeightsDto extends createZodDto(RubricWeightsSchema) {}

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Tiêu đề tuyển dụng không được để trống').describe('Tiêu đề vị trí tuyển dụng'),
  description: z.string().min(1, 'Mô tả công việc không được để trống').describe('Nội dung chi tiết JD'),
  requiredSkills: z
    .array(z.string())
    .min(1, 'Cần ít nhất một kỹ năng bắt buộc')
    .describe('Danh sách kỹ năng bắt buộc'),
  preferredSkills: z.array(z.string()).optional().default([]).describe('Danh sách kỹ năng ưu tiên'),
  minYearsExperience: z.number().int().min(0).describe('Số năm kinh nghiệm tối thiểu'),
  cvPassThreshold: z.number().int().min(0).max(100).default(70).describe('Điểm sàn AI Screening (0-100)'),
  interviewQuestionCount: z
    .number()
    .int()
    .min(3)
    .max(5)
    .default(3)
    .describe('Số câu hỏi phỏng vấn Voice AI (3-5 câu)'),
  rubricWeights: RubricWeightsSchema.optional().describe('Trọng số 4 tiêu chí chấm điểm phỏng vấn'),
});
export class CreateJobDto extends createZodDto(CreateJobSchema) {}
