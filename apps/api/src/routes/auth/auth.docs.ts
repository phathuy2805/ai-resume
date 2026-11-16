import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  GetProfileResDto,
  LoginResDto,
  LogoutResDto,
  RefreshTokenResDto,
  RegisterResDto,
} from './auth.dto.js';

export const ApiAuthController = () => applyDecorators(ApiTags('Auth'));

export const ApiRegisterDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Đăng ký tài khoản mới (HR hoặc CANDIDATE)',
      description:
        'Tạo tài khoản mới, đồng thời cấp httpOnly cookie `refresh_token` để client có thể gọi `/api/auth/refresh` lấy `accessToken` ngay.',
    }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description: 'Đăng ký thành công',
      type: RegisterResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ' }),
    ApiConflictResponse({ description: 'Email đã được sử dụng' }),
  );

export const ApiLoginDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Đăng nhập vào hệ thống',
      description: 'Trả về `accessToken` + thông tin user và gắn `refresh_token` vào httpOnly cookie.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đăng nhập thành công',
      type: LoginResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Email hoặc mật khẩu không đúng' }),
  );

export const ApiGetProfileDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Thông tin tài khoản cá nhân',
      type: GetProfileResDto,
    }) as MethodDecorator,
    ApiUnauthorizedResponse({
      description: 'Thiếu access token, token không hợp lệ hoặc người dùng không tồn tại',
    }),
  );

export const ApiRefreshTokenDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Làm mới Access Token bằng Refresh Token',
      description:
        'Đọc `refresh_token` từ httpOnly cookie (hoặc body), xoay vòng token mới và cập nhật cookie.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cấp token mới thành công',
      type: RefreshTokenResDto,
    }) as MethodDecorator,
    ApiUnauthorizedResponse({
      description: 'Thiếu refresh token, token không hợp lệ, hết hạn hoặc đã bị thu hồi',
    }),
  );

export const ApiLogoutDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Đăng xuất khỏi hệ thống',
      description: 'Thu hồi `refresh_token` trong database và xóa cookie `refresh_token`.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đăng xuất thành công',
      type: LogoutResDto,
    }) as MethodDecorator,
  );
