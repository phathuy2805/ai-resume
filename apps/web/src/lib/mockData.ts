/**
 * Static demo data for the UI while the real endpoints are wired up
 * (W1-FE-04/05, W2-FE-01..04). Shapes follow `@/types` so swapping to
 * TanStack Query hooks only replaces the data source.
 */
import type { AiRecommendation } from '@/lib/applicationStatus';
import type { Application, ApplicationStatus } from '@/types/applications';
import type { Job } from '@/types/jobs';

const base = { createdById: 'hr-1', interviewQuestionCount: 3 } as const;

export const mockJobs: Job[] = [
  {
    ...base,
    id: 'job-backend',
    title: 'Backend Developer (Node.js)',
    description:
      'Phát triển và tối ưu các RESTful API bằng Node.js cho nền tảng tuyển dụng HireFlow.\nThiết kế cơ sở dữ liệu PostgreSQL đảm bảo hiệu năng và khả năng mở rộng.\nPhối hợp với team AI để tích hợp pipeline sàng lọc CV tự động.\nViết unit test, integration test và duy trì CI/CD ổn định.',
    requiredSkills: ['Node.js', 'PostgreSQL', 'REST API', 'TypeScript'],
    preferredSkills: ['Docker', 'AWS', 'Redis'],
    minYearsExperience: 2,
    status: 'OPEN',
    cvPassThreshold: 70,
    createdAt: '2026-11-10T08:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
  },
  {
    ...base,
    id: 'job-frontend',
    title: 'Frontend Developer (React)',
    description:
      'Xây dựng giao diện web bằng React và TypeScript.\nHợp tác với designer để hiện thực hoá design system.\nTối ưu hiệu năng và trải nghiệm người dùng trên mọi thiết bị.',
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
    preferredSkills: ['Next.js', 'Testing Library'],
    minYearsExperience: 2,
    status: 'OPEN',
    cvPassThreshold: 75,
    interviewQuestionCount: 4,
    createdAt: '2026-11-08T08:00:00.000Z',
    updatedAt: '2026-11-08T08:00:00.000Z',
  },
  {
    ...base,
    id: 'job-data',
    title: 'Data Analyst',
    description:
      'Phân tích dữ liệu kinh doanh và xây dựng báo cáo định kỳ.\nThiết kế dashboard theo dõi chỉ số tăng trưởng.\nLàm việc với các phòng ban để chuẩn hoá nguồn dữ liệu.',
    requiredSkills: ['Python', 'SQL', 'PowerBI'],
    preferredSkills: ['Tableau', 'dbt'],
    minYearsExperience: 1,
    status: 'OPEN',
    cvPassThreshold: 65,
    createdAt: '2026-11-05T08:00:00.000Z',
    updatedAt: '2026-11-05T08:00:00.000Z',
  },
  {
    ...base,
    id: 'job-marketing',
    title: 'Digital Marketing Executive',
    description:
      'Lên kế hoạch và triển khai các chiến dịch marketing đa kênh.\nTối ưu SEO và quảng cáo Google Ads.\nĐo lường hiệu quả chiến dịch và đề xuất cải tiến.',
    requiredSkills: ['SEO', 'Google Ads', 'Content Marketing'],
    preferredSkills: ['Google Analytics'],
    minYearsExperience: 2,
    status: 'CLOSED',
    cvPassThreshold: 60,
    createdAt: '2026-10-28T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    ...base,
    id: 'job-qa',
    title: 'QA Engineer (Automation)',
    description:
      'Xây dựng bộ kiểm thử tự động cho web và API.\nThiết kế test case, theo dõi lỗi và phối hợp với developer để xử lý.\nTích hợp kiểm thử vào pipeline CI/CD.',
    requiredSkills: ['Playwright', 'API Testing', 'JavaScript'],
    preferredSkills: ['k6', 'GitHub Actions'],
    minYearsExperience: 1,
    status: 'OPEN',
    cvPassThreshold: 65,
    interviewQuestionCount: 4,
    createdAt: '2026-11-13T08:00:00.000Z',
    updatedAt: '2026-11-13T08:00:00.000Z',
  },
  {
    ...base,
    id: 'job-intern',
    title: 'Thực tập sinh Frontend',
    description:
      'Tham gia phát triển giao diện cho sản phẩm HireFlow cùng đội Frontend.\nĐược hướng dẫn về React, TypeScript và quy trình review code.\nPhù hợp với sinh viên năm cuối yêu thích giao diện người dùng.',
    requiredSkills: ['HTML/CSS', 'JavaScript', 'React'],
    preferredSkills: ['Git', 'Figma'],
    minYearsExperience: 0,
    status: 'OPEN',
    cvPassThreshold: 60,
    createdAt: '2026-10-30T08:00:00.000Z',
    updatedAt: '2026-10-30T08:00:00.000Z',
  },
];

/** Per-job counters an HR list needs (will come from the dashboard API). */
export const mockJobStats: Record<string, { applications: number; shortlisted: number }> = {
  'job-backend': { applications: 48, shortlisted: 18 },
  'job-frontend': { applications: 35, shortlisted: 14 },
  'job-data': { applications: 29, shortlisted: 11 },
  'job-marketing': { applications: 14, shortlisted: 4 },
  'job-qa': { applications: 6, shortlisted: 2 },
  'job-intern': { applications: 21, shortlisted: 9 },
};

export interface CandidateRow {
  id: string;
  jobId: string;
  fullName: string;
  email: string;
  score: number | null;
  aiRecommendation: AiRecommendation | null;
  status: ApplicationStatus;
  createdAt: string;
}

export const mockCandidates: CandidateRow[] = [
  {
    id: 'app-1',
    jobId: 'job-backend',
    fullName: 'Nguyễn Hoàng Nam',
    email: 'nam.nguyen@gmail.com',
    score: 92,
    aiRecommendation: 'PASS',
    status: 'SHORTLISTED',
    createdAt: '2026-11-12T03:00:00.000Z',
  },
  {
    id: 'app-2',
    jobId: 'job-backend',
    fullName: 'Trần Minh Đức',
    email: 'duc.tran@outlook.com',
    score: 85,
    aiRecommendation: 'PASS',
    status: 'INTERVIEW_INVITED',
    createdAt: '2026-11-11T03:00:00.000Z',
  },
  {
    id: 'app-3',
    jobId: 'job-backend',
    fullName: 'Lê Bảo Ngọc',
    email: 'ngoc.le@gmail.com',
    score: 78,
    aiRecommendation: 'PASS',
    status: 'SCREENED',
    createdAt: '2026-11-11T02:00:00.000Z',
  },
  {
    id: 'app-4',
    jobId: 'job-backend',
    fullName: 'Phạm Quang Huy',
    email: 'huy.pq@gmail.com',
    score: 64,
    aiRecommendation: 'CONSIDER',
    status: 'SCREENED',
    createdAt: '2026-11-10T03:00:00.000Z',
  },
  {
    id: 'app-5',
    jobId: 'job-backend',
    fullName: 'Đỗ Anh Tuấn',
    email: 'tuan.do@tech.vn',
    score: null,
    aiRecommendation: null,
    status: 'SCREENING',
    createdAt: '2026-11-14T07:20:00.000Z',
  },
  {
    id: 'app-6',
    jobId: 'job-backend',
    fullName: 'Vũ Thu Trang',
    email: 'trang.vu@gmail.com',
    score: null,
    aiRecommendation: null,
    status: 'SCREENING_FAILED',
    createdAt: '2026-11-14T04:05:00.000Z',
  },
  {
    id: 'app-7',
    jobId: 'job-backend',
    fullName: 'Hoàng Gia Bảo',
    email: 'bao.hoang@gmail.com',
    score: 44,
    aiRecommendation: 'REJECT',
    status: 'REJECTED',
    createdAt: '2026-11-09T03:00:00.000Z',
  },
  {
    id: 'app-8',
    jobId: 'job-frontend',
    fullName: 'Bùi Thanh Hà',
    email: 'ha.bui@gmail.com',
    score: 81,
    aiRecommendation: 'PASS',
    status: 'EVALUATED',
    createdAt: '2026-11-09T05:00:00.000Z',
  },
  {
    id: 'app-9',
    jobId: 'job-data',
    fullName: 'Ngô Minh Khoa',
    email: 'khoa.ngo@gmail.com',
    score: 72,
    aiRecommendation: 'CONSIDER',
    status: 'SHORTLISTED',
    createdAt: '2026-11-07T05:00:00.000Z',
  },
];

/** Applications of the signed-in candidate ("Hồ sơ của tôi"). */
export const mockMyApplications: Application[] = [
  // "Backend Developer (Node.js)" is intentionally not applied yet, so the CV upload form is visible.
  {
    id: 'my-app-2',
    status: 'INTERVIEW_INVITED',
    job: { id: 'job-frontend', title: 'Frontend Developer (React)' },
    cvFileName: 'Nguyen_Van_A_Frontend.pdf',
    cvSizeBytes: 1_800_000,
    cvMimeType: 'application/pdf',
    createdAt: '2026-11-10T03:00:00.000Z',
    updatedAt: '2026-11-11T03:00:00.000Z',
  },
  {
    id: 'my-app-3',
    status: 'PASSED',
    job: { id: 'job-data', title: 'Data Analyst' },
    cvFileName: 'Nguyen_Van_A_Data_Analyst.pdf',
    cvSizeBytes: 1_200_000,
    cvMimeType: 'application/pdf',
    createdAt: '2026-11-05T03:00:00.000Z',
    updatedAt: '2026-11-09T03:00:00.000Z',
  },
  {
    id: 'my-app-4',
    status: 'REJECTED',
    job: { id: 'job-marketing', title: 'Digital Marketing Executive' },
    cvFileName: 'Nguyen_Van_A_Marketing.pdf',
    cvSizeBytes: 900_000,
    cvMimeType: 'application/pdf',
    createdAt: '2026-11-01T03:00:00.000Z',
    updatedAt: '2026-11-02T03:00:00.000Z',
  },
];

/** Aggregates for the HR stats page (W2-FE-04). */
export const mockStats = {
  total: 126,
  shortlisted: 48,
  interviewed: 21,
  passed: 7,
  byStatus: [
    { label: 'Đã nộp', value: 126, color: 'bg-indigo-200' },
    { label: 'Đang chấm', value: 8, color: 'bg-amber-300' },
    { label: 'Đạt sàng lọc', value: 48, color: 'bg-green-500' },
    { label: 'Đã loại', value: 52, color: 'bg-red-500' },
    { label: 'Phỏng vấn', value: 21, color: 'bg-indigo-500' },
    { label: 'Đạt', value: 7, color: 'bg-green-600' },
    { label: 'Không đạt', value: 14, color: 'bg-red-400' },
  ],
  scoreBuckets: [
    { label: '0–20', value: 8 },
    { label: '20–40', value: 16 },
    { label: '40–60', value: 28 },
    { label: '60–80', value: 54 },
    { label: '80–100', value: 20 },
  ],
  recommendations: { PASS: 53, CONSIDER: 43, REJECT: 30 } satisfies Record<
    AiRecommendation,
    number
  >,
};
