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
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Backend Developer (Node.js / NestJS)',
    description:
      'Xây dựng và tối ưu hệ thống RESTful API & WebSocket bằng NestJS, TypeScript, PostgreSQL (pgvector). Phối hợp cùng đội ngũ AI tích hợp LLM vào quy trình tuyển dụng.',
    requiredSkills: [
      'TypeScript',
      'Node.js',
      'NestJS',
      'PostgreSQL',
      'REST API',
    ],
    preferredSkills: ['Docker', 'Redis', 'AWS S3', 'Prisma'],
    minYearsExperience: 1,
    cvPassThreshold: 70,
    interviewQuestionCount: 5,
    rubricWeights: {
      technical: 40,
      communication: 20,
      relevance: 20,
      evidence: 20,
    },
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Data Analyst (SQL / Python / Power BI)',
    description:
      'Phân tích dữ liệu vận hành và hành vi người dùng, xây dựng dashboard báo cáo trên Power BI, viết truy vấn SQL tối ưu và tự động hóa báo cáo bằng Python.',
    requiredSkills: [
      'SQL',
      'Python',
      'Power BI',
      'Data Visualization',
      'Excel',
    ],
    preferredSkills: ['Pandas', 'Airflow', 'BigQuery', 'A/B Testing'],
    minYearsExperience: 1,
    cvPassThreshold: 65,
    interviewQuestionCount: 4,
    rubricWeights: {
      technical: 35,
      communication: 20,
      relevance: 25,
      evidence: 20,
    },
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Digital Marketing Specialist (Performance & SEO)',
    description:
      'Lập kế hoạch và triển khai chiến dịch quảng cáo đa kênh (Google Ads, Meta Ads), tối ưu SEO Onpage/Offpage, theo dõi chuyển đổi qua Google Analytics 4.',
    requiredSkills: [
      'Google Ads',
      'Facebook Ads',
      'SEO',
      'Google Analytics 4',
      'Content Marketing',
    ],
    preferredSkills: ['Copywriting', 'Looker Studio', 'CRM', 'Email Marketing'],
    minYearsExperience: 1,
    cvPassThreshold: 60,
    interviewQuestionCount: 4,
    rubricWeights: {
      technical: 30,
      communication: 25,
      relevance: 25,
      evidence: 20,
    },
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed 1 HR + 2 Candidates
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
    `✅ Seeded Users: HR (${hrUser.email}), Candidates (${candidate1.email}, ${candidate2.email})`,
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
