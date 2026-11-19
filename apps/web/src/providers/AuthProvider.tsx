import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getMe, logout as logoutApi, refreshSession } from '@/api/auth';
import {
  getAccessToken,
  getSessionVersion,
  setAccessToken,
  subscribeAccessToken,
} from '@/lib/tokenStore';
import { parseUserProfile } from '@/lib/session';
import { toApiError } from '@/lib/apiError';
import type { UserProfile } from '@/types/auth';
import { AuthContext, type AuthContextValue } from './auth-context';

async function restoreProfile() {
  if (!getAccessToken()) await refreshSession();
  return parseUserProfile(await getMe());
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(subscribeAccessToken, getAccessToken, () => null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userSession, setUserSession] = useState(-1);
  const restoration = useRef<Promise<UserProfile> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    restoration.current ??= restoreProfile();
    void restoration.current
      .then((profile) => {
        if (active) {
          setUser(profile);
          setUserSession(getSessionVersion());
        }
      })
      .catch((cause: unknown) => {
        const failure = toApiError(cause);
        if (active && failure.status !== 401) setError(failure);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      // Token clear from FE-03 expiration/logout immediately removes the identity.
      user: token && userSession === getSessionVersion() ? user : null,
      isLoading,
      error,
      retry: async () => {
        setError(null);
        setIsLoading(true);
        try {
          setUser(await restoreProfile());
          setUserSession(getSessionVersion());
        } catch (cause) {
          const failure = toApiError(cause);
          if (failure.status !== 401) setError(failure);
        } finally {
          setIsLoading(false);
        }
      },
      login: (nextUser, accessToken) => {
        // loginApi already publishes the token; don't invalidate its session twice.
        if (getAccessToken() !== accessToken) setAccessToken(accessToken);
        setUser(nextUser);
        setUserSession(getSessionVersion());
        setError(null);
      },
      logout: async () => {
        try {
          await logoutApi();
        } finally {
          queryClient.clear();
          setUser(null);
        }
      },
    }),
    [token, user, userSession, isLoading, error, queryClient],
  );

  if (isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center" role="status">
        Đang khôi phục phiên đăng nhập…
      </main>
    );
  if (error)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p role="alert">Không thể tải phiên đăng nhập. Vui lòng kiểm tra kết nối và thử lại.</p>
        <button className="text-primary underline" onClick={() => void value.retry()}>
          Thử lại
        </button>
      </main>
    );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
