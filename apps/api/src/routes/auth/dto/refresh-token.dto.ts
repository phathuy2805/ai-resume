import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .min(1)
      .optional()
      .describe('Refresh Token JWT (tuỳ chọn nếu gửi qua httpOnly cookie)'),
  })
  .prefault({});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
