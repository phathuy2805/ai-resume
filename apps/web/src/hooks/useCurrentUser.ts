import { useAuth } from '@/providers/auth-context';

/** Candidate pages share the FE-04 provider; no second session/profile request. */
export function useCurrentUser() {
  return useAuth();
}
