import {
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';

export enum AuthErrorCode {
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_CURRENT_PASSWORD = 'INVALID_CURRENT_PASSWORD',
  SAME_AS_CURRENT_PASSWORD = 'SAME_AS_CURRENT_PASSWORD',
  OTP_INVALID_OR_EXPIRED = 'OTP_INVALID_OR_EXPIRED',
  OTP_TOO_MANY_ATTEMPTS = 'OTP_TOO_MANY_ATTEMPTS',
  AVATAR_FILE_REQUIRED = 'AVATAR_FILE_REQUIRED',
  AVATAR_INVALID_FILE_TYPE = 'AVATAR_INVALID_FILE_TYPE',
  AVATAR_FILE_TOO_LARGE = 'AVATAR_FILE_TOO_LARGE',
}

export const EmailAlreadyExistsException = new ConflictException({
  code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
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

export const InvalidCurrentPasswordException = new BadRequestException({
  code: AuthErrorCode.INVALID_CURRENT_PASSWORD,
  message: 'Mật khẩu hiện tại không đúng',
});

export const SameAsCurrentPasswordException = new BadRequestException({
  code: AuthErrorCode.SAME_AS_CURRENT_PASSWORD,
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
});

export const OtpInvalidOrExpiredException = new BadRequestException({
  code: AuthErrorCode.OTP_INVALID_OR_EXPIRED,
  message: 'Mã OTP không đúng hoặc đã hết hạn',
});

export const OtpTooManyAttemptsException = new BadRequestException({
  code: AuthErrorCode.OTP_TOO_MANY_ATTEMPTS,
  message: 'Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng yêu cầu mã mới.',
});

export const AvatarFileRequiredException = new BadRequestException({
  code: AuthErrorCode.AVATAR_FILE_REQUIRED,
  message: 'Vui lòng chọn ảnh đại diện để tải lên',
});

export const AvatarInvalidFileTypeException = new BadRequestException({
  code: AuthErrorCode.AVATAR_INVALID_FILE_TYPE,
  message: 'Ảnh đại diện chỉ hỗ trợ định dạng JPG, PNG hoặc WebP',
});

export const AvatarFileTooLargeException = new PayloadTooLargeException({
  code: AuthErrorCode.AVATAR_FILE_TOO_LARGE,
  message: 'Ảnh đại diện có dung lượng tối đa 2MB',
});
