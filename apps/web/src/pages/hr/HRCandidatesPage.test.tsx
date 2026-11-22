import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as useJobApplicationsModule from '@/hooks/useJobApplications';
import * as useJobsModule from '@/hooks/useJobs';
import HRCandidatesPage from './HRCandidatesPage';
import type { JobApplicationListItem } from '@/types/applications';
import type { Job } from '@/types/jobs';

const mockJob: Job = {
  id: 'job-1',
  title: 'Backend Engineer',
  description: 'Test job',
  requiredSkills: ['Node.js'],
  preferredSkills: ['PostgreSQL'],
  minYearsExperience: 2,
  status: 'OPEN',
  cvPassThreshold: 70,
  interviewQuestionCount: 3,
  createdById: 'hr-1',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

const mockMutate = vi.fn();

type MyJobsReturn = ReturnType<typeof useJobsModule.useMyJobs>;
type MyJobReturn = ReturnType<typeof useJobsModule.useMyJob>;
type JobAppsReturn = ReturnType<typeof useJobApplicationsModule.useJobApplications>;
type RescreenReturn = ReturnType<typeof useJobApplicationsModule.useRescreenApplication>;

function setupMocks({
  applications = [],
  isLoading = false,
  isError = false,
  total = applications.length,
}: {
  applications?: JobApplicationListItem[];
  isLoading?: boolean;
  isError?: boolean;
  total?: number;
}) {
  vi.spyOn(useJobsModule, 'useMyJobs').mockReturnValue({
    data: { data: [mockJob], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    isLoading: false,
  } as unknown as MyJobsReturn);

  vi.spyOn(useJobsModule, 'useMyJob').mockReturnValue({
    data: mockJob,
    isLoading: false,
  } as unknown as MyJobReturn);

  vi.spyOn(useJobApplicationsModule, 'useJobApplications').mockReturnValue({
    data: { data: applications, meta: { page: 1, limit: 10, total, totalPages: 1 } },
    isLoading,
    isError,
    refetch: vi.fn(),
  } as unknown as JobAppsReturn);

  vi.spyOn(useJobApplicationsModule, 'useRescreenApplication').mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as RescreenReturn);
}

function renderComponent(ui: ReactElement = <HRCandidatesPage />) {
  return render(
    <MemoryRouter initialEntries={['/hr/jobs/job-1/candidates']}>
      <Routes>
        <Route path="/hr/jobs/:jobId/candidates" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockMutate.mockReset();
});

describe('HRCandidatesPage', () => {
  it('hiển thị danh sách ứng viên với tên, email và trạng thái', () => {
    setupMocks({
      applications: [
        {
          id: 'app-1',
          candidateName: 'Nguyễn Văn A',
          candidateEmail: 'vana@example.com',
          totalScore: 85,
          aiRecommendation: 'PASS',
          status: 'SCREENED',
          createdAt: '2026-11-20T08:30:00Z',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    expect(screen.getByText('vana@example.com')).toBeDefined();
    expect(screen.getByText('85')).toBeDefined();
    expect(screen.getByText('Nên chọn')).toBeDefined();
    expect(screen.getByText('Chờ duyệt')).toBeDefined();
  });

  it('ẩn điểm và hiện spinner "Đang chấm…" khi hồ sơ ở trạng thái SUBMITTED hoặc SCREENING', () => {
    setupMocks({
      applications: [
        {
          id: 'app-sub',
          candidateName: 'Trần Văn B',
          totalScore: null,
          aiRecommendation: null,
          status: 'SCREENING',
          createdAt: '2026-11-20T08:30:00Z',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('Trần Văn B')).toBeDefined();
    expect(screen.getByText('Đang chấm…')).toBeDefined();
    expect(screen.queryByText('/100')).toBeNull();
  });

  it('hiển thị "Chấm lỗi" và nút "Chấm lại" khi hồ sơ SCREENING_FAILED', () => {
    setupMocks({
      applications: [
        {
          id: 'app-fail',
          candidateName: 'Lê Thị C',
          totalScore: null,
          aiRecommendation: null,
          status: 'SCREENING_FAILED',
          createdAt: '2026-11-20T08:30:00Z',
        },
      ],
    });

    renderComponent();

    expect(screen.getByText('Lê Thị C')).toBeDefined();
    expect(screen.getByText('Chấm lỗi')).toBeDefined();
    const rescreenBtn = screen.getByRole('button', { name: /Chấm lại/ });
    expect(rescreenBtn).toBeDefined();

    fireEvent.click(rescreenBtn);
    expect(mockMutate).toHaveBeenCalledWith('app-fail');
  });

  it('tô màu điểm chuẩn xác theo ngưỡng cvPassThreshold', () => {
    setupMocks({
      applications: [
        // cvPassThreshold = 70
        // Score 75 >= 70: Green (PASS)
        {
          id: 'app-pass',
          candidateName: 'Ứng viên Đạt',
          totalScore: 75,
          aiRecommendation: 'PASS',
          status: 'SCREENED',
          createdAt: '2026-11-20T08:30:00Z',
        },
        // Score 65: threshold - 10 <= 65 < threshold -> Yellow (CONSIDER)
        {
          id: 'app-consider',
          candidateName: 'Ứng viên Cân nhắc',
          totalScore: 65,
          aiRecommendation: 'CONSIDER',
          status: 'SCREENED',
          createdAt: '2026-11-20T08:30:00Z',
        },
        // Score 50 < threshold - 10 -> Red (REJECT)
        {
          id: 'app-reject',
          candidateName: 'Ứng viên Dưới ngưỡng',
          totalScore: 50,
          aiRecommendation: 'REJECT',
          status: 'SCREENED',
          createdAt: '2026-11-20T08:30:00Z',
        },
      ],
    });

    renderComponent();

    const passScoreEl = screen.getByText('75').closest('span');
    expect(passScoreEl?.className).toContain('text-green-700');

    const considerScoreEl = screen.getByText('65').closest('span');
    expect(considerScoreEl?.className).toContain('text-amber-700');

    const rejectScoreEl = screen.getByText('50').closest('span');
    expect(rejectScoreEl?.className).toContain('text-red-700');
  });

  it('hiển thị empty state khi không có hồ sơ nào', () => {
    setupMocks({ applications: [] });

    renderComponent();

    expect(screen.getByText('Job này chưa có hồ sơ nào')).toBeDefined();
  });
});
