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

/**
 * Score colour follows the job threshold:
 * - Green (PASS): score >= threshold
 * - Amber (CONSIDER): score >= threshold - 10 && score < threshold
 * - Red (REJECT): score < threshold - 10
 */
export function scoreTone(score: number, threshold = 70): 'success' | 'warning' | 'danger' {
  if (score >= threshold) return 'success';
  if (score >= threshold - 10) return 'warning';
  return 'danger';
}
