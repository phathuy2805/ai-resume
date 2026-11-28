DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TurnTranscriptStatus') THEN
    CREATE TYPE "TurnTranscriptStatus" AS ENUM ('PENDING', 'DONE', 'NO_SPEECH', 'FAILED');
  END IF;
END $$;

ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "candidate_message" TEXT,
  ADD COLUMN IF NOT EXISTS "candidate_feedback" JSONB;

ALTER TABLE "interviews"
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3);

ALTER TABLE "interview_turns"
  ADD COLUMN IF NOT EXISTS "asked_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "transcript_status" "TurnTranscriptStatus";

ALTER TABLE "interview_results"
  ADD COLUMN IF NOT EXISTS "candidate_message" TEXT;

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'interview_results'
    AND column_name = 'candidate_feedback';

  IF col_type IS NOT NULL AND col_type <> 'jsonb' THEN
    ALTER TABLE "interview_results"
      ALTER COLUMN "candidate_feedback" TYPE JSONB
      USING (
        CASE
          WHEN "candidate_feedback" IS NULL OR btrim("candidate_feedback") = '' THEN
            '{"strengths":[],"improvements":[],"suggestions":[]}'::jsonb
          WHEN left(btrim("candidate_feedback"), 1) = '{' THEN
            "candidate_feedback"::jsonb
          ELSE
            jsonb_build_object(
              'strengths', jsonb_build_array("candidate_feedback"),
              'improvements', '[]'::jsonb,
              'suggestions', '[]'::jsonb
            )
        END
      );
  END IF;
END $$;
