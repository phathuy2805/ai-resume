import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as applicationsApi from '@/api/applications';
import { useJobApplications } from './useJobApplications';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useJobApplications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bật refetchInterval = 5000 khi có hồ sơ đang SUBMITTED hoặc SCREENING', async () => {
    vi.spyOn(applicationsApi, 'getJobApplications').mockResolvedValue({
      data: [
        {
          id: 'app-1',
          candidateName: 'Ứng viên 1',
          totalScore: null,
          aiRecommendation: null,
          status: 'SCREENING',
          createdAt: '2026-11-20T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useJobApplications('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data[0].status).toBe('SCREENING');
  });

  it('tắt refetchInterval (false) khi tất cả hồ sơ đã chấm xong (SCREENED)', async () => {
    vi.spyOn(applicationsApi, 'getJobApplications').mockResolvedValue({
      data: [
        {
          id: 'app-1',
          candidateName: 'Ứng viên 1',
          totalScore: 85,
          aiRecommendation: 'PASS',
          status: 'SCREENED',
          createdAt: '2026-11-20T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    const { result } = renderHook(() => useJobApplications('job-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0].status).toBe('SCREENED');
  });
});
