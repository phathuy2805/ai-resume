import { RouterProvider } from 'react-router-dom';
import DocumentBranding from '@/components/common/DocumentBranding';
import { Toaster } from '@/components/ui/sonner';
import AuthProvider from '@/providers/AuthProvider';
import { router } from '@/routes';

export default function App() {
  return (
    <AuthProvider>
      <DocumentBranding />
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
