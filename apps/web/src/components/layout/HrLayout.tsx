import { Outlet } from 'react-router-dom';
import HrHeader from '@/components/layout/HrHeader';
import HrSidebar from '@/components/layout/HrSidebar';

export default function HrLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <HrSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <HrHeader />
        <main className="flex-1 bg-muted/20 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
