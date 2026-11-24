import { ApplicationStatus } from '../constants/application-status.enum.js';

/** Chạy cả pipeline tối đa 2 lần (1 lần đầu + 1 lần thử lại) trước khi chuyển SCREENING_FAILED. */
export const SCREENING_MAX_ATTEMPTS = 2;

/** Chờ giữa 2 lần chạy pipeline để lỗi tạm thời (mạng, quota Gemini) kịp hồi phục. */
export const SCREENING_RETRY_DELAY_MS = 3000;

/** Độ dài tối đa của `Application.screeningError` và `reason` trong lịch sử trạng thái. */
export const SCREENING_ERROR_MAX_LENGTH = 500;

/** Trạng thái pipeline được phép chạy (SCREENING: chấm lại hoặc khôi phục sau restart). */
export const SCREENABLE_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.SCREENING,
];

/** Trạng thái HR được bấm "Chấm lại". */
export const RESCREENABLE_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.SCREENED,
  ApplicationStatus.SCREENING_FAILED,
];
