import type { BadgeVariant } from '@/components/ui/badge';
import type { Application, ApplicationStatus } from '@/types/applications';

export type AiRecommendation = NonNullable<Application['aiRecommendation']>;

/** Detailed labels shown to HR (one per DB status). */
export const HR_STATUS: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
  SUBMITTED: { label: 'Đã nộp', variant: 'secondary' },
  SCREENING: { label: 'Đang chấm điểm', variant: 'default' },
  SCREENING_FAILED: { label: 'Lỗi chấm điểm', variant: 'danger' },
  SCREENED: { label: 'Chờ duyệt', variant: 'secondary' },
  SHORTLISTED: { label: 'Đạt sàng lọc', variant: 'success' },
  REJECTED: { label: 'Đã loại', variant: 'secondary' },
  INTERVIEW_INVITED: { label: 'Đã mời PV', variant: 'default' },
  INTERVIEWING: { label: 'Đang phỏng vấn', variant: 'default' },
  EVALUATED: { label: 'Đã phỏng vấn', variant: 'warning' },
  PASSED: { label: 'Đạt', variant: 'success' },
  FAILED: { label: 'Không đạt', variant: 'danger' },
};

export const AI_RECOMMENDATION: Record<AiRecommendation, { label: string; variant: BadgeVariant }> =
  {
    PASS: { label: 'Nên chọn', variant: 'success' },
    CONSIDER: { label: 'Cân nhắc', variant: 'warning' },
    REJECT: { label: 'Không phù hợp', variant: 'danger' },
  };

/** The 5 friendly steps a candidate sees instead of 11 technical statuses. */
export const CANDIDATE_STEPS = [
  'Đã nộp',
  'Đánh giá CV',
  'Phỏng vấn AI',
  'Chờ kết quả',
  'Kết quả',
] as const;

export type CandidateTone = 'neutral' | 'progress' | 'action' | 'success' | 'failed';

export interface CandidateProgress {
  /** Index (0-4) of the step the application is currently on. */
  step: number;
  tone: CandidateTone;
  label: string;
}

export function getCandidateProgress(status: ApplicationStatus): CandidateProgress {
  switch (status) {
    case 'SUBMITTED':
      return { step: 0, tone: 'neutral', label: 'Đã nộp' };
    case 'SCREENING':
    case 'SCREENED':
    case 'SCREENING_FAILED':
      return { step: 1, tone: 'progress', label: 'Đang đánh giá CV' };
    case 'REJECTED':
      return { step: 1, tone: 'failed', label: 'Chưa phù hợp' };
    case 'SHORTLISTED':
    case 'INTERVIEW_INVITED':
    case 'INTERVIEWING':
      return { step: 2, tone: 'action', label: 'Mời phỏng vấn AI' };
    case 'EVALUATED':
      return { step: 3, tone: 'progress', label: 'Đang chờ kết quả' };
    case 'PASSED':
      return { step: 4, tone: 'success', label: 'Đạt yêu cầu sơ tuyển' };
    case 'FAILED':
      return { step: 4, tone: 'failed', label: 'Chưa phù hợp' };
  }
}

/** Score colour follows the job threshold: green ≥ threshold, amber within 20 below, red otherwise. */
export function scoreTone(score: number, threshold = 70): 'success' | 'warning' | 'danger' {
  if (score >= threshold) return 'success';
  if (score >= threshold - 20) return 'warning';
  return 'danger';
}
