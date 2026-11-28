import { createZodDto } from 'nestjs-zod';
import {
  ChangePasswordBodySchema,
  ForgotPasswordBodySchema,
  GetProfileResSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutResSchema,
  MessageResSchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  ResetPasswordBodySchema,
  UpdateProfileBodySchema,
  UpdateProfileResSchema,
  UploadAvatarFileSchema,
} from './auth.schema.js';

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}
export class LoginBodyDto extends createZodDto(LoginBodySchema) {}
export class RefreshTokenBodyDto extends createZodDto(RefreshTokenBodySchema) {}
export class UpdateProfileBodyDto extends createZodDto(UpdateProfileBodySchema) {}
export class ChangePasswordBodyDto extends createZodDto(ChangePasswordBodySchema) {}
export class ForgotPasswordBodyDto extends createZodDto(ForgotPasswordBodySchema) {}
export class ResetPasswordBodyDto extends createZodDto(ResetPasswordBodySchema) {}
export class UploadAvatarFileDto extends createZodDto(UploadAvatarFileSchema) {}

export class RegisterResDto extends createZodDto(RegisterResSchema) {}
export class LoginResDto extends createZodDto(LoginResSchema) {}
export class GetProfileResDto extends createZodDto(GetProfileResSchema) {}
export class UpdateProfileResDto extends createZodDto(UpdateProfileResSchema) {}
export class RefreshTokenResDto extends createZodDto(RefreshTokenResSchema) {}
export class LogoutResDto extends createZodDto(LogoutResSchema) {}
export class MessageResDto extends createZodDto(MessageResSchema) {}
