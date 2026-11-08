import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.email('Email không đúng định dạng').describe('Email đăng nhập'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .describe('Mật khẩu'),
});

export class LoginDto extends createZodDto(LoginSchema) {}
