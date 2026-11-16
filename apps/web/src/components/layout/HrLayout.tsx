import { Outlet } from 'react-router-dom';
import HrHeader from '@/components/layout/HrHeader';
import HrSidebar from '@/components/layout/HrSidebar';

export default function HrLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-50 hidden md:block">
        <HrSidebar />
      </div>
      <div className="flex min-h-screen min-w-0 flex-col md:pl-60">
        <HrHeader />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1200px] p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
