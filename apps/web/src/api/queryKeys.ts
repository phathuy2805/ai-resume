import type { JobsParams } from '@/types/jobs';

export const queryKeys = {
  auth: { all: ['auth'] as const, me: () => ['auth', 'me'] as const },
  company: { all: ['company'] as const },
  jobs: {
    all: ['jobs'] as const,
    public: () => ['jobs', 'public'] as const,
    list: (params: JobsParams = {}) => ['jobs', 'public', { ...params }] as const,
    mine: () => ['jobs', 'mine'] as const,
    /** Under `mine()` so invalidating the HR list also refreshes HR detail views. */
    mineDetail: (id: string) => ['jobs', 'mine', 'detail', id] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },
  applications: {
    all: ['applications'] as const,
    mine: (userId?: string) =>
      userId ? (['applications', 'mine', userId] as const) : (['applications', 'mine'] as const),
    byJob: (jobId: string, params?: unknown) =>
      params !== undefined
        ? (['applications', jobId, params] as const)
        : (['applications', jobId] as const),
    /** Under `byJob(jobId)` so decision/rescreen invalidations refresh the stats page too. */
    stats: (jobId: string) => ['applications', jobId, 'stats'] as const,
    detail: (id: string) => ['application', id] as const,
  },
  // Namespace only; no interview endpoint has been assumed or implemented.
  interviews: { all: ['interviews'] as const },
};
