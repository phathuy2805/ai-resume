import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Logo from '@/components/common/Logo';
import UserMenu from '@/components/layout/UserMenu';
import { cn } from '@/lib/utils';

const links = [
  { to: '/candidate/jobs', label: 'Việc làm' },
  { to: '/candidate/applications', label: 'Hồ sơ của tôi' },
];

export default function CandidateHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <div className="flex h-full items-center gap-8">
          <Link to="/candidate/jobs">
            <Logo />
          </Link>
          <nav className="hidden h-full items-center gap-6 md:flex">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-full items-center font-medium transition-colors',
                    isActive
                      ? 'font-semibold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                      : 'text-slate-600 hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <UserMenu showDetails={false} />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-8 flex flex-col gap-1">
                {links.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'rounded-lg px-3 py-2 font-medium',
                        isActive
                          ? 'bg-indigo-50 text-primary'
                          : 'text-slate-600 hover:bg-slate-100',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
