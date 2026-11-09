-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HR', 'CANDIDATE', 'ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SCREENING', 'SCREENING_FAILED', 'SCREENED', 'SHORTLISTED', 'REJECTED', 'INTERVIEW_INVITED', 'INTERVIEWING', 'EVALUATED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AiRecommendation" AS ENUM ('PASS', 'CONSIDER', 'REJECT');

-- CreateEnum
CREATE TYPE "AnswerSource" AS ENUM ('VOICE', 'TEXT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CANDIDATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_skills" TEXT[],
    "preferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_years_experience" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'OPEN',
    "cv_pass_threshold" INTEGER NOT NULL DEFAULT 70,
    "interview_question_count" INTEGER NOT NULL DEFAULT 3,
    "rubric_weights" JSONB,
    "parsed_jd" JSONB,
    "embedding" vector(768),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "cv_s3_key" TEXT NOT NULL,
    "cv_file_name" TEXT NOT NULL,
    "cv_size_bytes" INTEGER NOT NULL,
    "cv_mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "cv_text" TEXT,
    "parsed_cv" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "screening_error" TEXT,
    "ai_recommendation" "AiRecommendation",
    "hr_decision_by_id" TEXT,
    "hr_decision_at" TIMESTAMP(3),
    "hr_note" TEXT,
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_results" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "code_score" DOUBLE PRECISION NOT NULL,
    "gemini_score" DOUBLE PRECISION NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB NOT NULL,
    "missing_skills" JSONB NOT NULL,
    "verified_quotes" JSONB NOT NULL,
    "processing_duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_status" "ApplicationStatus",
    "to_status" "ApplicationStatus" NOT NULL,
    "changed_by_id" TEXT,
    "reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "recording_consent_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "transcript_s3_key" TEXT,
    "evaluation_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_turns" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "question_type" TEXT,
    "target_skill" TEXT,
    "answer_text" TEXT,
    "source" "AnswerSource" NOT NULL DEFAULT 'VOICE',
    "transcript_edited" BOOLEAN NOT NULL DEFAULT false,
    "audio_s3_key" TEXT,
    "answered_at" TIMESTAMP(3),

    CONSTRAINT "interview_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_results" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "technical_score" DOUBLE PRECISION NOT NULL,
    "communication_score" DOUBLE PRECISION NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "evidence_score" DOUBLE PRECISION NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "feedback_summary" TEXT NOT NULL,
    "evidence_quotes" JSONB NOT NULL,
    "ai_recommendation" "AiRecommendation" NOT NULL,
    "candidate_feedback" TEXT NOT NULL,
    "decision_by_id" TEXT,
    "decision_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_created_by_id_idx" ON "jobs"("created_by_id");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_job_id_idx" ON "applications"("job_id");

-- CreateIndex
CREATE INDEX "applications_candidate_id_idx" ON "applications"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_key" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "screening_results_application_id_key" ON "screening_results"("application_id");

-- CreateIndex
CREATE INDEX "application_status_history_application_id_changed_at_idx" ON "application_status_history"("application_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_application_id_key" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interview_turns_interview_id_order_index_idx" ON "interview_turns"("interview_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "interview_turns_interview_id_order_index_key" ON "interview_turns"("interview_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "interview_results_interview_id_key" ON "interview_results"("interview_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_hr_decision_by_id_fkey" FOREIGN KEY ("hr_decision_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_results" ADD CONSTRAINT "screening_results_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_turns" ADD CONSTRAINT "interview_turns_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_results" ADD CONSTRAINT "interview_results_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_results" ADD CONSTRAINT "interview_results_decision_by_id_fkey" FOREIGN KEY ("decision_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_min_years_experience_check" CHECK ("min_years_experience" >= 0);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_cv_pass_threshold_check" CHECK ("cv_pass_threshold" >= 0 AND "cv_pass_threshold" <= 100);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_interview_question_count_check" CHECK ("interview_question_count" >= 3 AND "interview_question_count" <= 10);