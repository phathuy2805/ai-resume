import fs from 'fs';
import path from 'path';
import z from 'zod';

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
];

const existEnvPath = candidatePaths.find((p) => fs.existsSync(p));
if (existEnvPath) {
  process.loadEnvFile(existEnvPath);
} else if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
  console.error('\nKhông tìm thấy file .env của Backend');
  process.exit(1);
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL là bắt buộc'),
  DATABASE_URL_TEST: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().default(5432),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(1, 'ACCESS_TOKEN_SECRET là bắt buộc')
    .default('dev-access-secret'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(1, 'REFRESH_TOKEN_SECRET là bắt buộc')
    .default('dev-refresh-secret'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const configServer = envSchema.safeParse(config);
  if (!configServer.success) {
    console.log('Các giá trị khai báo trong file .env không hợp lệ');
    console.error(z.treeifyError(configServer.error));
    process.exit(1);
  }
  return configServer.data;
}
const envConfig = validateEnv(process.env);

export default envConfig;
