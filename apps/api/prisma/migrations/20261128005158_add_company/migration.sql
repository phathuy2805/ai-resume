-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "tagline" TEXT,
    "logo_url" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "founded_year" INTEGER,
    "address" TEXT,
    "website" TEXT,
    "contact_email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "culture" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_singleton_key" ON "company"("singleton");

-- Hệ thống chỉ phục vụ 1 doanh nghiệp: singleton luôn = true, kết hợp unique index => tối đa 1 dòng
ALTER TABLE "company" ADD CONSTRAINT "company_singleton_check" CHECK ("singleton" = true);
