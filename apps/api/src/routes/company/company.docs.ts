import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { GetCompanyResDto, UpdateCompanyResDto } from './company.dto.js';

export const ApiCompanyController = () => applyDecorators(ApiTags('Company'));

export const ApiGetCompanyDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Lấy thông tin doanh nghiệp tuyển dụng (Công khai)' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Thông tin doanh nghiệp',
      type: GetCompanyResDto,
    }) as MethodDecorator,
    ApiNotFoundResponse({ description: 'Chưa cấu hình thông tin doanh nghiệp' }),
  );

export const ApiUpdateCompanyDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Cập nhật thông tin doanh nghiệp (HR hoặc Admin, cập nhật từng phần)',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật thông tin doanh nghiệp thành công',
      type: UpdateCompanyResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Dữ liệu cập nhật không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({ description: 'Chỉ HR hoặc Admin mới được cập nhật' }),
    ApiNotFoundResponse({ description: 'Chưa cấu hình thông tin doanh nghiệp' }),
  );
