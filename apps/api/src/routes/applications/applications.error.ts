import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
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
