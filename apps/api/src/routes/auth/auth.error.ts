import { ConflictException, UnauthorizedException } from '@nestjs/common';

export const EmailAlreadyExistsException = new ConflictException({
  message: 'Email đã được sử dụng',
  errors: ['email: Email đã được sử dụng'],
});

export const InvalidCredentialsException = new UnauthorizedException(
  'Email hoặc mật khẩu không đúng',
);

export const UserNotFoundException = new UnauthorizedException('Người dùng không tồn tại');

export const MissingRefreshTokenException = new UnauthorizedException('Thiếu refresh token');

export const InvalidRefreshTokenException = new UnauthorizedException(
  'Refresh token không hợp lệ hoặc đã hết hạn',
);

export const RefreshTokenNotFoundException = new UnauthorizedException(
  'Refresh token không tồn tại',
);

export const RefreshTokenRevokedException = new UnauthorizedException(
  'Refresh token đã bị thu hồi, vui lòng đăng nhập lại',
);

export const RefreshTokenExpiredException = new UnauthorizedException('Refresh token đã hết hạn');
