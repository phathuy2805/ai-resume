-- CreateEnum
CREATE TYPE "TurnTranscriptStatus" AS ENUM ('PENDING', 'DONE', 'NO_SPEECH', 'FAILED');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "interview_turns" ADD COLUMN "asked_at" TIMESTAMP(3),
ADD COLUMN "transcript_status" "TurnTranscriptStatus";

-- AlterTable
ALTER TABLE "interview_results" ADD COLUMN "candidate_message" TEXT,
ALTER COLUMN "candidate_feedback" TYPE JSONB USING (
  CASE
    WHEN "candidate_feedback" ~ '^\s*\{' THEN "candidate_feedback"::jsonb
    ELSE jsonb_build_object(
      'strengths', '[]'::jsonb,
      'improvements', '[]'::jsonb,
      'suggestions', jsonb_build_array("candidate_feedback")
    )
  END
);
