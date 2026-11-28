import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

export enum InterviewEvaluationErrorCode {
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  INTERVIEW_NOT_FOUND = 'INTERVIEW_NOT_FOUND',
  INTERVIEW_FORBIDDEN = 'INTERVIEW_FORBIDDEN',
  INVALID_INTERVIEW_DECISION_STATUS = 'INVALID_INTERVIEW_DECISION_STATUS',
  INVALID_REEVALUATE_STATUS = 'INVALID_REEVALUATE_STATUS',
}

export const ApplicationNotFoundForInterviewException = new NotFoundException({
  code: InterviewEvaluationErrorCode.APPLICATION_NOT_FOUND,
  message: 'Không tìm thấy hồ sơ ứng tuyển',
});

export const InterviewNotFoundException = new NotFoundException({
  code: InterviewEvaluationErrorCode.INTERVIEW_NOT_FOUND,
  message: 'Không tìm thấy phiên phỏng vấn',
});

export const InterviewForbiddenException = new ForbiddenException({
  code: InterviewEvaluationErrorCode.INTERVIEW_FORBIDDEN,
  message: 'Bạn không có quyền truy cập thông tin phỏng vấn này',
});

export const InvalidInterviewDecisionStatusException = new ConflictException({
  code: InterviewEvaluationErrorCode.INVALID_INTERVIEW_DECISION_STATUS,
  message: 'Chỉ có thể quyết định Đạt/Không đạt khi hồ sơ đang ở trạng thái EVALUATED và chưa có quyết định cuối',
});

export const InvalidReEvaluateStatusException = new ConflictException({
  code: InterviewEvaluationErrorCode.INVALID_REEVALUATE_STATUS,
  message:
    'Chỉ có thể đánh giá lại khi HR chưa ra quyết định (phiên đang lỗi ở trạng thái INTERVIEWING hoặc đang ở EVALUATED)',
});
