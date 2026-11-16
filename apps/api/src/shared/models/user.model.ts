import { z } from 'zod';
import { Role } from '../constants/role.enum.js';

export const UserSchema = z.object({
  id: z.uuid().describe('ID người dùng (UUID)'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Email không đúng định dạng'))
    .describe('Email người dùng'),
  passwordHash: z.string().min(1).describe('Mật khẩu đã băm (bcrypt)'),
  fullName: z.string().trim().min(1, 'Họ tên không được để trống').describe('Họ và tên đầy đủ'),
  role: z.enum(Role).describe('Vai trò người dùng'),
  createdAt: z.string().describe('Thời điểm tạo tài khoản (ISO 8601)'),
  updatedAt: z.string().describe('Thời điểm cập nhật gần nhất (ISO 8601)'),
});

export const PublicUserSchema = UserSchema.omit({ passwordHash: true });

export type UserModel = z.infer<typeof UserSchema>;
export type PublicUserModel = z.infer<typeof PublicUserSchema>;
