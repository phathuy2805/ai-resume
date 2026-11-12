import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { ApplicationDto } from './applications.dto.js';

export const ApiApplicationsController = () =>
  applyDecorators(ApiTags('Applications'));

export const ApiApplyJobDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Nộp CV ứng tuyển công việc (Multipart form-data, field: file)',
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
      description: 'Nộp hồ sơ thành công, đưa vào hàng đợi AI Screening',
      type: ApplicationDto,
    }) as MethodDecorator,
  );

export const ApiGetMyApplicationsDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Lấy danh sách các đơn ứng tuyển của chính ứng viên đăng nhập',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description:
        'Danh sách hồ sơ ứng tuyển của ứng viên (không trả cvText, cvKey)',
      type: [ApplicationDto],
    }) as MethodDecorator,
  );

