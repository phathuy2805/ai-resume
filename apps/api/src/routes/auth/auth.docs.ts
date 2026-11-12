import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  AuthResponseDto,
  LogoutResponseDto,
  UserProfileResponseDto,
} from './auth.dto.js';

export const ApiAuthController = () => applyDecorators(ApiTags('Auth'));

export const ApiRegisterDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng ký tài khoản mới (HR hoặc CANDIDATE)' }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description: 'Đăng ký thành công',
      type: AuthResponseDto,
    }) as MethodDecorator,
  );

export const ApiLoginDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng nhập vào hệ thống' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đăng nhập thành công',
      type: AuthResponseDto,
    }) as MethodDecorator,
  );

export const ApiGetProfileDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Thông tin tài khoản cá nhân',
      type: UserProfileResponseDto,
    }) as MethodDecorator,
  );

export const ApiRefreshTokenDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cấp token mới thành công',
      type: AuthResponseDto,
    }) as MethodDecorator,
  );

export const ApiLogoutDoc = () =>
  applyDecorators(
    ApiOperation({ summary: 'Đăng xuất khỏi hệ thống' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đăng xuất thành công',
      type: LogoutResponseDto,
    }) as MethodDecorator,
  );

