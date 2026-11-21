import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CandidateApplicationsPage from './CandidateApplicationsPage';
import * as useCurrentUserModule from '@/hooks/useCurrentUser';
import * as useMyApplicationsModule from '@/hooks/useMyApplications';
import type { AuthContextValue } from '@/providers/auth-context';
import type { Application, ApplicationStatus } from '@/types/applications';

type QueryResult = ReturnType<typeof useMyApplicationsModule.useMyApplications>;

const session: AuthContextValue = {
  user: {
    id: 'cand-1',
    email: 'candidate@example.com',
    fullName: 'Ứng viên thử',
    role: 'CANDIDATE',
    createdAt: '2026-11-01',
  },
  isLoading: false,
  error: null,
  retry: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
};

function mockQuery(partial: Partial<QueryResult>) {
  vi.spyOn(useCurrentUserModule, 'useCurrentUser').mockReturnValue(session);
  vi.spyOn(useMyApplicationsModule, 'useMyApplications').mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    ...partial,
  } as unknown as QueryResult);
}

function renderPage(ui: ReactElement = <CandidateApplicationsPage />) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function app(id: string, status: ApplicationStatus, extra: Partial<Application> = {}): Application {
  return {
    id,
    status,
    job: { id: `job-${id}`, title: `Job ${id}` },
    cvFileName: `${id}.pdf`,
    cvSizeBytes: 1024,
    cvMimeType: 'application/pdf',
    aiRecommendation: 'REJECT',
    createdAt: '2026-11-19T10:00:00Z',
    updatedAt: '2026-11-19T10:00:00Z',
    ...extra,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CandidateApplicationsPage', () => {
  it('hiển thị skeleton khi đang tải hồ sơ', () => {
    mockQuery({ isPending: true });
    renderPage();
    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ…' })).toBeDefined();
  });

  it('hiển thị trạng thái rỗng với nút "Tìm việc" về /candidate/jobs', () => {
    mockQuery({ data: [] });
    renderPage();
    expect(screen.getByText('Bạn chưa nộp hồ sơ nào')).toBeDefined();
    expect(screen.getByRole('link', { name: /Tìm việc/ }).getAttribute('href')).toBe(
      '/candidate/jobs',
    );
  });

  it('nút phỏng vấn dùng interviewId, fallback về id hồ sơ khi BE chưa trả (W2-BE-04)', () => {
    mockQuery({
      data: [
        app('a1', 'INTERVIEW_INVITED', { interviewId: 'iv-1' }),
        app('a2', 'INTERVIEWING', { interviewId: null }),
      ],
    });
    renderPage();
    expect(screen.getByRole('link', { name: /Vào phỏng vấn/ }).getAttribute('href')).toBe(
      '/candidate/interviews/iv-1',
    );
    expect(screen.getByRole('link', { name: /Tiếp tục phỏng vấn/ }).getAttribute('href')).toBe(
      '/candidate/interviews/a2',
    );
  });

  it('PASSED/FAILED có nút "Xem phản hồi" dẫn tới trang feedback', () => {
    mockQuery({ data: [app('p1', 'PASSED'), app('f1', 'FAILED')] });
    renderPage();
    const hrefs = screen
      .getAllByRole('link', { name: /Xem phản hồi/ })
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '/candidate/applications/p1/feedback',
      '/candidate/applications/f1/feedback',
    ]);
  });

  it('không có nút hành động ở các trạng thái đang xét duyệt / chờ kết quả / bị loại', () => {
    mockQuery({
      data: [app('s1', 'SCREENING'), app('e1', 'EVALUATED'), app('r1', 'REJECTED')],
    });
    renderPage();
    expect(screen.queryByRole('link', { name: /phỏng vấn|Xem phản hồi/ })).toBeNull();
  });

  it('không lộ điểm, đề xuất AI hay chữ "lỗi" với mọi trạng thái', () => {
    const all: ApplicationStatus[] = [
      'SUBMITTED',
      'SCREENING',
      'SCREENING_FAILED',
      'SCREENED',
      'SHORTLISTED',
      'REJECTED',
      'INTERVIEW_INVITED',
      'INTERVIEWING',
      'EVALUATED',
      'PASSED',
      'FAILED',
    ];
    mockQuery({ data: all.map((status, i) => app(`x${i}`, status)) });
    const { container } = renderPage();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/điểm|lỗi|Nên chọn|Cân nhắc|Không phù hợp/i);
    expect(screen.getAllByText('Đang xét duyệt')).toHaveLength(5);
  });
});
