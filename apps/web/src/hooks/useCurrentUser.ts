import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/auth';
import { queryKeys } from '@/api/queryKeys';
import { getAccessToken, getSessionVersion, subscribeAccessToken } from '@/lib/tokenStore';
import { parseUserProfile } from '@/lib/session';

/** Small FE-04 integration boundary. No mockUser and no JWT payload assumptions. */
export function useCurrentUser() {
  const token = useSyncExternalStore(subscribeAccessToken, getAccessToken, () => null);
  const query = useQuery({
    queryKey: [...queryKeys.auth.me(), getSessionVersion()],
    queryFn: async ({ signal }) => parseUserProfile(await getMe(signal)),
    enabled: !!token,
    meta: { errorMode: 'local' },
  });
  return {
    user: token ? query.data : undefined,
    isLoading: !!token && query.isPending,
    error: token ? query.error : null,
    retry: query.refetch,
  };
}
