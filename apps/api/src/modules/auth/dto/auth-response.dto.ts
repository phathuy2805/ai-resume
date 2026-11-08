import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '../../../shared/constants/role.enum.js';

export const UserProfileResponseSchema = z.object({
  id: z.uuid().describe('ID người dùng (UUID)'),
  email: z.email().describe('Email người dùng'),
  fullName: z.string().describe('Họ và tên'),
  role: z.enum(Role).describe('Vai trò người dùng'),
  createdAt: z.string().describe('Thời điểm tạo tài khoản (ISO 8601)'),
});
export class UserProfileResponseDto extends createZodDto(
  UserProfileResponseSchema,
) {}

export const AuthResponseSchema = z.object({
  accessToken: z.string().describe('Access Token JWT'),
  refreshToken: z.string().describe('Refresh Token JWT'),
  user: UserProfileResponseSchema,
});
export class AuthResponseDto extends createZodDto(AuthResponseSchema) {}
