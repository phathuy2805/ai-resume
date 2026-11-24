import type { Explanation, ScoreBreakdown, ScreeningTimings } from '@hireflow/ai';
import { z } from 'zod';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { ApplicationSchema } from '../../shared/models/application.model.js';
import { JobSchema } from '../../shared/models/job.model.js';
import {
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../../shared/models/pagination.model.js';
import { UserSchema } from '../../shared/models/user.model.js';

// ==================== Params ====================

export const JobApplicationsParamSchema = z.object({
  jobId: z.uuid('Job ID không đúng định dạng UUID').describe('Mã định danh công việc (UUID)'),
});

export const ApplicationIdParamSchema = z.object({
  id: z.uuid('Application ID không đúng định dạng UUID').describe('Mã định danh hồ sơ (UUID)'),
});

// ==================== Query ====================

export const GetJobApplicationsQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(ApplicationStatus).optional().describe('Lọc theo trạng thái hồ sơ'),
  minScore: z.coerce.number().int().min(0).max(100).optional().describe('Điểm sàng lọc tối thiểu'),
  maxScore: z.coerce.number().int().min(0).max(100).optional().describe('Điểm sàng lọc tối đa'),
  sort: z.enum(['score', 'createdAt']).default('createdAt').describe('Tiêu chí sắp xếp'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Thứ tự sắp xếp'),
}).superRefine((query, ctx) => {
  if (
    query.minScore !== undefined &&
    query.maxScore !== undefined &&
    query.minScore > query.maxScore
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['minScore'],
      message: 'minScore không được lớn hơn maxScore',
    });
  }
});

// ==================== Request Body ====================

export const UploadCvFileSchema = z.object({
  file: z.any().describe('Tệp CV định dạng PDF (dung lượng tối đa 5MB)'),
});

export const DecisionBodySchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']).describe('Quyết định của HR sau vòng CV'),
  note: z.string().trim().max(1000).optional().describe('Ghi chú của HR'),
});

// ==================== Response ====================

export const MyApplicationResSchema = ApplicationSchema.extend({
  interviewId: z
    .uuid()
    .nullable()
    .optional()
    .describe('Mã phiên phỏng vấn AI nếu đã được mời phỏng vấn (null nếu chưa có)'),
});

export const JobApplicationListItemSchema = ApplicationSchema.pick({
  id: true,
  status: true,
  createdAt: true,
}).extend({
  candidateName: UserSchema.shape.fullName,
  totalScore: z.number().int().min(0).max(100).nullable().describe('Điểm tổng AI chấm CV'),
  aiRecommendation: z.enum(AiRecommendation).nullable().describe('Đề xuất của AI'),
});

export const GetJobApplicationsResSchema = z.object({
  data: z.array(JobApplicationListItemSchema),
  meta: PaginationMetaSchema,
});

const SkillBreakdownItemSchema = z.object({
  score: z.number().int().min(0).max(100),
  weight: z.number().min(0).max(100),
  matched: z.array(z.string()),
  missing: z.array(z.string()),
});

export const ScoreBreakdownSchema = z.object({
  requiredSkills: SkillBreakdownItemSchema,
  preferredSkills: SkillBreakdownItemSchema,
  experienceYears: z.object({
    score: z.number().int().min(0).max(100),
    weight: z.number().min(0).max(100),
    candidateYears: z.number().min(0),
    requiredYears: z.number().nullable(),
  }),
  relevance: z.object({
    score: z.number().int().min(0).max(100),
    weight: z.number().min(0).max(100),
    comment: z.string(),
  }),
  similarity: z.object({
    score: z.number().int().min(0).max(100),
    weight: z.number().min(0).max(100),
    cosine: z.number().min(-1).max(1),
  }),
  capped: z.boolean(),
}) satisfies z.ZodType<ScoreBreakdown>;

export const ExplanationStrengthSchema = z.object({
  point: z.string().describe('Nhận xét điểm mạnh của ứng viên'),
  quote: z.string().nullable().describe('Trích dẫn nguyên văn từ CV (null nếu không kiểm chứng được)'),
});

export const ExplanationGapSchema = z.object({
  skill: z.string().describe('Tên kỹ năng bắt buộc còn thiếu'),
  note: z.string().describe('Nhận xét về kỹ năng còn thiếu'),
});

export const ExplanationSchema = z.object({
  strengths: z.array(ExplanationStrengthSchema).describe('Danh sách điểm mạnh kèm trích dẫn CV'),
  gaps: z.array(ExplanationGapSchema).describe('Danh sách kỹ năng bắt buộc còn thiếu kèm nhận xét'),
  summary: z.string().describe('Tóm tắt mức độ phù hợp của ứng viên'),
}) satisfies z.ZodType<Explanation>;

export const ScreeningTimingsSchema = z.object({
  parseCvMs: z.number().int().min(0),
  embedMs: z.number().int().min(0),
  scoreMs: z.number().int().min(0),
  explainMs: z.number().int().min(0),
  totalMs: z.number().int().min(0),
}) satisfies z.ZodType<ScreeningTimings>;

export const ScreeningResultDetailSchema = z.object({
  totalScore: z.number().int().min(0).max(100),
  breakdown: ScoreBreakdownSchema,
  explanation: ExplanationSchema,
  timings: ScreeningTimingsSchema,
  processingDurationMs: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApplicationStatusHistoryItemSchema = z.object({
  id: z.uuid(),
  fromStatus: z.enum(ApplicationStatus).nullable(),
  toStatus: z.enum(ApplicationStatus),
  changedById: z.uuid().nullable(),
  reason: z.string().nullable(),
  changedAt: z.string(),
});

export const GetApplicationDetailResSchema = ApplicationSchema.pick({
  id: true,
  status: true,
  cvFileName: true,
  cvSizeBytes: true,
  cvMimeType: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  aiRecommendation: z.enum(AiRecommendation).nullable(),
  screeningError: z.string().nullable(),
  candidate: UserSchema.pick({
    id: true,
    fullName: true,
    email: true,
  }),
  job: JobSchema.pick({
    id: true,
    title: true,
    cvPassThreshold: true,
  }),
  screeningResult: ScreeningResultDetailSchema.nullable(),
  hrDecisionBy: UserSchema.pick({
    id: true,
    fullName: true,
  }).nullable(),
  hrDecisionAt: z.string().nullable(),
  hrNote: z.string().nullable(),
  interviewId: z.uuid().nullable(),
  statusHistories: z.array(ApplicationStatusHistoryItemSchema),
});

export const DecisionResSchema = ApplicationSchema.pick({
  id: true,
  status: true,
}).extend({
  interviewId: z.uuid().nullable(),
  hrDecisionById: z.uuid().nullable(),
  hrDecisionAt: z.string().nullable(),
  hrNote: z.string().nullable(),
});

export const RescreenResSchema = ApplicationSchema.pick({
  id: true,
  status: true,
});

export const ScoreRangeSchema = z.object({
  range: z.string().describe('Khoảng điểm (VD: 0-9, 10-19, ..., 90-100)'),
  count: z.number().int().min(0).describe('Số lượng hồ sơ trong khoảng điểm'),
});

export const GetJobStatsResSchema = z.object({
  totalApplications: z.number().int().min(0),
  byStatus: z.record(z.enum(ApplicationStatus), z.number().int().min(0)),
  scoreDistribution: z.array(ScoreRangeSchema),
  byRecommendation: z.object({
    PASS: z.number().int().min(0),
    CONSIDER: z.number().int().min(0),
    REJECT: z.number().int().min(0),
    unrated: z.number().int().min(0),
  }),
  aiPassRate: z.number().min(0).max(1),
  hrAgreementRate: z.number().min(0).max(1).nullable(),
});

export const GetApplicationCvUrlResSchema = z.object({
  url: z.url().describe('Link presigned S3 tạm thời để xem/tải CV'),
  expiresInSec: z.number().int().positive().describe('Thời gian sống của link (giây)'),
});

// ==================== Inferred Types ====================

export type JobApplicationsParamType = z.infer<typeof JobApplicationsParamSchema>;
export type ApplicationIdParamType = z.infer<typeof ApplicationIdParamSchema>;
export type GetJobApplicationsQueryType = z.infer<typeof GetJobApplicationsQuerySchema>;
export type UploadCvFileBody = z.infer<typeof UploadCvFileSchema>;
export type DecisionBodyType = z.infer<typeof DecisionBodySchema>;
export type MyApplicationResType = z.infer<typeof MyApplicationResSchema>;
export type JobApplicationListItemType = z.infer<typeof JobApplicationListItemSchema>;
export type GetJobApplicationsResType = z.infer<typeof GetJobApplicationsResSchema>;
export type GetApplicationDetailResType = z.infer<typeof GetApplicationDetailResSchema>;
export type DecisionResType = z.infer<typeof DecisionResSchema>;
export type RescreenResType = z.infer<typeof RescreenResSchema>;
export type GetJobStatsResType = z.infer<typeof GetJobStatsResSchema>;
export type GetApplicationCvUrlResType = z.infer<typeof GetApplicationCvUrlResSchema>;
