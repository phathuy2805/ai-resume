import { z } from 'zod';
import { Role } from '../../shared/constants/role.enum.js';
import { PublicUserSchema, UserSchema } from '../../shared/models/user.model.js';

// ==================== Request Schemas (Body / Param / Query) ====================

export const RegisterBodySchema = UserSchema.pick({
  email: true,
  fullName: true,
}).extend({
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').describe('Mật khẩu người dùng'),
  role: z.enum([Role.CANDIDATE, Role.HR]).describe('Vai trò trong hệ thống (HR hoặc CANDIDATE)'),
});

export const LoginBodySchema = UserSchema.pick({
  email: true,
}).extend({
  password: z.string().min(1, 'Mật khẩu không được để trống').describe('Mật khẩu'),
});

export const RefreshTokenBodySchema = z
  .object({
    refreshToken: z
      .string()
      .min(1)
      .optional()
      .describe('Refresh Token JWT (tuỳ chọn nếu gửi qua httpOnly cookie)'),
  })
  .prefault({});

// ==================== Response Schemas ====================

export const RegisterResSchema = PublicUserSchema;

export const LoginResSchema = z.object({
  accessToken: z.string().describe('Access Token JWT'),
  user: PublicUserSchema,
});

export const GetProfileResSchema = PublicUserSchema;

export const RefreshTokenResSchema = LoginResSchema;

export const LogoutResSchema = z.object({
  message: z.string().describe('Thông báo kết quả đăng xuất'),
});

// ==================== Inferred Types ====================

export type RegisterBodyType = z.infer<typeof RegisterBodySchema>;
export type LoginBodyType = z.infer<typeof LoginBodySchema>;
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>;
export type RegisterResType = z.infer<typeof RegisterResSchema>;
export type LoginResType = z.infer<typeof LoginResSchema>;
export type GetProfileResType = z.infer<typeof GetProfileResSchema>;
export type RefreshTokenResType = z.infer<typeof RefreshTokenResSchema>;
export type LogoutResType = z.infer<typeof LogoutResSchema>;
