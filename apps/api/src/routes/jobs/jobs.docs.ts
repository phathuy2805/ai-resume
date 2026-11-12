import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { JobListResponseDto, JobResponseDto } from './jobs.dto.js';

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
      description: 'Danh sách công việc kèm phân trang',
      type: JobListResponseDto,
    }) as MethodDecorator,
  );

export const ApiFindMyJobsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Lấy danh sách việc làm do HR đang đăng nhập tạo' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Danh sách việc làm của HR',
      type: [JobResponseDto],
    }) as MethodDecorator,
  );

export const ApiFindOneJobDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Xem chi tiết một tin tuyển dụng theo ID' }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Chi tiết tin tuyển dụng',
      type: JobResponseDto,
    }) as MethodDecorator,
  );

export const ApiCreateJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Tạo tin tuyển dụng mới (Yêu cầu tài khoản HR)' }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description: 'Tạo việc làm thành công',
      type: JobResponseDto,
    }) as MethodDecorator,
  );

export const ApiUpdateJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Cập nhật tin tuyển dụng theo ID' }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật việc làm thành công',
      type: JobResponseDto,
    }) as MethodDecorator,
  );

export const ApiCloseJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Đóng tin tuyển dụng (chuyển status sang CLOSED)' }),
    JOB_ID_PARAM,
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đóng tin tuyển dụng thành công',
      type: JobResponseDto,
    }) as MethodDecorator,
  );

