import { z } from 'zod';
import { Role } from '../../shared/constants/role.enum.js';
import { UserSchema } from '../../shared/models/user.model.js';

export const RegisterSchema = UserSchema.pick({
  email: true,
  fullName: true,
}).extend({
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .describe('Mật khẩu người dùng'),
  role: z
    .enum([Role.CANDIDATE, Role.HR])
    .describe('Vai trò trong hệ thống (HR hoặc CANDIDATE)'),
});

export const LoginSchema = UserSchema.pick({
  email: true,
}).extend({
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .describe('Mật khẩu'),
});

export const RefreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .min(1)
      .optional()
      .describe('Refresh Token JWT (tuỳ chọn nếu gửi qua httpOnly cookie)'),
  })
  .prefault({});

export const UserProfileResponseSchema = UserSchema;

export const AuthResponseSchema = z.object({
  accessToken: z.string().describe('Access Token JWT'),
  refreshToken: z.string().describe('Refresh Token JWT'),
  user: UserProfileResponseSchema,
});

export const LogoutResponseSchema = z.object({
  message: z.string().describe('Thông báo kết quả đăng xuất'),
});

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type RefreshTokenBody = z.infer<typeof RefreshTokenSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

