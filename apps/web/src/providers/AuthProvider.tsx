import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getMe, logout as logoutApi, refreshSession } from '@/api/auth';
import { clearAccessToken, setAccessToken } from '@/lib/tokenStore';
import { router } from '@/routes';
import type { UserProfile } from '@/types/auth';
import { AuthContext, type AuthContextValue } from './auth-context';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Đang khôi phục phiên đăng nhập…
      </div>
    </main>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await refreshSession();
        const profile = await getMe();
        if (active) setUser(profile);
      } catch {
        if (active) {
          clearAccessToken();
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: (nextUser, accessToken) => {
        setAccessToken(accessToken);
        setUser(nextUser);
      },
      logout: async () => {
        try {
          await logoutApi();
        } finally {
          clearAccessToken();
          queryClient.clear();
          setUser(null);
          await router.navigate('/login', { replace: true });
        }
      },
    }),
    [isLoading, queryClient, user],
  );

  if (isLoading) return <LoadingScreen />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
