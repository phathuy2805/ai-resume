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

/** Biến tùy chọn: để trống trong .env (`KEY=`) coi như không khai báo. */
const optionalString = z
  .string()
  .optional()
  .transform((v) => v || undefined);

/** Biến có giá trị mặc định: để trống trong .env (`KEY=`) vẫn rơi về `fallback`. */
const optionalWithDefault = (fallback: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v || fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
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
    // Amazon S3 (CV, audio, transcript). Dev: bucket hireflow-uploads-dev + key IAM user.
    // Production: chỉ khai báo S3_BUCKET, S3_REGION; EC2 dùng IAM Role, không đặt key.
    S3_BUCKET: z.string().min(1, 'S3_BUCKET là bắt buộc'),
    S3_REGION: z.string().min(1, 'S3_REGION là bắt buộc'),
    S3_ACCESS_KEY: optionalString,
    S3_SECRET_KEY: optionalString,
    // Gemini AI & Hàng đợi (W2-BE-02)
    GEMINI_API_KEY: optionalWithDefault('dev-gemini-api-key'),
    GEMINI_MODEL_TEXT: optionalWithDefault('gemini-2.5-flash-lite'),
    GEMINI_MODEL_EMBEDDING: optionalWithDefault('gemini-embedding-001'),
    GEMINI_MODEL_AUDIO: optionalWithDefault('gemini-2.5-flash'),
    AI_QUEUE_CONCURRENCY: z.coerce.number().int().min(1).default(2),
    AI_CONSIDER_MARGIN: z.coerce.number().int().min(0).max(100).default(10),
    INTERVIEW_INVITE_TTL_DAYS: z.coerce.number().int().min(1).default(7),
  })
  .refine((env) => !env.S3_ACCESS_KEY === !env.S3_SECRET_KEY, {
    message: 'Phải khai báo cả S3_ACCESS_KEY và S3_SECRET_KEY, hoặc bỏ trống cả hai',
    path: ['S3_SECRET_KEY'],
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
