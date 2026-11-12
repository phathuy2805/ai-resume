import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống').describe('Refresh Token JWT'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
