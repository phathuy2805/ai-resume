import { createZodDto } from 'nestjs-zod';
import {
  GetProfileResSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutResSchema,
  RefreshTokenBodySchema,
  RefreshTokenResSchema,
  RegisterBodySchema,
  RegisterResSchema,
} from './auth.schema.js';

export class RegisterBodyDto extends createZodDto(RegisterBodySchema) {}
export class LoginBodyDto extends createZodDto(LoginBodySchema) {}
export class RefreshTokenBodyDto extends createZodDto(RefreshTokenBodySchema) {}

export class RegisterResDto extends createZodDto(RegisterResSchema) {}
export class LoginResDto extends createZodDto(LoginResSchema) {}
export class GetProfileResDto extends createZodDto(GetProfileResSchema) {}
export class RefreshTokenResDto extends createZodDto(RefreshTokenResSchema) {}
export class LogoutResDto extends createZodDto(LogoutResSchema) {}
