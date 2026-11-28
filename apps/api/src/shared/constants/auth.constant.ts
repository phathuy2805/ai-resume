export enum Role {
  HR = 'HR',
  CANDIDATE = 'CANDIDATE',
  ADMIN = 'ADMIN',
}

export const BCRYPT_SALT_ROUNDS = 10;

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/auth';

export const PASSWORD_RESET_OTP_LENGTH = 6;
export const PASSWORD_RESET_OTP_TTL_MINUTES = 10;
export const PASSWORD_RESET_OTP_MAX_ATTEMPTS = 5;

export const AVATAR_FILE_FIELD = 'file';
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
