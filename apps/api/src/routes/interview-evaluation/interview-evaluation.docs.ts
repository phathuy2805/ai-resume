import { applyDecorators, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  GetApplicationInterviewResDto,
  GetCandidateFeedbackResDto,
  InterviewDecisionResDto,
  ReEvaluateInterviewResDto,
} from './interview-evaluation.dto.js';
import {
  ApplicationNotFoundForInterviewException,
  InterviewForbiddenException,
  InterviewNotFoundException,
  InvalidInterviewDecisionStatusException,
  InvalidReEvaluateStatusException,
} from './interview-evaluation.error.js';

const EXAMPLE_TIMESTAMP = '2026-11-28T03:00:00.000Z';

function errorBody(statusCode: number, code: string, message: string) {
  return { statusCode, message, code, timestamp: EXAMPLE_TIMESTAMP };
}

function exampleOf(exception: HttpException) {
  const { message, code } = exception.getResponse() as {
    message: string;
    code: string;
  };
  return {
    [code]: {
      summary: message,
      value: errorBody(exception.getStatus(), code, message),
    },
  };
}

const UNAUTHORIZED = ApiUnauthorizedResponse({
  description: 'Thiếu access token hoặc token không hợp lệ',
});

const HR_FORBIDDEN = ApiForbiddenResponse({
  description: 'Chỉ HR sở hữu tin tuyển dụng mới được truy cập',
  examples: exampleOf(InterviewForbiddenException),
});

const CANDIDATE_FORBIDDEN = ApiForbiddenResponse({
  description: 'Chỉ ứng viên sở hữu hồ sơ mới được truy cập',
  examples: exampleOf(InterviewForbiddenException),
});

export const ApiInterviewEvaluationController = () => applyDecorators(ApiTags('Interviews'));

export const ApiGetApplicationInterviewDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Xem chi tiết phiên phỏng vấn và kết quả AI đánh giá (HR sở hữu job)',
      description: [
        'Trả danh sách lượt hỏi đáp (kèm nguồn VOICE/TEXT, transcriptStatus, askedAt, answeredAt, durationSec, isEmpty, link presigned audioUrl để nghe lại).',
        'Trả điểm 4 tiêu chí, totalScore, passThreshold, rubricWeights, nhận xét tổng quan, trích dẫn bằng chứng từng tiêu chí, aiRecommendation (PASS/REJECT), quyết định của HR, evaluationError và phase/hạn của phiên.',
      ].join('\n\n'),
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ ứng tuyển (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Chi tiết phiên phỏng vấn và kết quả đánh giá',
      type: GetApplicationInterviewResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Application ID không đúng định dạng UUID',
    }),
    UNAUTHORIZED,
    HR_FORBIDDEN,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ hoặc hồ sơ chưa có phiên phỏng vấn',
      examples: {
        ...exampleOf(ApplicationNotFoundForInterviewException),
        ...exampleOf(InterviewNotFoundException),
      },
    }),
  );

export const ApiDecideInterviewDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'HR ra quyết định Đạt/Không đạt vòng phỏng vấn sơ bộ',
      description: [
        'Chỉ nhận khi hồ sơ đang ở trạng thái EVALUATED và chưa có quyết định cuối.',
        'Quyết định là cuối cùng, không hoàn tác: PASS chuyển sang PASSED, FAIL chuyển sang FAILED và phát sự kiện application.status_changed để gửi email cho ứng viên.',
        'note là ghi chú nội bộ (không gửi ứng viên); candidateMessage là lời nhắn tùy chọn tối đa 500 ký tự hiển thị tại trang phản hồi và email.',
      ].join('\n\n'),
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ ứng tuyển (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Lưu quyết định vòng phỏng vấn thành công',
      type: InterviewDecisionResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Dữ liệu quyết định hoặc ID không hợp lệ',
    }),
    UNAUTHORIZED,
    HR_FORBIDDEN,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ hoặc phiên phỏng vấn',
      examples: {
        ...exampleOf(ApplicationNotFoundForInterviewException),
        ...exampleOf(InterviewNotFoundException),
      },
    }),
    ApiConflictResponse({
      description: 'Hồ sơ không ở trạng thái EVALUATED hoặc HR đã ra quyết định trước đó',
      examples: exampleOf(InvalidInterviewDecisionStatusException),
    }),
  );

export const ApiReEvaluateInterviewDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'HR yêu cầu chạy lại nhận dạng câu lỗi và AI đánh giá lại phiên phỏng vấn',
      description: [
        'Chỉ cho phép khi HR chưa ra quyết định: phiên đang ở INTERVIEWING có evaluationError, hoặc đang ở EVALUATED chưa quyết định.',
        'Xóa evaluationError và đưa phiên vào chạy nền (nhận dạng lại các câu FAILED rồi chấm lại).',
      ].join('\n\n'),
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh phiên phỏng vấn (Interview UUID)',
    }),
    ZodResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Đã tiếp nhận yêu cầu đánh giá lại ở nền',
      type: ReEvaluateInterviewResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Interview ID không đúng định dạng UUID',
    }),
    UNAUTHORIZED,
    HR_FORBIDDEN,
    ApiNotFoundResponse({
      description: 'Không tìm thấy phiên phỏng vấn',
      examples: exampleOf(InterviewNotFoundException),
    }),
    ApiConflictResponse({
      description: 'Phiên phỏng vấn đã có quyết định cuối hoặc chưa đủ điều kiện đánh giá lại',
      examples: exampleOf(InvalidReEvaluateStatusException),
    }),
  );

export const ApiGetCandidateFeedbackDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Ứng viên xem phản hồi sau quyết định của HR (vòng CV bị loại hoặc vòng phỏng vấn)',
      description: [
        'Dùng chung cho 2 vòng: PASSED/FAILED trả stage=INTERVIEW; REJECTED trả stage=CV.',
        'feedback = null nghĩa là phản hồi đang được chuẩn bị. Không bao giờ trả điểm số, đề xuất AI, ngưỡng điểm hay ghi chú nội bộ.',
        'Các trạng thái chưa có kết quả cuối chỉ trả { status }.',
      ].join('\n\n'),
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ ứng tuyển (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Phản hồi gửi ứng viên (không chứa điểm hay ghi chú nội bộ)',
      type: GetCandidateFeedbackResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Application ID không đúng định dạng UUID',
    }),
    UNAUTHORIZED,
    CANDIDATE_FORBIDDEN,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ ứng tuyển',
      examples: exampleOf(ApplicationNotFoundForInterviewException),
    }),
  );
