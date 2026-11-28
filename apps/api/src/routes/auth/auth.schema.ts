import { z } from 'zod';
import { PASSWORD_RESET_OTP_LENGTH, Role } from '../../shared/constants/auth.constant.js';
import { PublicUserSchema, UserSchema } from '../../shared/models/user.model.js';

const PasswordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(128, 'Mật khẩu tối đa 128 ký tự');

const OptionalPhoneSchema = z
  .string()
  .trim()
  .max(20, 'Số điện thoại tối đa 20 ký tự')
  .transform((value) => (value.length === 0 ? null : value));

const OptionalBioSchema = z
  .string()
  .trim()
  .max(500, 'Giới thiệu bản thân tối đa 500 ký tự')
  .transform((value) => (value.length === 0 ? null : value));

export const RegisterBodySchema = UserSchema.pick({
  email: true,
  fullName: true,
}).extend({
  password: PasswordSchema.describe('Mật khẩu người dùng'),
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

export const UpdateProfileBodySchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Họ tên không được để trống')
      .max(100, 'Họ tên tối đa 100 ký tự')
      .optional()
      .describe('Họ và tên đầy đủ'),
    phone: OptionalPhoneSchema.nullable()
      .optional()
      .describe('Số điện thoại liên hệ (gửi null hoặc chuỗi rỗng để xóa)'),
    bio: OptionalBioSchema.nullable()
      .optional()
      .describe('Giới thiệu bản thân ngắn gọn (gửi null hoặc chuỗi rỗng để xóa)'),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Cần cung cấp ít nhất một trường để cập nhật',
  });

export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Mật khẩu hiện tại không được để trống')
      .describe('Mật khẩu hiện tại'),
    newPassword: PasswordSchema.describe('Mật khẩu mới (tối thiểu 8 ký tự)'),
  })
  .strict();

export const ForgotPasswordBodySchema = UserSchema.pick({
  email: true,
}).strict();

export const ResetPasswordBodySchema = UserSchema.pick({
  email: true,
})
  .extend({
    otp: z
      .string()
      .trim()
      .regex(
        new RegExp(`^\\d{${PASSWORD_RESET_OTP_LENGTH}}$`),
        `Mã OTP phải gồm đúng ${PASSWORD_RESET_OTP_LENGTH} chữ số`,
      )
      .describe('Mã OTP 6 chữ số được gửi về email'),
    newPassword: PasswordSchema.describe('Mật khẩu mới (tối thiểu 8 ký tự)'),
  })
  .strict();

export const UploadAvatarFileSchema = z.object({
  file: z.any().describe('Ảnh đại diện định dạng JPG, PNG hoặc WebP (dung lượng tối đa 2MB)'),
});

export const RegisterResSchema = PublicUserSchema;

export const LoginResSchema = z.object({
  accessToken: z.string().describe('Access Token JWT'),
  user: PublicUserSchema,
});

export const GetProfileResSchema = PublicUserSchema;
export const UpdateProfileResSchema = PublicUserSchema;
export const RefreshTokenResSchema = LoginResSchema;

export const MessageResSchema = z.object({
  message: z.string().describe('Thông báo kết quả thao tác'),
});

export const LogoutResSchema = MessageResSchema;

export type RegisterBodyType = z.infer<typeof RegisterBodySchema>;
export type LoginBodyType = z.infer<typeof LoginBodySchema>;
export type RefreshTokenBodyType = z.infer<typeof RefreshTokenBodySchema>;
export type UpdateProfileBodyType = z.infer<typeof UpdateProfileBodySchema>;
export type ChangePasswordBodyType = z.infer<typeof ChangePasswordBodySchema>;
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordBodySchema>;
export type ResetPasswordBodyType = z.infer<typeof ResetPasswordBodySchema>;
export type RegisterResType = z.infer<typeof RegisterResSchema>;
export type LoginResType = z.infer<typeof LoginResSchema>;
export type GetProfileResType = z.infer<typeof GetProfileResSchema>;
export type UpdateProfileResType = z.infer<typeof UpdateProfileResSchema>;
export type RefreshTokenResType = z.infer<typeof RefreshTokenResSchema>;
export type LogoutResType = z.infer<typeof LogoutResSchema>;
export type MessageResType = z.infer<typeof MessageResSchema>;
