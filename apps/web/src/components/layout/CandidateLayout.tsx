import { Outlet } from 'react-router-dom';
import CandidateFooter from '@/components/layout/CandidateFooter';
import CandidateHeader from '@/components/layout/CandidateHeader';

export default function CandidateLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CandidateHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
      <CandidateFooter />
    </div>
  );
}
