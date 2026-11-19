import { LogOut, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuth } from '@/providers/auth-context';
import { notifyError } from '@/lib/errorUtils';
import { candidateLoginUrl } from '@/lib/loginRedirect';

/** Avatar + name trigger with a sign-out item, shared by both portals. */
export default function UserMenu({ showDetails = true }: { showDetails?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useCurrentUser();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const user = session.user;
  if (session.isLoading) return <span className="text-sm">Đang tải tài khoản…</span>;
  if (session.error) return <button onClick={() => void session.retry()}>Thử lại tài khoản</button>;
  if (!user)
    return (
      <Link
        className="font-medium text-primary"
        to={candidateLoginUrl(location.pathname + location.search)}
      >
        Đăng nhập
      </Link>
    );
  const signOut = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await logout();
    } catch (error) {
      notifyError(error);
    } finally {
      navigate('/login', { replace: true });
      setLeaving(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tài khoản"
        className="flex items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-[18px] w-[18px]" />
        </span>
        {showDetails && (
          <span className="hidden flex-col pr-1 md:flex">
            <span className="text-xs font-medium leading-tight text-foreground">
              {user.fullName}
            </span>
            <span className="text-[11px] leading-tight text-muted-foreground">{user.email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className={showDetails ? 'md:hidden' : undefined}>
          <div className="px-3 py-1.5">
            <div className="text-sm font-medium text-foreground">{user.fullName}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <DropdownMenuSeparator />
        </div>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
