import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as applicationsApi from '@/api/applications';
import { queryKeys } from '@/api/queryKeys';
import { ApiError } from '@/types/api';
import type { ApplicationStatus } from '@/types/applications';
import { useJobApplications, useRescreenApplication } from './useJobApplications';

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

describe('useJobApplications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function mockList(status: ApplicationStatus) {
    return vi.spyOn(applicationsApi, 'getJobApplications').mockResolvedValue({
      data: [
        {
          id: 'app-1',
          candidateName: 'Ứng viên 1',
          totalScore: null,
          aiRecommendation: null,
          status,
          createdAt: '2026-11-20T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  }

  it.each(['SUBMITTED', 'SCREENING'] as const)(
    'tự làm mới mỗi 5 giây khi còn hồ sơ %s',
    async (status) => {
      const list = mockList(status);
      renderHook(() => useJobApplications('job-1'), { wrapper: setup().wrapper });

      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(list).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(4500));
      expect(list).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(1000));
      expect(list).toHaveBeenCalledTimes(2);
    },
  );

  it('dừng tự làm mới khi mọi hồ sơ đã chấm xong', async () => {
    const list = mockList('SCREENING');
    renderHook(() => useJobApplications('job-1'), { wrapper: setup().wrapper });
    await act(() => vi.advanceTimersByTimeAsync(100));

    list.mockClear();
    mockList('SCREENED');
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(list).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(list).toHaveBeenCalledTimes(1);
  });
});

describe('useRescreenApplication', () => {
  function setupRescreen() {
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.applications.byJob('job-1', { page: 1 }), {});
    client.setQueryData(queryKeys.applications.detail('app-1'), {});
    client.setQueryData(queryKeys.applications.detail('app-2'), {});
    const { result } = renderHook(() => useRescreenApplication('job-1'), { wrapper });
    const isStale = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    return { result, isStale };
  }

  it('thành công: làm mới danh sách và trang chi tiết của đúng hồ sơ đó', async () => {
    vi.spyOn(toast, 'success').mockReturnValue('');
    vi.spyOn(applicationsApi, 'rescreenApplication').mockResolvedValue();
    const { result, isStale } = setupRescreen();

    await act(() => result.current.mutateAsync('app-1'));

    expect(isStale(queryKeys.applications.byJob('job-1', { page: 1 }))).toBe(true);
    expect(isStale(queryKeys.applications.detail('app-1'))).toBe(true);
    expect(isStale(queryKeys.applications.detail('app-2'))).toBe(false);
  });

  it('lỗi 409: vẫn làm mới danh sách và trang chi tiết', async () => {
    const toastError = vi.spyOn(toast, 'error').mockReturnValue('');
    vi.spyOn(applicationsApi, 'rescreenApplication').mockRejectedValue(
      new ApiError('SCREENED', { kind: 'http', status: 409 }),
    );
    const { result, isStale } = setupRescreen();

    await act(() => result.current.mutateAsync('app-1').catch(() => undefined));

    expect(isStale(queryKeys.applications.byJob('job-1', { page: 1 }))).toBe(true);
    expect(isStale(queryKeys.applications.detail('app-1'))).toBe(true);
    expect(toastError).toHaveBeenCalledWith(
      'Hồ sơ đang được chấm hoặc đã có quyết định nên không thể chấm lại',
    );
  });
});
