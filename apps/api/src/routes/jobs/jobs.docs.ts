import { applyDecorators, HttpStatus } from '@nestjs/common';
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
  CloseJobResDto,
  CreateJobResDto,
  GetJobResDto,
  GetJobsResDto,
  GetMyJobsResDto,
  UpdateJobResDto,
} from './jobs.dto.js';

const JOB_ID_PARAM = ApiParam({
  name: 'id',
  description: 'Job UUID',
  example: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
});

export const ApiJobsController = () => applyDecorators(ApiTags('Jobs'));

export const ApiFindAllJobsDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Lấy danh sách việc làm đang mở (Công khai)' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Danh sách công việc đang mở kèm phân trang',
      type: GetJobsResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Tham số phân trang hoặc tìm kiếm không hợp lệ' }),
  );

export const ApiFindMyJobsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Lấy danh sách việc làm do HR đang đăng nhập tạo (kèm số hồ sơ)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Danh sách việc làm của HR kèm phân trang và applicationCount',
      type: GetMyJobsResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Tham số phân trang hoặc lọc trạng thái không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({ description: 'Chỉ tài khoản HR mới được truy cập' }),
  );

export const ApiFindOneJobDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xem chi tiết một tin tuyển dụng đang mở theo ID',
    }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Chi tiết tin tuyển dụng',
      type: GetJobResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'ID tin tuyển dụng không đúng định dạng UUID' }),
    ApiNotFoundResponse({
      description: 'Tin tuyển dụng không tồn tại hoặc đã đóng',
    }),
  );

export const ApiCreateJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Tạo tin tuyển dụng mới (Yêu cầu tài khoản HR)' }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description: 'Tạo việc làm thành công',
      type: CreateJobResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({ description: 'Chỉ tài khoản HR mới được tạo tin' }),
  );

export const ApiUpdateJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Cập nhật tin tuyển dụng theo ID (Chủ sở hữu HR)',
    }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật việc làm thành công',
      type: UpdateJobResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'ID không phải UUID hoặc dữ liệu cập nhật không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({
      description: 'Không phải chủ sở hữu tin tuyển dụng hoặc không phải HR',
    }),
    ApiNotFoundResponse({ description: 'Không tìm thấy tin tuyển dụng' }),
    ApiConflictResponse({
      description: 'Không thể chỉnh sửa tin tuyển dụng đã đóng',
    }),
  );

export const ApiCloseJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Đóng tin tuyển dụng (chuyển status sang CLOSED, idempotent)',
    }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đóng tin tuyển dụng thành công',
      type: CloseJobResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'ID tin tuyển dụng không đúng định dạng UUID' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({
      description: 'Không phải chủ sở hữu tin tuyển dụng hoặc không phải HR',
    }),
    ApiNotFoundResponse({ description: 'Không tìm thấy tin tuyển dụng' }),
  );
