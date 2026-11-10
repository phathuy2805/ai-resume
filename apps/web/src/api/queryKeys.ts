import type { JobsParams } from '@/types/jobs';
export const queryKeys = {
  auth: { all: ['auth'] as const, me: () => ['auth', 'me'] as const },
  jobs: {
    all: ['jobs'] as const,
    public: () => ['jobs', 'public'] as const,
    list: (params: JobsParams = {}) => ['jobs', 'public', { ...params }] as const,
    mine: () => ['jobs', 'mine'] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },
  applications: { all: ['applications'] as const, mine: () => ['applications', 'mine'] as const },
  // Namespace only; no interview endpoint has been assumed or implemented.
  interviews: { all: ['interviews'] as const },
};
