import { CV_EXTRACTION_MESSAGES_VI } from '@hireflow/ai';
import { applyDecorators, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApplicationDto } from './applications.dto.js';
import {
  AlreadyAppliedException,
  CvFileRequiredException,
  CvFileTooLargeException,
  CvInvalidFileTypeException,
  JobClosedException,
  JobNotFoundForApplyException,
} from './applications.error.js';

const EXAMPLE_TIMESTAMP = '2026-11-18T03:00:00.000Z';

/** Body lỗi mẫu đúng format của HttpExceptionFilter. */
function errorBody(statusCode: number, code: string, message: string) {
  return { statusCode, message, code, timestamp: EXAMPLE_TIMESTAMP };
}

/** Ví dụ lấy thẳng từ exception để Swagger luôn khớp với thông báo thật. */
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

const CV_EXTRACTION_EXAMPLES = Object.fromEntries(
  Object.entries(CV_EXTRACTION_MESSAGES_VI).map(([code, message]) => [
    code,
    {
      summary: message,
      value: errorBody(HttpStatus.UNPROCESSABLE_ENTITY, code, message),
    },
  ]),
);

const UNAUTHORIZED = ApiUnauthorizedResponse({
  description: 'Thiếu access token hoặc token không hợp lệ',
});
const CANDIDATE_ONLY = ApiForbiddenResponse({
  description: 'Chỉ tài khoản ứng viên (CANDIDATE) mới được gọi',
});

export const ApiApplicationsController = () =>
  applyDecorators(ApiTags('Applications'));

export const ApiApplyJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Ứng viên nộp CV vào một tin tuyển dụng',
      description: [
        'Multipart form-data, field `file`: 1 file PDF, tối đa 5MB.',
        'CV được trích chữ ngay khi nộp; CV không đọc được (ảnh scan, có mật khẩu, hỏng...) bị từ chối với mã 422 để ứng viên nộp lại.',
        'Lỗi có trường `code` để FE hiển thị thông báo theo mã.',
      ].join('\n\n'),
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh công việc (Job UUID)',
      example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      description: 'Tệp CV định dạng PDF (dung lượng tối đa 5MB)',
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Tệp CV PDF tải lên (dung lượng tối đa 5MB)',
          },
        },
      },
    }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description:
        'Nộp hồ sơ thành công, trạng thái SUBMITTED (không trả cvText, cvS3Key)',
      type: ApplicationDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description:
        'Thiếu file, file không phải PDF, hoặc job id không đúng định dạng UUID',
      examples: {
        ...exampleOf(CvFileRequiredException),
        ...exampleOf(CvInvalidFileTypeException),
      },
    }),
    UNAUTHORIZED,
    CANDIDATE_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy tin tuyển dụng',
      examples: exampleOf(JobNotFoundForApplyException),
    }),
    ApiConflictResponse({
      description: 'Tin tuyển dụng đã đóng, hoặc ứng viên đã nộp vào tin này',
      examples: {
        ...exampleOf(JobClosedException),
        ...exampleOf(AlreadyAppliedException),
      },
    }),
    ApiPayloadTooLargeResponse({
      description: 'File lớn hơn 5MB',
      examples: exampleOf(CvFileTooLargeException),
    }),
    ApiUnprocessableEntityResponse({
      description:
        'Không đọc được chữ trong CV. `code`: EMPTY | SCANNED | ENCRYPTED | CORRUPTED | TOO_MANY_PAGES',
      examples: CV_EXTRACTION_EXAMPLES,
    }),
  );

export const ApiGetMyApplicationsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Danh sách hồ sơ ứng tuyển của chính ứng viên đăng nhập',
      description:
        'Mới nhất trước, không phân trang. FE dùng để đánh dấu "Đã nộp" ở danh sách và chi tiết job.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description:
        'Danh sách hồ sơ (job, trạng thái, ngày nộp); không trả cvText, cvS3Key, link CV',
      type: [ApplicationDto],
    }) as MethodDecorator,
    UNAUTHORIZED,
    CANDIDATE_ONLY,
  );
