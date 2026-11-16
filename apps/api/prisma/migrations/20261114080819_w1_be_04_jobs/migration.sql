-- Enable pg_trgm for fast case-insensitive substring search on job titles
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR');

-- DropIndex
DROP INDEX "jobs_created_by_id_idx";

-- DropIndex
DROP INDEX "jobs_status_idx";

-- Backfill NULL rubric_weights before setting NOT NULL
UPDATE "jobs"
SET "rubric_weights" = '{"technical":40,"communication":20,"relevance":20,"evidence":20}'::jsonb
WHERE "rubric_weights" IS NULL;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "level" "JobLevel",
ADD COLUMN     "requirements" TEXT,
ALTER COLUMN "rubric_weights" SET NOT NULL,
ALTER COLUMN "rubric_weights" SET DEFAULT '{"technical":40,"communication":20,"relevance":20,"evidence":20}';

-- Tighten interview_question_count CHECK (3..5) and enforce 4-axis rubric sum = 100
ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_interview_question_count_check";
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_interview_question_count_check" CHECK ("interview_question_count" >= 3 AND "interview_question_count" <= 5);

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_rubric_weights_check" CHECK (
  jsonb_typeof("rubric_weights") = 'object'
  AND ("rubric_weights" ?& array['technical', 'communication', 'relevance', 'evidence'])
  AND (("rubric_weights"->>'technical')::int BETWEEN 0 AND 100)
  AND (("rubric_weights"->>'communication')::int BETWEEN 0 AND 100)
  AND (("rubric_weights"->>'relevance')::int BETWEEN 0 AND 100)
  AND (("rubric_weights"->>'evidence')::int BETWEEN 0 AND 100)
  AND (
    ("rubric_weights"->>'technical')::int
    + ("rubric_weights"->>'communication')::int
    + ("rubric_weights"->>'relevance')::int
    + ("rubric_weights"->>'evidence')::int
  ) = 100
);

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "jobs_created_by_id_created_at_idx" ON "jobs"("created_by_id", "created_at");

-- CreateIndex (GIN trigram index for title ILIKE search)
CREATE INDEX "jobs_title_trgm_idx" ON "jobs" USING GIN ("title" gin_trgm_ops);
