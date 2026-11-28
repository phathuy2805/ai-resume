/*
  Warnings:

  - You are about to drop the column `logo_url` on the `company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "company" DROP COLUMN "logo_url",
ADD COLUMN     "logo_s3_key" TEXT;
