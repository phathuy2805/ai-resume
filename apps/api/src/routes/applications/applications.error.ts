import type { CvExtractionError } from '@hireflow/ai';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Mã lỗi trả kèm response (trường `code`) để FE (W1-FE-06) hiển thị đúng thông báo,
 * không phải so sánh chuỗi message.
 */
export enum ApplicationErrorCode {
  CV_FILE_REQUIRED = 'CV_FILE_REQUIRED',
  CV_INVALID_FILE_TYPE = 'CV_INVALID_FILE_TYPE',
  CV_FILE_TOO_LARGE = 'CV_FILE_TOO_LARGE',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_CLOSED = 'JOB_CLOSED',
  ALREADY_APPLIED = 'ALREADY_APPLIED',
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  APPLICATION_FORBIDDEN = 'APPLICATION_FORBIDDEN',
  INVALID_DECISION_STATUS = 'INVALID_DECISION_STATUS',
  INVALID_RESCREEN_STATUS = 'INVALID_RESCREEN_STATUS',
}

export const CvFileRequiredException = new BadRequestException({
  message: 'Vui lòng chọn file CV để nộp',
  code: ApplicationErrorCode.CV_FILE_REQUIRED,
});

export const CvInvalidFileTypeException = new BadRequestException({
  message: 'CV phải là file PDF',
  code: ApplicationErrorCode.CV_INVALID_FILE_TYPE,
});

export const CvFileTooLargeException = new PayloadTooLargeException({
  message: 'CV có dung lượng tối đa 5MB',
  code: ApplicationErrorCode.CV_FILE_TOO_LARGE,
});

export const JobNotFoundForApplyException = new NotFoundException({
  message: 'Không tìm thấy tin tuyển dụng',
  code: ApplicationErrorCode.JOB_NOT_FOUND,
});

export const JobClosedException = new ConflictException({
  message: 'Tin tuyển dụng đã đóng, không thể nộp CV',
  code: ApplicationErrorCode.JOB_CLOSED,
});

export const AlreadyAppliedException = new ConflictException({
  message: 'Bạn đã nộp CV vào tin tuyển dụng này',
  code: ApplicationErrorCode.ALREADY_APPLIED,
});

export const JobNotFoundForHrException = new NotFoundException({
  message: 'Không tìm thấy tin tuyển dụng',
  code: ApplicationErrorCode.JOB_NOT_FOUND,
});

export const ApplicationNotFoundException = new NotFoundException({
  message: 'Không tìm thấy hồ sơ ứng tuyển',
  code: ApplicationErrorCode.APPLICATION_NOT_FOUND,
});

export const ApplicationForbiddenException = new ForbiddenException({
  message: 'Bạn không có quyền truy cập hồ sơ của tin tuyển dụng này',
  code: ApplicationErrorCode.APPLICATION_FORBIDDEN,
});

export const InvalidDecisionStatusException = new ConflictException({
  message: 'Chỉ có thể duyệt hoặc từ chối hồ sơ đang ở trạng thái SCREENED',
  code: ApplicationErrorCode.INVALID_DECISION_STATUS,
});

export const InvalidRescreenStatusException = new ConflictException({
  message: 'Chỉ có thể chấm lại hồ sơ đang ở trạng thái SCREENED hoặc SCREENING_FAILED',
  code: ApplicationErrorCode.INVALID_RESCREEN_STATUS,
});

/**
 * Lỗi do chính file CV (không đọc được chữ) → 422 để ứng viên sửa file rồi nộp lại.
 * `code` là một trong EMPTY | SCANNED | ENCRYPTED | CORRUPTED | TOO_MANY_PAGES;
 * thông báo lấy từ CV_EXTRACTION_MESSAGES_VI của @hireflow/ai để BE và FE thống nhất.
 */
export function toCvExtractionHttpException(
  error: CvExtractionError,
): UnprocessableEntityException {
  return new UnprocessableEntityException({
    message: error.messageVi,
    code: error.code,
  });
}
