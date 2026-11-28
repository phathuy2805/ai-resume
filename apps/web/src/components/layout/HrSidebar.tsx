import { Link, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/common/BrandLogo';
import { getActiveHrLink, hrLinkGroups, hrLinks } from '@/components/layout/hrLinks';
import { cn } from '@/lib/utils';

export default function HrSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const activeTo = getActiveHrLink(pathname)?.to;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <Link
        to="/hr/jobs"
        onClick={onNavigate}
        className="flex h-14 items-center border-b border-border px-6"
      >
        <BrandLogo />
      </Link>
      <div className="flex flex-col gap-5 p-4">
        {hrLinkGroups.map((group) => (
          <div key={group.id}>
            <div className="px-2 pb-1 text-xs uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <nav className="flex flex-col gap-1">
              {hrLinks
                .filter((link) => link.group === group.id)
                .map(({ to, label, icon: Icon }) => {
                  // Tự tính active vì "Ứng viên" nằm ở /hr/jobs/:jobId/candidates, NavLink chỉ so tiền tố của `to`.
                  const isActive = to === activeTo;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-2 font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
