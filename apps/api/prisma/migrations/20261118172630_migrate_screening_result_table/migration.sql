/*
  Warnings:

  - You are about to drop the column `code_score` on the `screening_results` table. All the data in the column will be lost.
  - You are about to drop the column `gemini_score` on the `screening_results` table. All the data in the column will be lost.
  - You are about to drop the column `missing_skills` on the `screening_results` table. All the data in the column will be lost.
  - You are about to drop the column `similarity_score` on the `screening_results` table. All the data in the column will be lost.
  - You are about to drop the column `strengths` on the `screening_results` table. All the data in the column will be lost.
  - You are about to drop the column `verified_quotes` on the `screening_results` table. All the data in the column will be lost.
  - You are about to alter the column `total_score` on the `screening_results` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `breakdown` to the `screening_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `explanation` to the `screening_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timings` to the `screening_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `screening_results` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "jobs_title_trgm_idx";

-- AlterTable
ALTER TABLE "screening_results" DROP COLUMN "code_score",
DROP COLUMN "gemini_score",
DROP COLUMN "missing_skills",
DROP COLUMN "similarity_score",
DROP COLUMN "strengths",
DROP COLUMN "verified_quotes",
ADD COLUMN     "breakdown" JSONB NOT NULL,
ADD COLUMN     "explanation" JSONB NOT NULL,
ADD COLUMN     "timings" JSONB NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "total_score" SET DATA TYPE INTEGER;
