import { z } from 'zod';

const emailField = z.string().trim().email('Email không hợp lệ');

/** Đăng ký công khai chỉ dành cho ứng viên; tài khoản HR do quản trị viên cấp. */
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên'),
    email: emailField,
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
