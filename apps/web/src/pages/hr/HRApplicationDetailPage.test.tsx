import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as applicationsApi from '@/api/applications';
import * as useApplicationDetailModule from '@/hooks/useApplicationDetail';
import HRApplicationDetailPage from './HRApplicationDetailPage';
import { ApiError } from '@/types/api';
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
      requiredSkills: { score: 90, weight: 35, matched: ['Node.js', 'TypeScript'], missing: [] },
      preferredSkills: { score: 70, weight: 10, matched: ['Docker'], missing: ['Redis'] },
      experienceYears: { score: 85, weight: 15, candidateYears: 4, requiredYears: 3 },
      relevance: { score: 80, weight: 25, comment: 'Đúng chuyên môn' },
      similarity: { score: 75, weight: 15, cosine: 0.8 },
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
    mutateAsync: vi.fn(),
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
});

describe('HRApplicationDetailPage', () => {
  it('hiển thị đầy đủ thông tin Header Card (tên, email, vị trí, điểm số, đề xuất)', () => {
    setupMocks();
    renderComponent();

    expect(screen.getByText('Hoàng Minh Tuấn')).toBeDefined();
    expect(screen.getByText('tuan.hm@example.com')).toBeDefined();
    expect(screen.getByText('Senior Node.js Developer')).toBeDefined();
    expect(screen.getByText('82')).toBeDefined();
    expect(screen.getByText('Đề xuất AI: Nên chọn')).toBeDefined();
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
    expect(screen.getAllByText(/Trọng số:/).map((el) => el.textContent)).toEqual([
      '(Trọng số: 35%)',
      '(Trọng số: 10%)',
      '(Trọng số: 15%)',
      '(Trọng số: 25%)',
      '(Trọng số: 15%)',
    ]);

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

// Hook thật, chỉ giả lập tầng API: kiểm tra cả vòng gọi API → toast → tải lại → giao diện.
describe('HRApplicationDetailPage (hook thật)', () => {
  const httpError = (status: number, message = 'Thông báo từ máy chủ') =>
    new ApiError(message, { kind: 'http', status });

  function renderPage(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/hr/applications/app-100']}>
          <Routes>
            <Route path="/hr/applications/:id" element={<HRApplicationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    return client;
  }

  function mockGet(detail: Partial<ApplicationDetail> = {}) {
    return vi
      .spyOn(applicationsApi, 'getApplication')
      .mockResolvedValue({ ...mockDetail, ...detail });
  }

  const decided: Partial<ApplicationDetail> = {
    status: 'INTERVIEW_INVITED',
    hrDecisionBy: { id: 'hr-1', fullName: 'HR Leader' },
    hrDecisionAt: '2026-11-21T14:30:00Z',
    hrNote: 'Phù hợp',
  };

  let toastSuccess: ReturnType<typeof vi.spyOn>;
  let toastError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    toastSuccess = vi.spyOn(toast, 'success').mockReturnValue('');
    toastError = vi.spyOn(toast, 'error').mockReturnValue('');
  });

  it('Duyệt: gửi quyết định kèm ghi chú, báo thành công, đóng hộp và hiện người quyết định', async () => {
    const get = mockGet();
    const decide = vi.spyOn(applicationsApi, 'decideApplication').mockImplementation(async () => {
      get.mockResolvedValue({ ...mockDetail, ...decided });
      return {
        id: 'app-100',
        status: 'INTERVIEW_INVITED',
        interviewId: 'int-1',
        hrDecisionById: 'hr-1',
        hrDecisionAt: '2026-11-21T14:30:00Z',
        hrNote: 'Phù hợp',
      };
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ }));
    const note = screen.getByLabelText(/Ghi chú của HR/) as HTMLTextAreaElement;
    expect(note.maxLength).toBe(1000);
    fireEvent.change(note, { target: { value: '  Phù hợp  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt hồ sơ' }));

    expect(await screen.findByText('HR Leader')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(decide).toHaveBeenCalledWith('app-100', { decision: 'APPROVE', note: 'Phù hợp' });
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ })).toBeNull();
  });

  it('Loại: không nhập ghi chú thì không gửi note', async () => {
    mockGet();
    const decide = vi.spyOn(applicationsApi, 'decideApplication').mockResolvedValue({
      id: 'app-100',
      status: 'REJECTED',
      interviewId: null,
      hrDecisionById: 'hr-1',
      hrDecisionAt: '2026-11-21T14:30:00Z',
      hrNote: null,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Loại hồ sơ' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Loại hồ sơ' }),
    );

    await waitFor(() =>
      expect(decide).toHaveBeenCalledWith('app-100', { decision: 'REJECT', note: undefined }),
    );
  });

  it('409: báo dễ hiểu, tải lại dữ liệu và đóng hộp xác nhận', async () => {
    const get = mockGet();
    vi.spyOn(applicationsApi, 'decideApplication').mockImplementation(async () => {
      get.mockResolvedValue({ ...mockDetail, ...decided });
      throw httpError(409, 'Chỉ có thể duyệt hồ sơ đang ở trạng thái SCREENED');
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt hồ sơ' }));

    expect(await screen.findByText('HR Leader')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Hồ sơ đã được quyết định hoặc đang được chấm lại'),
    );
  });

  it('lỗi khác 409 khi quyết định: giữ hộp mở và giữ ghi chú đã nhập', async () => {
    mockGet();
    vi.spyOn(applicationsApi, 'decideApplication').mockRejectedValue(httpError(503));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Duyệt \(mời phỏng vấn\)/ }));
    fireEvent.change(screen.getByLabelText(/Ghi chú của HR/), { target: { value: 'Giữ lại' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt hồ sơ' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Thông báo từ máy chủ'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Duyệt hồ sơ' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    expect((screen.getByLabelText(/Ghi chú của HR/) as HTMLTextAreaElement).value).toBe('Giữ lại');
  });

  it('làm mới nền lỗi 503: giữ nguyên hồ sơ, báo dữ liệu có thể đã cũ', async () => {
    const get = mockGet();
    const client = renderPage();
    await screen.findByText('Hoàng Minh Tuấn');

    get.mockRejectedValue(httpError(503));
    await client.refetchQueries();

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText('Hoàng Minh Tuấn')).toBeDefined();
    expect(screen.queryByText('Không tìm thấy hồ sơ ứng viên')).toBeNull();

    get.mockResolvedValue(mockDetail);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('tải lần đầu lỗi 503: không báo "không tìm thấy", bấm Thử lại thì hiện hồ sơ', async () => {
    const get = mockGet();
    get.mockRejectedValueOnce(httpError(503));
    renderPage();

    expect(await screen.findByText('Không thể tải hồ sơ ứng viên')).toBeDefined();
    expect(screen.queryByText('Không tìm thấy hồ sơ ứng viên')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Hoàng Minh Tuấn')).toBeDefined();
  });

  it.each([400, 403, 404])(
    'lỗi %i: báo không tìm thấy hồ sơ, không có nút Thử lại',
    async (code) => {
      mockGet().mockRejectedValue(httpError(code));
      renderPage();

      expect(await screen.findByText('Không tìm thấy hồ sơ ứng viên')).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();
    },
  );

  it.each(['SUBMITTED', 'SCREENING'] as const)(
    '%s: báo đang chấm, không hiện điểm và nút quyết định',
    async (status) => {
      mockGet({ status, screeningResult: null, aiRecommendation: null });
      renderPage();

      expect(await screen.findByText('AI đang sàng lọc và chấm điểm hồ sơ')).toBeDefined();
      expect(screen.queryByText('/100')).toBeNull();
      expect(screen.queryByRole('button', { name: /Duyệt|Loại|Chấm lại/ })).toBeNull();
    },
  );

  const failed: Partial<ApplicationDetail> = {
    status: 'SCREENING_FAILED',
    screeningResult: null,
    aiRecommendation: null,
    screeningError: 'PARSE: Gemini request failed',
  };

  it('SCREENING_FAILED: hiện lý do, bấm Chấm lại thì gọi API và chuyển sang đang chấm', async () => {
    const get = mockGet(failed);
    const rescreen = vi
      .spyOn(applicationsApi, 'rescreenApplication')
      .mockImplementation(async () => {
        get.mockResolvedValue({
          ...mockDetail,
          ...failed,
          status: 'SCREENING',
          screeningError: null,
        });
      });
    renderPage();

    expect(await screen.findByText('Lý do: PARSE: Gemini request failed')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Duyệt|Loại/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Chấm lại/ }));

    expect(await screen.findByText('AI đang sàng lọc và chấm điểm hồ sơ')).toBeDefined();
    expect(rescreen.mock.calls[0][0]).toBe('app-100');
    expect(toastSuccess).toHaveBeenCalledWith('Đã gửi yêu cầu chấm lại CV');
  });

  it('Chấm lại bị 409: báo lỗi dễ hiểu và tải lại trạng thái mới', async () => {
    const get = mockGet(failed);
    vi.spyOn(applicationsApi, 'rescreenApplication').mockImplementation(async () => {
      get.mockResolvedValue({ ...mockDetail, ...failed, status: 'SCREENING' });
      throw httpError(409, 'Chỉ có thể chấm lại hồ sơ SCREENED hoặc SCREENING_FAILED');
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Chấm lại/ }));

    expect(await screen.findByText('AI đang sàng lọc và chấm điểm hồ sơ')).toBeDefined();
    expect(toastError).toHaveBeenCalledWith(
      'Hồ sơ đang được chấm hoặc đã có quyết định nên không thể chấm lại',
    );
  });
});
