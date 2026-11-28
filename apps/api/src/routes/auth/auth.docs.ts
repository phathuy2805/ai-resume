import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';
import {
  GetProfileResDto,
  LoginResDto,
  LogoutResDto,
  MessageResDto,
  RefreshTokenResDto,
  RegisterResDto,
  UpdateProfileResDto,
  UploadAvatarFileDto,
} from './auth.dto.js';

export const ApiAuthController = () => applyDecorators(ApiTags('Auth'));

export const ApiRegisterDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Đăng ký tài khoản ứng viên mới (CANDIDATE)',
      description:
        'Chỉ cho phép tự đăng ký tài khoản ứng viên (`CANDIDATE`); không cho phép tự đăng ký tài khoản `HR`/`ADMIN`. Đồng thời cấp httpOnly cookie `refresh_token` để client có thể gọi `/api/auth/refresh` lấy `accessToken` ngay.',
    }),
    ZodResponse({
      status: HttpStatus.CREATED,
      description: 'Đăng ký tài khoản ứng viên thành công',
      type: RegisterResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Dữ liệu đầu vào không hợp lệ hoặc cố tự đăng ký vai trò khác CANDIDATE',
    }),
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
      description: 'Thông tin tài khoản cá nhân (kèm avatarUrl nếu có)',
      type: GetProfileResDto,
    }) as MethodDecorator,
    ApiUnauthorizedResponse({
      description: 'Thiếu access token, token không hợp lệ hoặc người dùng không tồn tại',
    }),
  );

export const ApiUpdateProfileDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Cập nhật hồ sơ cá nhân (fullName, phone, bio)',
      description: 'Cập nhật một hoặc nhiều trường hồ sơ của tài khoản đang đăng nhập.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật hồ sơ thành công',
      type: UpdateProfileResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ' }),
    ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc token không hợp lệ' }),
  );

export const ApiUploadAvatarDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiConsumes('multipart/form-data'),
    ApiBody({ type: UploadAvatarFileDto }),
    ApiOperation({
      summary: 'Cập nhật ảnh đại diện',
      description:
        'Tải ảnh JPG, PNG hoặc WebP (tối đa 2MB) lên S3 Private Bucket và trả về thông tin user kèm `avatarUrl` (presigned URL hiệu lực 1 giờ).',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Cập nhật ảnh đại diện thành công',
      type: UpdateProfileResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Thiếu file hoặc định dạng ảnh không hợp lệ' }),
    ApiPayloadTooLargeResponse({ description: 'Ảnh đại diện vượt quá giới hạn 2MB' }),
    ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc token không hợp lệ' }),
  );

export const ApiDeleteAvatarDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Xóa ảnh đại diện hiện tại' }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Xóa ảnh đại diện thành công',
      type: UpdateProfileResDto,
    }) as MethodDecorator,
    ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc token không hợp lệ' }),
  );

export const ApiChangePasswordDoc = () =>
  applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({
      summary: 'Đổi mật khẩu (khi đang đăng nhập)',
      description:
        'Xác thực mật khẩu hiện tại, cập nhật mật khẩu mới, thu hồi các phiên refresh token trên thiết bị khác và cấp lại cookie mới cho thiết bị hiện tại.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đổi mật khẩu thành công',
      type: MessageResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Mật khẩu hiện tại không đúng hoặc mật khẩu mới trùng mật khẩu cũ',
    }),
    ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc token không hợp lệ' }),
  );

export const ApiForgotPasswordDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Yêu cầu mã OTP 6 chữ số đặt lại mật khẩu',
      description:
        'Gửi mã OTP 6 số (hiệu lực 10 phút) qua AWS SES (hoặc in ra console ở dev). Luôn trả về thông báo chung để tránh lộ danh sách email đã đăng ký.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đã tiếp nhận yêu cầu gửi mã OTP',
      type: MessageResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({ description: 'Email không đúng định dạng' }),
  );

export const ApiResetPasswordDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xác thực mã OTP và đặt lại mật khẩu mới',
      description:
        'Kiểm tra OTP 6 số (tối đa 5 lần nhập sai), cập nhật mật khẩu mới và thu hồi toàn bộ refresh token cũ.',
    }),
    ZodResponse({
      status: HttpStatus.OK,
      description: 'Đặt lại mật khẩu thành công',
      type: MessageResDto,
    }) as MethodDecorator,
    ApiBadRequestResponse({
      description: 'Mã OTP không đúng, đã hết hạn hoặc vượt quá số lần thử',
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
