import { clearSessionQueries } from './queryClient';
import { markErrorHandled, notifyError } from './errorUtils';
import { onSessionExpired, refreshSession } from './session';

// Router/UI integration stays outside the transport. Install once before startup.
export function installSessionLifecycle(
  navigateToLogin: () => void,
  isPublicPage: () => boolean,
): () => void {
  return onSessionExpired(({ error, hadAccessToken }) => {
    clearSessionQueries();
    if (hadAccessToken || !isPublicPage()) {
      notifyError(error);
      navigateToLogin();
    } else {
      // Missing cookie on the initial login/register screen is normal.
      markErrorHandled(error);
    }
  });
}

export async function initializeSession(): Promise<void> {
  try {
    await refreshSession();
  } catch (error) {
    notifyError(error);
  }
}
