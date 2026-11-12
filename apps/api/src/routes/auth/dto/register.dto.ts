import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '../../../shared/constants/role.enum.js';

export const RegisterSchema = z.object({
  email: z.email('Email không đúng định dạng').describe('Email người dùng'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .describe('Mật khẩu người dùng'),
  fullName: z
    .string()
    .min(1, 'Họ tên không được để trống')
    .describe('Họ và tên đầy đủ'),
  role: z
    .enum([Role.CANDIDATE, Role.HR])
    .describe('Vai trò trong hệ thống (HR hoặc CANDIDATE)'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
