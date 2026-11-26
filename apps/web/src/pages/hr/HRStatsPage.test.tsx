import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as useJobStatsModule from '@/hooks/useJobStats';
import * as useJobsModule from '@/hooks/useJobs';
import { ApiError } from '@/types/api';
import type { ApplicationStatus, JobStats } from '@/types/applications';
import type { Job } from '@/types/jobs';
import HRStatsPage from './HRStatsPage';

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const baseJob: Job = {
  id: 'job-1',
  title: 'Backend Engineer',
  description: 'Test job',
  requiredSkills: ['Node.js'],
  preferredSkills: [],
  minYearsExperience: 2,
  status: 'OPEN',
  cvPassThreshold: 65,
  interviewQuestionCount: 3,
  createdById: 'hr-1',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
const closedJob: Job = { ...baseJob, id: 'job-0', title: 'Old Job', status: 'CLOSED' };

const emptyByStatus = (): Record<ApplicationStatus, number> => ({
  SUBMITTED: 0,
  SCREENING: 0,
  SCREENING_FAILED: 0,
  SCREENED: 0,
  SHORTLISTED: 0,
  REJECTED: 0,
  INTERVIEW_INVITED: 0,
  INTERVIEWING: 0,
  EVALUATED: 0,
  PASSED: 0,
  FAILED: 0,
});

const RANGES = [
  '0-9',
  '10-19',
  '20-29',
  '30-39',
  '40-49',
  '50-59',
  '60-69',
  '70-79',
  '80-89',
  '90-100',
];

function makeStats(overrides: Partial<JobStats> = {}): JobStats {
  return {
    totalApplications: 20,
    byStatus: {
      ...emptyByStatus(),
      SUBMITTED: 1,
      SCREENING: 2,
      SCREENING_FAILED: 1,
      SCREENED: 4,
      SHORTLISTED: 1,
      INTERVIEW_INVITED: 3,
      PASSED: 2,
      REJECTED: 6,
    },
    scoreDistribution: RANGES.map((range, index) => ({ range, count: index >= 4 ? 2 : 1 })),
    byRecommendation: { PASS: 8, CONSIDER: 5, REJECT: 3, unrated: 4 },
    aiPassRate: 0.5,
    hrAgreementRate: 0.75,
    ...overrides,
  };
}

type MyJobsReturn = ReturnType<typeof useJobsModule.useMyJobs>;
type JobStatsReturn = ReturnType<typeof useJobStatsModule.useJobStats>;

function setup({
  jobs = [closedJob, baseJob],
  jobsLoading = false,
  stats = makeStats(),
  statsLoading = false,
  statsError = null as unknown,
}: {
  jobs?: Job[];
  jobsLoading?: boolean;
  stats?: JobStats | undefined;
  statsLoading?: boolean;
  statsError?: unknown;
} = {}) {
  vi.spyOn(useJobsModule, 'useMyJobs').mockReturnValue({
    data: jobsLoading
      ? undefined
      : { data: jobs, meta: { page: 1, limit: 100, total: jobs.length, totalPages: 1 } },
    isLoading: jobsLoading,
    isError: false,
    refetch: vi.fn(),
  } as unknown as MyJobsReturn);

  const statsSpy = vi.spyOn(useJobStatsModule, 'useJobStats').mockReturnValue({
    data: statsLoading || statsError ? undefined : stats,
    isLoading: statsLoading,
    isError: Boolean(statsError),
    error: statsError,
    isPlaceholderData: false,
    refetch: vi.fn(),
  } as unknown as JobStatsReturn);
  return { statsSpy };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(url = '/hr/stats?jobId=job-1') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/hr/stats"
          element={
            <>
              <HRStatsPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const cardValue = (label: string) =>
  within(screen.getByText(label).closest('div.p-5') as HTMLElement).getByText(
    (_, el) => el?.classList.contains('text-page-title') ?? false,
  ).textContent;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HRStatsPage', () => {
  it('tính 5 thẻ số liệu từ API stats', () => {
    setup();
    renderPage();

    expect(cardValue('Tổng hồ sơ')).toBe('20');
    expect(cardValue('Đang chấm')).toBe('3'); // SUBMITTED + SCREENING
    expect(cardValue('Đã duyệt')).toBe('6'); // SHORTLISTED + INTERVIEW_INVITED + PASSED
    expect(cardValue('Đã loại')).toBe('6');
    expect(cardValue('AI đề xuất đạt')).toBe('50%');
    expect(screen.getByText('trên 16 hồ sơ đã chấm')).toBeDefined();
  });

  it('hiện ngưỡng đạt theo cấu hình của job, không cố định 70', () => {
    setup();
    renderPage();

    expect(screen.getByText('Ngưỡng đạt ≥ 65')).toBeDefined();
    expect(screen.getByText('65 điểm')).toBeDefined();
  });

  it('chia đề xuất AI 3 mức, ghi riêng hồ sơ chưa đánh giá và tỷ lệ HR đồng ý', () => {
    setup();
    renderPage();

    const pass = screen.getByTestId('recommendation-PASS');
    expect(within(pass).getByText('Nên chọn')).toBeDefined();
    expect(within(pass).getByText('8')).toBeDefined();
    expect(within(pass).getByText('50%')).toBeDefined(); // 8 / (8 + 5 + 3)
    expect(screen.getByText('Chưa đánh giá: 4 hồ sơ')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('hiện "—" khi chưa có dữ liệu tỷ lệ HR đồng ý với AI', () => {
    setup({ stats: makeStats({ hrAgreementRate: null }) });
    renderPage();

    expect(screen.getByText('HR đồng ý với AI:', { exact: false }).textContent).toContain('—');
  });

  it('mặc định chọn job đang mở khi URL không có jobId', () => {
    const { statsSpy } = setup();
    renderPage('/hr/stats');

    expect(screen.getByTestId('location').textContent).toBe('?jobId=job-1');
    expect(statsSpy).toHaveBeenCalledWith('job-1');
  });

  it('jobId không hợp lệ trên URL thì quay về job mặc định', () => {
    setup();
    renderPage('/hr/stats?jobId=not-mine');

    expect(screen.getByTestId('location').textContent).toBe('?jobId=job-1');
  });

  it('hiện trạng thái rỗng khi job chưa có hồ sơ', () => {
    setup({
      stats: makeStats({
        totalApplications: 0,
        byStatus: emptyByStatus(),
        scoreDistribution: RANGES.map((range) => ({ range, count: 0 })),
        byRecommendation: { PASS: 0, CONSIDER: 0, REJECT: 0, unrated: 0 },
        aiPassRate: 0,
        hrAgreementRate: null,
      }),
    });
    renderPage();

    expect(screen.getByText('Job này chưa có hồ sơ nào')).toBeDefined();
    expect(screen.queryByText('Tổng hồ sơ')).toBeNull();
  });

  it('hiện EmptyState khi HR chưa có tin tuyển dụng', () => {
    setup({ jobs: [] });
    renderPage('/hr/stats');

    expect(screen.getByText('Chưa có tin tuyển dụng nào')).toBeDefined();
  });

  it('hiện skeleton khi đang tải stats', () => {
    setup({ statsLoading: true });
    renderPage();

    expect(screen.getByLabelText('Đang tải thống kê')).toBeDefined();
    expect(screen.queryByText('Tổng hồ sơ')).toBeNull();
  });

  it('hiện lỗi kèm nút thử lại khi API stats lỗi', () => {
    setup({
      statsError: new ApiError('Bạn không có quyền xem tin tuyển dụng này', {
        kind: 'http',
        status: 403,
      }),
    });
    renderPage();

    expect(screen.getByRole('alert').textContent).toContain(
      'Bạn không có quyền xem tin tuyển dụng này',
    );
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined();
  });
});
