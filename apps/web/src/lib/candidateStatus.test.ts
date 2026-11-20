import { describe, expect, it } from 'vitest';
import { CANDIDATE_STEPS, getCandidateProgress } from './candidateStatus';
import type { ApplicationStatus } from '@/types/applications';

describe('candidateStatus', () => {
  it('định nghĩa đúng 4 bước timeline thân thiện cho ứng viên', () => {
    expect(CANDIDATE_STEPS).toEqual(['Đã nộp', 'Xét duyệt CV', 'Phỏng vấn', 'Kết quả']);
  });

  const allStatuses: ApplicationStatus[] = [
    'SUBMITTED',
    'SCREENING',
    'SCREENING_FAILED',
    'SCREENED',
    'SHORTLISTED',
    'REJECTED',
    'INTERVIEW_INVITED',
    'INTERVIEWING',
    'EVALUATED',
    'PASSED',
    'FAILED',
  ];

  it('mọi trạng thái nội bộ đều được gán nhãn, bước hợp lệ và tone màu', () => {
    for (const status of allStatuses) {
      const progress = getCandidateProgress(status);
      expect(progress.label).toBeTruthy();
      expect(typeof progress.label).toBe('string');
      expect(progress.step).toBeGreaterThanOrEqual(0);
      expect(progress.step).toBeLessThanOrEqual(3);
      expect(['neutral', 'progress', 'action', 'success', 'failed']).toContain(progress.tone);
    }
  });

  it('gộp các trạng thái sơ tuyển thành "Đang xét duyệt" không để lộ lỗi/AI', () => {
    const underReview: ApplicationStatus[] = [
      'SUBMITTED',
      'SCREENING',
      'SCREENING_FAILED',
      'SCREENED',
      'SHORTLISTED',
    ];
    for (const status of underReview) {
      const progress = getCandidateProgress(status);
      expect(progress.label).toBe('Đang xét duyệt');
      expect(progress.label).not.toContain('lỗi');
      expect(progress.label).not.toContain('AI');
    }
  });

  it('map chính xác từng trạng thái theo quy định của bảng W2-FE-03', () => {
    expect(getCandidateProgress('SUBMITTED')).toEqual({
      step: 0,
      tone: 'neutral',
      label: 'Đang xét duyệt',
    });
    expect(getCandidateProgress('SCREENING')).toEqual({
      step: 1,
      tone: 'progress',
      label: 'Đang xét duyệt',
    });
    expect(getCandidateProgress('SCREENING_FAILED')).toEqual({
      step: 1,
      tone: 'progress',
      label: 'Đang xét duyệt',
    });
    expect(getCandidateProgress('SCREENED')).toEqual({
      step: 1,
      tone: 'progress',
      label: 'Đang xét duyệt',
    });
    expect(getCandidateProgress('SHORTLISTED')).toEqual({
      step: 1,
      tone: 'progress',
      label: 'Đang xét duyệt',
    });
    expect(getCandidateProgress('REJECTED')).toEqual({
      step: 1,
      tone: 'failed',
      label: 'Chưa phù hợp',
    });
    expect(getCandidateProgress('INTERVIEW_INVITED')).toEqual({
      step: 2,
      tone: 'action',
      label: 'Được mời phỏng vấn',
    });
    expect(getCandidateProgress('INTERVIEWING')).toEqual({
      step: 2,
      tone: 'progress',
      label: 'Đang phỏng vấn',
    });
    expect(getCandidateProgress('EVALUATED')).toEqual({
      step: 2,
      tone: 'progress',
      label: 'Đang chờ kết quả',
    });
    expect(getCandidateProgress('PASSED')).toEqual({
      step: 3,
      tone: 'success',
      label: 'Đạt',
    });
    expect(getCandidateProgress('FAILED')).toEqual({
      step: 3,
      tone: 'failed',
      label: 'Chưa đạt',
    });
  });
});
