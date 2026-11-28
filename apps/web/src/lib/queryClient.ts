import { MutationCache, QueryCache, QueryClient, type Query } from '@tanstack/react-query';
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
    error.retryable &&
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

/**
 * Query công khai, giống nhau với mọi người dùng (không phụ thuộc phiên đăng nhập).
 * Giữ lại khi đổi phiên để màn hình đang hiển thị (vd. banner công ty ở trang đăng nhập)
 * không bị mất dữ liệu khi cache bị xoá giữa lúc đang fetch.
 */
const SESSION_INDEPENDENT_ROOTS: ReadonlySet<unknown> = new Set(['company']);
const isSessionScoped = (query: Query) => !SESSION_INDEPENDENT_ROOTS.has(query.queryKey[0]);

/** Xoá toàn bộ dữ liệu gắn với phiên đăng nhập (login / logout / hết phiên). */
export function clearSessionQueries(client: QueryClient = queryClient): void {
  void client.cancelQueries({ predicate: isSessionScoped });
  client.removeQueries({ predicate: isSessionScoped });
  client.getMutationCache().clear();
}
