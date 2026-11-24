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
import {
  ApplicationDto,
  DecisionResDto,
  GetApplicationCvUrlResDto,
  GetApplicationDetailResDto,
  GetJobApplicationsResDto,
  GetJobStatsResDto,
  MyApplicationResDto,
  RescreenResDto,
} from './applications.dto.js';
import {
  AlreadyAppliedException,
  ApplicationForbiddenException,
  ApplicationNotFoundException,
  CvFileRequiredException,
  CvFileTooLargeException,
  CvInvalidFileTypeException,
  InvalidDecisionStatusException,
  InvalidRescreenStatusException,
  JobClosedException,
  JobNotFoundForApplyException,
  JobNotFoundForHrException,
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

export const ApiApplicationsController = () => applyDecorators(ApiTags('Applications'));

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
      description: 'Nộp hồ sơ thành công, trạng thái SUBMITTED (không trả cvText, cvS3Key)',
      type: ApplicationDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Thiếu file, file không phải PDF, hoặc job id không đúng định dạng UUID',
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
        'Danh sách hồ sơ (job, trạng thái, ngày nộp, interviewId nếu đã mời); không trả cvText, cvS3Key, link CV',
      type: [MyApplicationResDto],
    }) as MethodDecorator,
    UNAUTHORIZED,
    CANDIDATE_ONLY,
  );

const HR_ONLY = ApiForbiddenResponse({
  description: 'Chỉ HR sở hữu tin tuyển dụng mới được truy cập',
  examples: exampleOf(ApplicationForbiddenException),
});

export const ApiGetJobApplicationsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Danh sách hồ sơ ứng tuyển theo tin tuyển dụng (HR sở hữu job)',
      description:
        'Hỗ trợ lọc theo status, khoảng điểm minScore/maxScore, sắp xếp theo score hoặc createdAt và phân trang.',
    }),
    ApiParam({
      name: 'jobId',
      description: 'Mã định danh tin tuyển dụng (Job UUID)',
      example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Danh sách hồ sơ kèm phân trang',
      type: GetJobApplicationsResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Query filter hoặc jobId không hợp lệ',
    }),
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy tin tuyển dụng',
      examples: exampleOf(JobNotFoundForHrException),
    }),
  );

export const ApiGetApplicationDetailDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Chi tiết một hồ sơ ứng tuyển cho HR',
      description:
        'Bao gồm thông tin ứng viên, job (kèm cvPassThreshold), ScreeningResult, quyết định của HR và lịch sử trạng thái. Không trả cvText hay embedding.',
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Chi tiết hồ sơ ứng tuyển',
      type: GetApplicationDetailResDto,
    }) as MethodDecorator,
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ',
      examples: exampleOf(ApplicationNotFoundException),
    }),
  );

export const ApiDecideApplicationDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'HR duyệt hoặc loại hồ sơ sau vòng sàng lọc CV',
      description:
        'Chỉ nhận khi hồ sơ đang ở trạng thái SCREENED. APPROVE sẽ chuyển SHORTLISTED -> tạo Interview -> INTERVIEW_INVITED trong cùng transaction; REJECT chuyển sang REJECTED.',
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật quyết định thành công',
      type: DecisionResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Dữ liệu quyết định hoặc ID không hợp lệ',
    }),
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ',
      examples: exampleOf(ApplicationNotFoundException),
    }),
    ApiConflictResponse({
      description: 'Hồ sơ không ở trạng thái SCREENED',
      examples: exampleOf(InvalidDecisionStatusException),
    }),
  );

export const ApiRescreenApplicationDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'HR yêu cầu AI chấm lại CV',
      description:
        'Chỉ nhận khi hồ sơ đang ở trạng thái SCREENED hoặc SCREENING_FAILED. Chuyển ngay sang SCREENING, xóa screeningError và đưa vào hàng đợi chấm nền; kết quả chấm mới ghi đè kết quả cũ. FE theo dõi trạng thái bằng cách tải lại danh sách / chi tiết.',
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Đã nhận yêu cầu chấm lại, hồ sơ đang ở SCREENING',
      type: RescreenResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'ID không hợp lệ',
    }),
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ',
      examples: exampleOf(ApplicationNotFoundException),
    }),
    ApiConflictResponse({
      description: 'Hồ sơ không ở trạng thái SCREENED hoặc SCREENING_FAILED',
      examples: exampleOf(InvalidRescreenStatusException),
    }),
  );

export const ApiGetJobStatsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Thống kê hồ sơ ứng tuyển theo tin tuyển dụng (HR sở hữu job)',
      description:
        'Trả số lượng theo trạng thái, phân bố điểm theo khoảng 10, phân bố AI recommendation, tỷ lệ AI đề xuất đạt và tỷ lệ HR đồng ý với AI.',
    }),
    ApiParam({
      name: 'jobId',
      description: 'Mã định danh tin tuyển dụng (Job UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Số liệu thống kê của job',
      type: GetJobStatsResDto,
    }) as MethodDecorator,
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy tin tuyển dụng',
      examples: exampleOf(JobNotFoundForHrException),
    }),
  );

export const ApiGetApplicationCvUrlDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Tạo link presigned S3 tạm thời để xem/tải CV của ứng viên (10 phút)',
    }),
    ApiParam({
      name: 'id',
      description: 'Mã định danh hồ sơ (Application UUID)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Link presigned S3 kèm thời gian hết hạn',
      type: GetApplicationCvUrlResDto,
    }) as MethodDecorator,
    UNAUTHORIZED,
    HR_ONLY,
    ApiNotFoundResponse({
      description: 'Không tìm thấy hồ sơ',
      examples: exampleOf(ApplicationNotFoundException),
    }),
  );
