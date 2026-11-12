import { createZodDto } from 'nestjs-zod';
import {
  AuthResponseSchema,
  LoginSchema,
  LogoutResponseSchema,
  RefreshTokenSchema,
  RegisterSchema,
  UserProfileResponseSchema,
} from './auth.schema.js';

export class RegisterDto extends createZodDto(RegisterSchema) {}
export class LoginDto extends createZodDto(LoginSchema) {}
export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
export class UserProfileResponseDto extends createZodDto(
  UserProfileResponseSchema,
) {}
export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}
export class LogoutResponseDto extends createZodDto(LogoutResponseSchema) {}

