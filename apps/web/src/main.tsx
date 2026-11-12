import { lazy, StrictMode, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { router } from './routes';
import { initializeSession, installSessionLifecycle } from './lib/sessionLifecycle';

const disposeSession = installSessionLifecycle(
  () => {
    if (window.location.pathname !== '/login') void router.navigate('/login', { replace: true });
  },
  () => ['/', '/login', '/register', '/candidate/jobs'].includes(window.location.pathname),
);
if (import.meta.hot) import.meta.hot.dispose(disposeSession);

const Devtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

// One bootstrap outside StrictMode; protected requests begin after restoration.
const root = createRoot(document.getElementById('root')!);
root.render(
  <p role="status" className="p-6">
    Đang khôi phục phiên đăng nhập…
  </p>,
);
void initializeSession().then(() =>
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        {Devtools && (
          <Suspense fallback={null}>
            <Devtools initialIsOpen={false} />
          </Suspense>
        )}
      </QueryClientProvider>
    </StrictMode>,
  ),
);
