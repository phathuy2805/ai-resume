import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import { COMPANY_LOGO_FILE_FIELD } from './company.constant.js';
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
      description: 'Không cập nhật logo ở đây; dùng POST /company/logo.',
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

export const ApiUploadCompanyLogoDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiConsumes('multipart/form-data'),
    // Khai báo trực tiếp type string + format binary để Swagger UI hiện nút chọn file.
    ApiBody({
      description: 'Ảnh logo JPG, PNG hoặc WebP (tối đa 2MB)',
      schema: {
        type: 'object',
        required: [COMPANY_LOGO_FILE_FIELD],
        properties: {
          [COMPANY_LOGO_FILE_FIELD]: {
            type: 'string',
            format: 'binary',
            description: 'Ảnh logo JPG, PNG hoặc WebP (tối đa 2MB)',
          },
        },
      },
    }),
    ApiOperation({
      summary: 'Tải lên / thay logo doanh nghiệp (HR hoặc Admin)',
      description:
        'Nhận ảnh JPG, PNG hoặc WebP (tối đa 2MB, kiểm tra theo magic bytes), lưu vào S3 private bucket, ' +
        'xoá logo cũ. Trả về thông tin doanh nghiệp với `logoUrl` mới.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật logo thành công',
      type: UpdateCompanyResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Thiếu file hoặc định dạng ảnh không hợp lệ' }),
    ApiPayloadTooLargeResponse({ description: 'Logo vượt quá giới hạn 2MB' }),
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({ description: 'Chỉ HR hoặc Admin mới được cập nhật' }),
    ApiNotFoundResponse({ description: 'Chưa cấu hình thông tin doanh nghiệp' }),
  );

export const ApiDeleteCompanyLogoDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Xoá logo doanh nghiệp (HR hoặc Admin, idempotent)' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đã xoá logo (logoUrl = null)',
      type: UpdateCompanyResDto,
    }) as MethodDecorator,
    ApiUnauthorizedResponse({ description: 'Thiếu access token hoặc token không hợp lệ' }),
    ApiForbiddenResponse({ description: 'Chỉ HR hoặc Admin mới được cập nhật' }),
    ApiNotFoundResponse({ description: 'Chưa cấu hình thông tin doanh nghiệp' }),
  );

export const ApiGetCompanyLogoDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xem logo doanh nghiệp (Công khai)',
      description:
        'Redirect 302 sang presigned URL của S3 (hiệu lực 1 giờ). Dùng trực tiếp làm `src` của thẻ <img>; ' +
        'tham số `v` chỉ để phá cache trình duyệt khi logo thay đổi.',
    }),
    ApiQuery({ name: 'v', required: false, description: 'Phiên bản logo (cache busting)' }),
    ApiFoundResponse({ description: 'Chuyển hướng tới ảnh logo trên S3' }),
    ApiNotFoundResponse({ description: 'Doanh nghiệp chưa có logo' }),
  );
