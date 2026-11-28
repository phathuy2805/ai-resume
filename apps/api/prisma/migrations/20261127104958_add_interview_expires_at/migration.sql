-- AlterTable
ALTER TABLE "interviews" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);
