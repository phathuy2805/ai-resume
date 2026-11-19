import { createContext, useContext } from 'react';
import type { Role, UserProfile } from '@/types/auth';

export interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => Promise<unknown>;
  login: (user: UserProfile, accessToken: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function roleHome(role: Role): string {
  return role === 'HR' ? '/hr/jobs' : '/candidate/jobs';
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
