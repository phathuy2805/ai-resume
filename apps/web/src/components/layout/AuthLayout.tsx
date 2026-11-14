import { Outlet } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-700">
      <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-400 sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-emerald-700 shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
          SOC-2 Verified
        </span>
        <span className="inline-flex items-center gap-1">
          <LockKeyhole className="h-4 w-4" />
          256-bit SSL
        </span>
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </main>
      <footer className="flex items-center justify-center gap-1 px-4 py-6 text-center text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4" />© 2025 RecruitAI Enterprise Inc. Safe Harbor Certified.
      </footer>
    </div>
  );
}
