import { Outlet } from 'react-router-dom';
import Logo from '@/components/common/Logo';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col items-center">
        <div className="mb-8 flex select-none flex-col items-center text-center">
          <Logo size="lg" className="mb-3.5" />
          <span className="text-page-title text-foreground">HireFlow</span>
          <p className="mt-1 text-muted-foreground">Sàng lọc hồ sơ thông minh với AI</p>
        </div>
        <div className="w-full">
          <Outlet />
        </div>
        <p className="mt-6 text-xs text-muted-foreground/80">
          © 2026 HireFlow · Tuyển dụng minh bạch với AI
        </p>
      </div>
    </div>
  );
}
