import { describe, expect, it } from 'vitest';
import { AI_RECOMMENDATION, HR_STATUS, scoreTone } from './applicationStatus';

describe('applicationStatus', () => {
  describe('scoreTone', () => {
    it('returns "success" when score is at or above cvPassThreshold', () => {
      expect(scoreTone(70, 70)).toBe('success');
      expect(scoreTone(85, 70)).toBe('success');
      expect(scoreTone(100, 70)).toBe('success');
    });

    it('returns "warning" when score is within 10 points below cvPassThreshold', () => {
      expect(scoreTone(69, 70)).toBe('warning');
      expect(scoreTone(60, 70)).toBe('warning');
      expect(scoreTone(65, 70)).toBe('warning');
    });

    it('returns "danger" when score is more than 10 points below cvPassThreshold', () => {
      expect(scoreTone(59, 70)).toBe('danger');
      expect(scoreTone(40, 70)).toBe('danger');
      expect(scoreTone(0, 70)).toBe('danger');
    });

    it('defaults threshold to 70 if not provided', () => {
      expect(scoreTone(70)).toBe('success');
      expect(scoreTone(65)).toBe('warning');
      expect(scoreTone(55)).toBe('danger');
    });
  });

  describe('HR_STATUS and AI_RECOMMENDATION', () => {
    it('defines labels and variants for all statuses and recommendations', () => {
      expect(HR_STATUS.SUBMITTED.label).toBe('Đã nộp');
      expect(HR_STATUS.SCREENING.label).toBe('Đang chấm điểm');
      expect(HR_STATUS.SCREENING_FAILED.label).toBe('Lỗi chấm điểm');
      expect(HR_STATUS.SCREENED.label).toBe('Chờ duyệt');

      expect(AI_RECOMMENDATION.PASS.label).toBe('Nên chọn');
      expect(AI_RECOMMENDATION.CONSIDER.label).toBe('Cân nhắc');
      expect(AI_RECOMMENDATION.REJECT.label).toBe('Không phù hợp');
    });
  });
});
