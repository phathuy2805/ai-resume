ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "candidate_message" TEXT,
  ADD COLUMN IF NOT EXISTS "candidate_feedback" JSONB;
