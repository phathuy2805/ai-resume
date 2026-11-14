import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import {
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
    requiredSkills: [
      'NodeJS',
      'NestJS',
      'TypeScript',
      'PostgreSQL',
      'RESTful API',
      'Docker',
    ],
    preferredSkills: ['Redis', 'BullMQ', 'AWS S3', 'Microservices', 'GraphQL'],
    minYearsExperience: 3,
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
    requiredSkills: ['SQL', 'Python', 'PowerBI', 'Data Analysis', 'Statistics'],
    preferredSkills: ['Tableau', 'Pandas', 'ETL', 'BigQuery', 'Data Modeling'],
    minYearsExperience: 2,
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
    requiredSkills: [
      'SEO',
      'Google Ads',
      'Meta Ads',
      'Content Marketing',
      'Google Analytics',
    ],
    preferredSkills: [
      'TikTok Ads',
      'Copywriting',
      'Email Marketing',
      'Canva',
      'A/B Testing',
    ],
    minYearsExperience: 2,
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

  // 1. Seed 1 Admin + 1 HR + 2 Candidates
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
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minYearsExperience: job.minYearsExperience,
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
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        minYearsExperience: job.minYearsExperience,
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

  console.log(
    '✅ Verified pgvector(768) via $executeRaw / $queryRaw:',
    rows[0],
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
