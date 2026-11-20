import type { ApplicationStatus } from '@/types/applications';

/**
 * 4 bước timeline hiển thị cho ứng viên thay cho 11 trạng thái nội bộ.
 * 0: Đã nộp
 * 1: Xét duyệt CV
 * 2: Phỏng vấn
 * 3: Kết quả
 */
export const CANDIDATE_STEPS = [
  'Đã nộp',
  'Xét duyệt CV',
  'Phỏng vấn',
  'Kết quả',
] as const;

export type CandidateTone = 'neutral' | 'progress' | 'action' | 'success' | 'failed';

export interface CandidateProgress {
  /** Index (0-3) của bước mà hồ sơ hiện đang ở. */
  step: number;
  tone: CandidateTone;
  label: string;
}

/**
 * Ánh xạ trạng thái nội bộ sang nhãn, tone màu và bước timeline thân thiện cho ứng viên.
 * Tuyệt đối không để lộ điểm số, đề xuất AI hay thông tin lỗi chấm nội bộ.
 */
export function getCandidateProgress(status: ApplicationStatus): CandidateProgress {
  switch (status) {
    case 'SUBMITTED':
      return { step: 0, tone: 'neutral', label: 'Đang xét duyệt' };
    case 'SCREENING':
    case 'SCREENING_FAILED':
    case 'SCREENED':
    case 'SHORTLISTED':
      return { step: 1, tone: 'progress', label: 'Đang xét duyệt' };
    case 'REJECTED':
      return { step: 1, tone: 'failed', label: 'Chưa phù hợp' };
    case 'INTERVIEW_INVITED':
      return { step: 2, tone: 'action', label: 'Được mời phỏng vấn' };
    case 'INTERVIEWING':
      return { step: 2, tone: 'progress', label: 'Đang phỏng vấn' };
    case 'EVALUATED':
      return { step: 2, tone: 'progress', label: 'Đang chờ kết quả' };
    case 'PASSED':
      return { step: 3, tone: 'success', label: 'Đạt' };
    case 'FAILED':
      return { step: 3, tone: 'failed', label: 'Chưa đạt' };
  }
}
