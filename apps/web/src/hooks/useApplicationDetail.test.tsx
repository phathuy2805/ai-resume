import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as applicationsApi from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { ApiError } from '@/types/api';
import type { ApplicationDetail, ApplicationStatus } from '@/types/applications';
import { useApplication, useDecideApplication } from './useApplicationDetail';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useApplication', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const mockGet = (status: ApplicationStatus) =>
    vi
      .spyOn(applicationsApi, 'getApplication')
      .mockResolvedValue({ id: 'app-1', status } as ApplicationDetail);

  it.each([
    ['SUBMITTED', 2],
    ['SCREENING', 2],
    ['SCREENING_FAILED', 1],
    ['SCREENED', 1],
    ['INTERVIEW_INVITED', 1],
  ] as const)('%s: sau 5 giây đã gọi API %i lần', async (status, calls) => {
    const get = mockGet(status);
    renderHook(() => useApplication('app-1'), { wrapper: setup().wrapper });

    await act(() => vi.advanceTimersByTimeAsync(5500));
    expect(get).toHaveBeenCalledTimes(calls);
  });
});

describe('useDecideApplication', () => {
  function setupDecide() {
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.applications.byJob('job-1', { page: 1 }), {});
    client.setQueryData(queryKeys.applications.detail('app-1'), {});
    const { result } = renderHook(() => useDecideApplication('app-1', 'job-1'), { wrapper });
    const expectRefreshed = () => {
      for (const key of [
        queryKeys.applications.byJob('job-1', { page: 1 }),
        queryKeys.applications.detail('app-1'),
      ])
        expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    };
    return { result, expectRefreshed };
  }

  it.each([
    ['APPROVE', 'Đã duyệt hồ sơ và gửi lời mời phỏng vấn'],
    ['REJECT', 'Đã loại hồ sơ ứng viên'],
  ] as const)('%s thành công: toast và làm mới chi tiết + danh sách', async (decision, message) => {
    const success = vi.spyOn(toast, 'success').mockReturnValue('');
    vi.spyOn(applicationsApi, 'decideApplication').mockResolvedValue({
      id: 'app-1',
      status: 'REJECTED',
      interviewId: null,
      hrDecisionById: 'hr-1',
      hrDecisionAt: null,
      hrNote: null,
    });
    const { result, expectRefreshed } = setupDecide();

    await act(() => result.current.mutateAsync({ decision }));

    expect(success).toHaveBeenCalledWith(message);
    expectRefreshed();
  });

  it.each([
    [409, 'Hồ sơ đã được quyết định hoặc đang được chấm lại. Dữ liệu đã được tải lại.'],
    [403, 'Thông báo từ máy chủ'],
  ])('lỗi %i: toast đúng nội dung và làm mới dữ liệu', async (status, message) => {
    const error = vi.spyOn(toast, 'error').mockReturnValue('');
    vi.spyOn(applicationsApi, 'decideApplication').mockRejectedValue(
      new ApiError('Thông báo từ máy chủ', { kind: 'http', status }),
    );
    const { result, expectRefreshed } = setupDecide();

    await act(() => result.current.mutateAsync({ decision: 'APPROVE' }).catch(() => undefined));

    expect(error).toHaveBeenCalledWith(message);
    expectRefreshed();
  });
});
