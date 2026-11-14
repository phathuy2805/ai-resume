import { z } from 'zod';
import { Role } from '../constants/role.enum.js';

export const UserSchema = z.object({
  id: z.uuid().describe('ID người dùng (UUID)'),
  email: z.email('Email không đúng định dạng').describe('Email người dùng'),
  fullName: z
    .string()
    .min(1, 'Họ tên không được để trống')
    .describe('Họ và tên đầy đủ'),
  role: z.enum(Role).describe('Vai trò người dùng'),
  createdAt: z.string().describe('Thời điểm tạo tài khoản (ISO 8601)'),
});

export type UserModel = z.infer<typeof UserSchema>;
