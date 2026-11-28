import { lazy, StrictMode, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { router } from './routes';
import { installSessionLifecycle } from './lib/sessionLifecycle';

const disposeSession = installSessionLifecycle(
  () => {
    if (window.location.pathname !== '/login') void router.navigate('/login', { replace: true });
  },
  () =>
    ['/', '/login', '/register', '/forgot-password', '/company'].includes(
      window.location.pathname,
    ) || /^\/candidate\/jobs(?:\/[^/]+)?\/?$/.test(window.location.pathname),
);
if (import.meta.hot) import.meta.hot.dispose(disposeSession);

const Devtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

const root = createRoot(document.getElementById('root')!);
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
);
