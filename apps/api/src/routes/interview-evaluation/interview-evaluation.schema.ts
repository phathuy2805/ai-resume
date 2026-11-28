import { z } from 'zod';
import { AnswerSource, TurnTranscriptStatus } from '../../generated/prisma/client.js';
import {
  AiRecommendation,
  ApplicationStatus,
} from '../../shared/constants/application-status.enum.js';
import { RubricWeightsSchema } from '../../shared/models/job.model.js';
import { UserSchema } from '../../shared/models/user.model.js';
import { INTERVIEW_PHASES } from './interview-evaluation.constant.js';

export const InterviewApplicationIdParamSchema = z.object({
  id: z.uuid('Application ID không đúng định dạng UUID').describe('Mã định danh hồ sơ (UUID)'),
});

export const InterviewIdParamSchema = z.object({
  id: z.uuid('Interview ID không đúng định dạng UUID').describe('Mã định danh phiên phỏng vấn (UUID)'),
});

export const InterviewDecisionBodySchema = z
  .object({
    decision: z.enum(['PASS', 'FAIL']).describe('Quyết định cuối vòng phỏng vấn sơ bộ (PASS hoặc FAIL)'),
    note: z
      .string()
      .trim()
      .max(1000, 'Ghi chú nội bộ tối đa 1.000 ký tự')
      .optional()
      .describe('Ghi chú nội bộ của HR (không hiển thị cho ứng viên)'),
    candidateMessage: z
      .string()
      .trim()
      .max(500, 'Lời nhắn gửi ứng viên tối đa 500 ký tự')
      .optional()
      .describe('Lời nhắn gửi ứng viên (hiển thị tại trang phản hồi và email)'),
  })
  .strict();

export const EvidenceCriterionSchema = z.object({
  comment: z.string().describe('Nhận xét cho tiêu chí'),
  quotes: z.array(z.string()).describe('Các câu trích dẫn dẫn chứng từ lời trả lời của ứng viên'),
});

export const EvidenceQuotesSchema = z.object({
  technical: EvidenceCriterionSchema,
  communication: EvidenceCriterionSchema,
  relevance: EvidenceCriterionSchema,
  evidence: EvidenceCriterionSchema,
});

export const CandidateFeedbackSchema = z.object({
  strengths: z.array(z.string()).describe('Các điểm mạnh nổi bật'),
  improvements: z.array(z.string()).describe('Các điểm cần cải thiện'),
  suggestions: z.array(z.string()).describe('Gợi ý cụ thể để phát triển thêm'),
});

export const InterviewTurnDetailSchema = z.object({
  id: z.uuid(),
  orderIndex: z.number().int().min(1),
  question: z.string(),
  questionType: z.string().nullable(),
  targetSkill: z.string().nullable(),
  answerText: z.string().nullable(),
  source: z.enum(AnswerSource),
  transcriptStatus: z.enum(TurnTranscriptStatus).nullable(),
  transcriptEdited: z.boolean(),
  askedAt: z.string().nullable(),
  answeredAt: z.string().nullable(),
  durationSec: z.number().int().min(0).nullable(),
  isEmpty: z.boolean(),
  audioUrl: z.string().nullable(),
});

export const InterviewResultDetailSchema = z.object({
  technicalScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  relevanceScore: z.number().min(0).max(100),
  evidenceScore: z.number().min(0).max(100),
  totalScore: z.number().min(0).max(100),
  feedbackSummary: z.string(),
  evidenceQuotes: EvidenceQuotesSchema,
  aiRecommendation: z.enum([AiRecommendation.PASS, AiRecommendation.REJECT]),
  candidateFeedback: CandidateFeedbackSchema,
  decisionBy: UserSchema.pick({ id: true, fullName: true }).nullable(),
  decisionAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  candidateMessage: z.string().nullable(),
  createdAt: z.string(),
});

export const GetApplicationInterviewResSchema = z.object({
  interviewId: z.uuid(),
  applicationId: z.uuid(),
  status: z.enum(ApplicationStatus),
  phase: z.enum([
    INTERVIEW_PHASES.INVITED,
    INTERVIEW_PHASES.IN_PROGRESS,
    INTERVIEW_PHASES.SUBMITTED,
    INTERVIEW_PHASES.EVALUATED,
    INTERVIEW_PHASES.DECIDED,
    INTERVIEW_PHASES.EXPIRED,
  ]),
  expiresAt: z.string().nullable(),
  inviteExpiresAt: z.string(),
  sessionExpiresAt: z.string().nullable(),
  isExpired: z.boolean(),
  recordingConsentAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  transcriptS3Key: z.string().nullable(),
  evaluationError: z.string().nullable(),
  passThreshold: z.number().int().min(0).max(100),
  rubricWeights: RubricWeightsSchema,
  turns: z.array(InterviewTurnDetailSchema),
  result: InterviewResultDetailSchema.nullable(),
});

export const InterviewDecisionResSchema = z.object({
  id: z.uuid(),
  interviewId: z.uuid(),
  status: z.enum([ApplicationStatus.PASSED, ApplicationStatus.FAILED]),
  decisionById: z.uuid(),
  decisionAt: z.string(),
  decisionNote: z.string().nullable(),
  candidateMessage: z.string().nullable(),
});

export const ReEvaluateInterviewResSchema = z.object({
  interviewId: z.uuid(),
  applicationId: z.uuid(),
  status: z.enum(ApplicationStatus),
});

export const GetCandidateFeedbackResSchema = z.object({
  status: z.enum(ApplicationStatus).describe('Trạng thái hiện tại của hồ sơ'),
  stage: z.enum(['CV', 'INTERVIEW']).optional().describe('Vòng phản hồi (CV hoặc INTERVIEW)'),
  result: z
    .enum(['PASSED', 'FAILED', 'REJECTED'])
    .optional()
    .describe('Kết quả quyết định của HR'),
  candidateMessage: z
    .string()
    .nullable()
    .optional()
    .describe('Lời nhắn của HR gửi ứng viên'),
  feedback: CandidateFeedbackSchema.nullable()
    .optional()
    .describe('Phản hồi kỹ năng dạng JSON (null nếu đang chuẩn bị)'),
});

export type InterviewDecisionBodyType = z.infer<typeof InterviewDecisionBodySchema>;
export type EvidenceQuotesType = z.infer<typeof EvidenceQuotesSchema>;
export type CandidateFeedbackType = z.infer<typeof CandidateFeedbackSchema>;
export type GetApplicationInterviewResType = z.infer<typeof GetApplicationInterviewResSchema>;
export type InterviewDecisionResType = z.infer<typeof InterviewDecisionResSchema>;
export type ReEvaluateInterviewResType = z.infer<typeof ReEvaluateInterviewResSchema>;
export type GetCandidateFeedbackResType = z.infer<typeof GetCandidateFeedbackResSchema>;
