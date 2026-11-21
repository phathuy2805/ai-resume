import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import {
  AiRecommendation,
  ApplicationStatus,
  JobLevel,
  JobStatus,
  PrismaClient,
  Role,
} from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SEED_JOBS = [
  {
    id: 'd19e9185-1715-46a2-94b2-e1e779a1d123',
    title: 'Senior Backend NodeJS / NestJS Developer',
    description:
      'Chúng tôi tìm kiếm Senior Backend Developer tham gia phát triển hệ thống nền tảng tuyển dụng thông minh. Bạn sẽ chịu trách nhiệm thiết kế kiến trúc hệ thống, phát triển RESTful API hiệu năng cao bằng NestJS, tối ưu hóa cơ sở dữ liệu PostgreSQL và tích hợp các pipeline hàng đợi xử lý bất đồng bộ.',
    requirements:
      'Tối thiểu 3 năm kinh nghiệm phát triển Backend với NodeJS/TypeScript và NestJS. Thành thạo PostgreSQL, thiết kế RESTful API và làm việc với Docker.',
    requiredSkills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'RESTful API', 'Docker'],
    preferredSkills: ['Redis', 'BullMQ', 'AWS S3', 'Microservices', 'GraphQL'],
    minYearsExperience: 3,
    level: JobLevel.SENIOR,
    cvPassThreshold: 70,
    interviewQuestionCount: 3,
    rubricWeights: {
      technical: 40,
      communication: 20,
      relevance: 20,
      evidence: 20,
    },
  },
  {
    id: 'e28f8296-2826-57b3-85c3-f2f880b2e234',
    title: 'Middle / Senior Data Analyst',
    description:
      'Vị trí Data Analyst chịu trách nhiệm phân tích sâu dữ liệu người dùng và kinh doanh, xây dựng các Dashboard trực quan hóa dữ liệu theo thời gian thực, thiết kế các mô hình chỉ số KPI và phối hợp với ban điều hành để đưa ra các đề xuất tối ưu hóa tăng trưởng dựa trên dữ liệu thực chứng.',
    requirements:
      'Tối thiểu 2 năm kinh nghiệm phân tích dữ liệu. Thành thạo SQL, Python và PowerBI, có nền tảng vững về thống kê và thiết kế chỉ số KPI.',
    requiredSkills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics'],
    preferredSkills: ['Tableau', 'Pandas', 'ETL', 'BigQuery', 'Data Modeling'],
    minYearsExperience: 2,
    level: JobLevel.MIDDLE,
    cvPassThreshold: 70,
    interviewQuestionCount: 3,
    rubricWeights: {
      technical: 35,
      communication: 25,
      relevance: 20,
      evidence: 20,
    },
  },
  {
    id: 'f39a9307-3937-68c4-96d4-a3a991c3f345',
    title: 'Digital Marketing Specialist',
    description:
      'Chúng tôi tìm kiếm Digital Marketing Specialist nhiệt huyết để dẫn dắt các chiến dịch tiếp thị số đa kênh. Bạn sẽ phụ trách tối ưu hóa công cụ tìm kiếm (SEO), vận hành quảng cáo trả phí (Google Ads, Meta Ads), sáng tạo nội dung chuyển đổi và đo lường hiệu quả chiến dịch bằng dữ liệu phân tích.',
    requirements:
      'Tối thiểu 2 năm kinh nghiệm triển khai SEO, Google Ads, Meta Ads và phân tích hiệu quả chiến dịch qua Google Analytics.',
    requiredSkills: ['SEO', 'Google Ads', 'Meta Ads', 'Content Marketing', 'Google Analytics'],
    preferredSkills: ['TikTok Ads', 'Copywriting', 'Email Marketing', 'Canva', 'A/B Testing'],
    minYearsExperience: 2,
    level: JobLevel.MIDDLE,
    cvPassThreshold: 70,
    interviewQuestionCount: 3,
    rubricWeights: {
      technical: 30,
      communication: 30,
      relevance: 25,
      evidence: 15,
    },
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. 1 Admin - 1 HR - 2 Candidates
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hireflow.vn' },
    update: {
      fullName: 'Quản trị viên Hệ thống (Admin)',
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@hireflow.vn',
      fullName: 'Quản trị viên Hệ thống (Admin)',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@hireflow.vn' },
    update: {
      fullName: 'Nguyễn Thị Minh Thư (HR)',
      passwordHash,
      role: Role.HR,
    },
    create: {
      email: 'hr@hireflow.vn',
      fullName: 'Nguyễn Thị Minh Thư (HR)',
      passwordHash,
      role: Role.HR,
    },
  });

  const candidate1 = await prisma.user.upsert({
    where: { email: 'candidate1@hireflow.vn' },
    update: { fullName: 'Trần Văn An', passwordHash, role: Role.CANDIDATE },
    create: {
      email: 'candidate1@hireflow.vn',
      fullName: 'Trần Văn An',
      passwordHash,
      role: Role.CANDIDATE,
    },
  });

  const candidate2 = await prisma.user.upsert({
    where: { email: 'candidate2@hireflow.vn' },
    update: { fullName: 'Lê Hoàng Bích', passwordHash, role: Role.CANDIDATE },
    create: {
      email: 'candidate2@hireflow.vn',
      fullName: 'Lê Hoàng Bích',
      passwordHash,
      role: Role.CANDIDATE,
    },
  });

  console.log(
    `✅ Seeded Users: Admin (${adminUser.email}), HR (${hrUser.email}), Candidates (${candidate1.email}, ${candidate2.email})`,
  );

  // 2. Seed 3 Jobs (trùng với 3 vị trí JD của W1-AI-06)
  for (const job of SEED_JOBS) {
    await prisma.job.upsert({
      where: { id: job.id },
      update: {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minYearsExperience: job.minYearsExperience,
        level: job.level,
        status: JobStatus.OPEN,
        cvPassThreshold: job.cvPassThreshold,
        interviewQuestionCount: job.interviewQuestionCount,
        rubricWeights: job.rubricWeights,
        createdById: hrUser.id,
      },
      create: {
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minYearsExperience: job.minYearsExperience,
        level: job.level,
        status: JobStatus.OPEN,
        cvPassThreshold: job.cvPassThreshold,
        interviewQuestionCount: job.interviewQuestionCount,
        rubricWeights: job.rubricWeights,
        createdById: hrUser.id,
      },
    });
  }
  console.log(`✅ Seeded ${SEED_JOBS.length} Jobs.`);

  // 3. Test ghi và đọc vector 768 chiều bằng $executeRaw / $queryRaw
  const sampleVector = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
  const vectorLiteral = `[${sampleVector.join(',')}]`;
  const targetJobId = SEED_JOBS[0].id;

  await prisma.$executeRaw`
    UPDATE "jobs"
    SET "embedding" = ${vectorLiteral}::vector(768)
    WHERE "id" = ${targetJobId}
  `;

  const rows = await prisma.$queryRaw<
    Array<{ id: string; title: string; dims: number; similarity: number }>
  >`
    SELECT
      "id",
      "title",
      vector_dims("embedding") AS "dims",
      1 - ("embedding" <=> ${vectorLiteral}::vector(768)) AS "similarity"
    FROM "jobs"
    WHERE "id" = ${targetJobId}
  `;

  console.log('✅ Verified pgvector(768) via $executeRaw / $queryRaw:', rows[0]);

  // 4. Seed Application + ScreeningResult mẫu (W2-BE-04) khớp ScoreBreakdown của W2-AI-02
  const seedApplications = [
    {
      id: 'a1000000-0000-4000-8000-000000000001',
      jobId: SEED_JOBS[0].id,
      candidateId: candidate1.id,
      cvS3Key: `cvs/${SEED_JOBS[0].id}/seed-an.pdf`,
      cvFileName: 'CV_Tran_Van_An.pdf',
      cvSizeBytes: 185400,
      cvText:
        'Trần Văn An — 4 năm kinh nghiệm NodeJS, NestJS, TypeScript, PostgreSQL, RESTful API.',
      status: ApplicationStatus.SCREENED,
      aiRecommendation: AiRecommendation.PASS,
      screeningResult: {
        totalScore: 82,
        breakdown: {
          requiredSkills: {
            score: 83,
            weight: 35,
            matched: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'RESTful API'],
            missing: ['Docker'],
          },
          preferredSkills: {
            score: 40,
            weight: 10,
            matched: ['Redis', 'AWS S3'],
            missing: ['BullMQ', 'Microservices', 'GraphQL'],
          },
          experienceYears: {
            score: 100,
            weight: 15,
            candidateYears: 4,
            requiredYears: 3,
          },
          relevance: {
            score: 90,
            weight: 25,
            comment: 'Kinh nghiệm xây dựng API NestJS và PostgreSQL khớp chặt với yêu cầu vị trí.',
          },
          similarity: {
            score: 76,
            weight: 15,
            cosine: 0.879,
          },
          capped: false,
        },
        explanation: {
          summary: 'Ứng viên đáp ứng tốt đa số kỹ năng cốt lõi và vượt yêu cầu số năm kinh nghiệm.',
          strengths: ['Thành thạo NestJS, TypeScript, PostgreSQL', '4 năm kinh nghiệm Backend'],
          missingSkills: ['Docker', 'BullMQ'],
          verifiedQuotes: ['4 năm kinh nghiệm xây dựng REST API với NestJS và PostgreSQL'],
        },
        timings: { extractMs: 120, parseMs: 650, embedMs: 210, scoreMs: 420 },
        processingDurationMs: 1400,
      },
    },
    {
      id: 'a1000000-0000-4000-8000-000000000002',
      jobId: SEED_JOBS[0].id,
      candidateId: candidate2.id,
      cvS3Key: `cvs/${SEED_JOBS[0].id}/seed-bich.pdf`,
      cvFileName: 'CV_Le_Hoang_Bich.pdf',
      cvSizeBytes: 142000,
      cvText: 'Lê Hoàng Bích — 1.5 năm kinh nghiệm NodeJS, TypeScript, RESTful API, Microservices.',
      status: ApplicationStatus.SCREENED,
      aiRecommendation: AiRecommendation.CONSIDER,
      screeningResult: {
        totalScore: 60,
        breakdown: {
          requiredSkills: {
            score: 50,
            weight: 35,
            matched: ['NodeJS', 'TypeScript', 'RESTful API'],
            missing: ['NestJS', 'PostgreSQL', 'Docker'],
          },
          preferredSkills: {
            score: 40,
            weight: 10,
            matched: ['Redis', 'Microservices'],
            missing: ['BullMQ', 'AWS S3', 'GraphQL'],
          },
          experienceYears: {
            score: 50,
            weight: 15,
            candidateYears: 1.5,
            requiredYears: 3,
          },
          relevance: {
            score: 80,
            weight: 25,
            comment: 'Có nền tảng NodeJS/TypeScript tốt nhưng chưa dùng NestJS và Docker thực tế.',
          },
          similarity: {
            score: 75,
            weight: 15,
            cosine: 0.878,
          },
          capped: false,
        },
        explanation: {
          summary:
            'Ứng viên có nền tảng NodeJS nhưng thiếu NestJS, PostgreSQL và chưa đủ 3 năm KN.',
          strengths: ['Có kinh nghiệm NodeJS, TypeScript và REST API'],
          missingSkills: ['NestJS', 'PostgreSQL', 'Docker'],
          verifiedQuotes: ['1.5 năm phát triển backend bằng NodeJS/TypeScript'],
        },
        timings: { extractMs: 95, parseMs: 610, embedMs: 190, scoreMs: 390 },
        processingDurationMs: 1285,
      },
    },
    {
      id: 'a1000000-0000-4000-8000-000000000003',
      jobId: SEED_JOBS[1].id,
      candidateId: candidate1.id,
      cvS3Key: `cvs/${SEED_JOBS[1].id}/seed-an-da.pdf`,
      cvFileName: 'CV_Tran_Van_An_DA.pdf',
      cvSizeBytes: 160200,
      cvText: 'Trần Văn An — SQL, PostgreSQL, Python cơ bản.',
      status: ApplicationStatus.SUBMITTED,
      aiRecommendation: null,
      screeningResult: null,
    },
  ];

  for (const app of seedApplications) {
    const existingApp = await prisma.application.findUnique({
      where: { unique_application_per_job: { jobId: app.jobId, candidateId: app.candidateId } },
      select: { id: true },
    });
    if (existingApp) {
      if (app.screeningResult) {
        await prisma.screeningResult.upsert({
          where: { applicationId: existingApp.id },
          update: app.screeningResult,
          create: { applicationId: existingApp.id, ...app.screeningResult },
        });
      }
      continue;
    }

    await prisma.application.create({
      data: {
        id: app.id,
        jobId: app.jobId,
        candidateId: app.candidateId,
        cvS3Key: app.cvS3Key,
        cvFileName: app.cvFileName,
        cvSizeBytes: app.cvSizeBytes,
        cvText: app.cvText,
        status: app.status,
        aiRecommendation: app.aiRecommendation,
        ...(app.screeningResult ? { screeningResult: { create: app.screeningResult } } : {}),
        statusHistories: {
          create:
            app.status === ApplicationStatus.SCREENED
              ? [
                  {
                    fromStatus: null,
                    toStatus: ApplicationStatus.SUBMITTED,
                    changedById: app.candidateId,
                  },
                  {
                    fromStatus: ApplicationStatus.SUBMITTED,
                    toStatus: ApplicationStatus.SCREENING,
                  },
                  { fromStatus: ApplicationStatus.SCREENING, toStatus: ApplicationStatus.SCREENED },
                ]
              : [
                  {
                    fromStatus: null,
                    toStatus: ApplicationStatus.SUBMITTED,
                    changedById: app.candidateId,
                  },
                ],
        },
      },
    });
  }
  console.log(
    `✅ Seeded ${seedApplications.length} sample Applications (với ScreeningResult giả).`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
