import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as applicationsApi from '@/api/applications';
import * as useApplicationDetailModule from '@/hooks/useApplicationDetail';
import HRApplicationDetailPage from './HRApplicationDetailPage';
import type { ApplicationDetail } from '@/types/applications';

const mockDetail: ApplicationDetail = {
  id: 'app-100',
  status: 'SCREENED',
  cvFileName: 'cv.pdf',
  cvSizeBytes: 1024,
  cvMimeType: 'application/pdf',
  aiRecommendation: 'PASS',
  screeningError: null,
  candidate: {
    id: 'user-1',
    fullName: 'Hoàng Minh Tuấn',
    email: 'tuan.hm@example.com',
  },
  job: {
    id: 'job-1',
    title: 'Senior Node.js Developer',
    cvPassThreshold: 70,
  },
  screeningResult: {
    totalScore: 82,
    breakdown: {
      requiredSkills: { score: 90, weight: 40, matched: ['Node.js', 'TypeScript'], missing: [] },
      preferredSkills: { score: 70, weight: 15, matched: ['Docker'], missing: ['Redis'] },
      experienceYears: { score: 85, weight: 20, candidateYears: 4, requiredYears: 3 },
      relevance: { score: 80, weight: 15, comment: 'Đúng chuyên môn' },
      similarity: { score: 75, weight: 10, cosine: 0.8 },
      capped: false,
    },
    explanation: {
      summary: 'Ứng viên có kỹ năng backend rất tốt và kinh nghiệm thực chiến.',
      strengths: [
        {
          point: 'Kinh nghiệm sâu với NestJS',
          quote: 'Đã xây dựng kiến trúc microservices với NestJS',
        },
      ],
      gaps: [{ skill: 'Redis', note: 'Chưa thấy kinh nghiệm caching với Redis' }],
    },
    timings: {
      parseCvMs: 100,
      embedMs: 200,
      scoreMs: 300,
      explainMs: 400,
      totalMs: 1000,
    },
    processingDurationMs: 1200,
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  },
  hrDecisionBy: null,
  hrDecisionAt: null,
  hrNote: null,
  interviewId: null,
  statusHistories: [
    {
      id: 'h1',
      fromStatus: null,
      toStatus: 'SUBMITTED',
      changedById: 'user-1',
      reason: null,
      changedAt: '2026-11-20T09:00:00Z',
    },
    {
      id: 'h2',
      fromStatus: 'SUBMITTED',
      toStatus: 'SCREENED',
      changedById: null,
      reason: 'AI screening finished',
      changedAt: '2026-11-20T10:00:00Z',
    },
  ],
  createdAt: '2026-11-20T09:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
};

const mockMutateAsync = vi.fn();

type ApplicationQueryReturn = ReturnType<typeof useApplicationDetailModule.useApplication>;
type DecideMutationReturn = ReturnType<typeof useApplicationDetailModule.useDecideApplication>;

function setupMocks(detail: Partial<ApplicationDetail> = {}) {
  vi.spyOn(useApplicationDetailModule, 'useApplication').mockReturnValue({
    data: { ...mockDetail, ...detail },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ApplicationQueryReturn);

  vi.spyOn(useApplicationDetailModule, 'useDecideApplication').mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as unknown as DecideMutationReturn);
}

function renderComponent(ui: ReactElement = <HRApplicationDetailPage />) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/hr/applications/app-100']}>
        <Routes>
          <Route path="/hr/applications/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockMutateAsync.mockReset();
});

describe('HRApplicationDetailPage', () => {
  it('hiển thị đầy đủ thông tin Header Card (tên, email, vị trí, điểm số, đề xuất)', () => {
    setupMocks();
    renderComponent();

    expect(screen.getByText('Hoàng Minh Tuấn')).toBeDefined();
    expect(screen.getByText('tuan.hm@example.com')).toBeDefined();
    expect(screen.getByText('Senior Node.js Developer')).toBeDefined();
    expect(screen.getByText('82')).toBeDefined();
    expect(screen.getByText('Nên chọn')).toBeDefined();
    expect(screen.getByText(/Ngưỡng đạt:/)).toBeDefined();
    expect(screen.getByText(/70 điểm/)).toBeDefined();
  });

  it('bấm "Xem CV gốc" gọi getCvUrl và mở tab mới với window.open', async () => {
    setupMocks();
    vi.spyOn(applicationsApi, 'getCvUrl').mockResolvedValueOnce({
      url: 'https://s3.amazonaws.com/test-bucket/cv.pdf',
      expiresInSec: 600,
    });

    renderComponent();

    const cvBtn = screen.getByRole('button', { name: /Xem CV gốc/ });
    fireEvent.click(cvBtn);

    await waitFor(() => {
      expect(applicationsApi.getCvUrl).toHaveBeenCalledWith('app-100');
      expect(window.open).toHaveBeenCalledWith(
        'https://s3.amazonaws.com/test-bucket/cv.pdf',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  it('hiển thị cảnh báo capped khi breakdown.capped === true', () => {
    setupMocks({
      screeningResult: {
        ...mockDetail.screeningResult!,
        breakdown: {
          ...mockDetail.screeningResult!.breakdown,
          capped: true,
        },
      },
    });

    renderComponent();

    expect(screen.getByText('Bị giới hạn 49 điểm do thiếu quá nửa kỹ năng bắt buộc')).toBeDefined();
  });

  it('hiển thị 5 thanh điểm thành phần, kỹ năng khớp/thiếu và trích dẫn CV', () => {
    setupMocks();
    renderComponent();

    // 5 component categories
    expect(screen.getAllByText(/Kỹ năng bắt buộc/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kỹ năng ưu tiên/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Kinh nghiệm làm việc/)).toBeDefined();
    expect(screen.getByText(/Mức độ phù hợp/)).toBeDefined();
    expect(screen.getByText(/Độ tương đồng ngữ nghĩa/)).toBeDefined();

    // Skills
    expect(screen.getByText('Node.js')).toBeDefined();
    expect(screen.getByText('TypeScript')).toBeDefined();
    expect(screen.getByText('Docker')).toBeDefined();
    expect(screen.getAllByText('Redis').length).toBeGreaterThanOrEqual(1);

    // Explanation & Quote
    expect(
      screen.getByText('Ứng viên có kỹ năng backend rất tốt và kinh nghiệm thực chiến.'),
    ).toBeDefined();
    expect(screen.getByText(/Kinh nghiệm sâu với NestJS/)).toBeDefined();
    expect(screen.getByText(/Đã xây dựng kiến trúc microservices với NestJS/)).toBeDefined();
  });

  it('hiển thị cảnh báo chọn khác AI khi bấm Loại nhưng AI đề xuất PASS', () => {
    setupMocks({ aiRecommendation: 'PASS' });
    renderComponent();

    // Click button "Loại hồ sơ"
    const rejectBtn = screen.getByRole('button', { name: /Loại hồ sơ/ });
    fireEvent.click(rejectBtn);

    // Alert dialog opens with warning
    expect(screen.getByText('Bạn đang chọn khác đề xuất của AI')).toBeDefined();
  });

  it('hiển thị cảnh báo chọn khác AI khi bấm Duyệt nhưng AI đề xuất REJECT', () => {
    setupMocks({ aiRecommendation: 'REJECT' });
    renderComponent();

    // Click button "Duyệt (mời phỏng vấn)"
    const approveBtn = screen.getByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ });
    fireEvent.click(approveBtn);

    // Alert dialog opens with warning
    expect(screen.getByText('Bạn đang chọn khác đề xuất của AI')).toBeDefined();
  });

  it('KHÔNG hiển thị cảnh báo chọn khác AI khi AI đề xuất CONSIDER', () => {
    setupMocks({ aiRecommendation: 'CONSIDER' });
    renderComponent();

    const approveBtn = screen.getByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ });
    fireEvent.click(approveBtn);

    expect(screen.queryByText('Bạn đang chọn khác đề xuất của AI')).toBeNull();
  });

  it('hiển thị thông tin quyết định khi hồ sơ đã được xử lý (isDecided)', () => {
    setupMocks({
      status: 'INTERVIEW_INVITED',
      hrDecisionBy: { id: 'hr-1', fullName: 'HR Leader' },
      hrDecisionAt: '2026-11-21T14:30:00Z',
      hrNote: 'Ứng viên đạt yêu cầu chuyên môn rất tốt.',
    });

    renderComponent();

    expect(screen.queryByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ })).toBeNull();
    expect(screen.getByText('HR Leader')).toBeDefined();
    expect(screen.getByText('Ứng viên đạt yêu cầu chuyên môn rất tốt.')).toBeDefined();
  });
});
