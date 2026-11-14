import { Link, NavLink } from 'react-router-dom';
import Logo from '@/components/common/Logo';
import { hrLinks } from '@/components/layout/hrLinks';
import { cn } from '@/lib/utils';

export default function HrSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <Link
        to="/hr/jobs"
        onClick={onNavigate}
        className="flex h-14 items-center border-b border-border px-6"
      >
        <Logo />
      </Link>
      <div className="p-4">
        <div className="px-2 pb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Tuyển dụng
        </div>
        <nav className="flex flex-col gap-1">
          {hrLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
