import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/types/api';
import { notifyError } from './errorUtils';

interface ErrorMeta extends Record<string, unknown> {
  errorMode?: 'toast' | 'local' | 'silent';
}
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: ErrorMeta;
    mutationMeta: ErrorMeta;
  }
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 1 &&
    error instanceof ApiError &&
    (error.kind === 'network' ||
      (error.kind === 'http' && (error.status ?? 0) >= 500 && (error.status ?? 0) < 600))
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!query.meta?.errorMode || query.meta.errorMode === 'toast') notifyError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // A hook-level onError owns presentation (form validation, custom toast, etc.).
        if (
          !mutation.options.onError &&
          (!mutation.meta?.errorMode || mutation.meta.errorMode === 'toast')
        )
          notifyError(error);
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetryQuery },
      mutations: { retry: false },
    },
  });
}
export const queryClient = createQueryClient();
