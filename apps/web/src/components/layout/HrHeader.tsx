import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import HrSidebar from '@/components/layout/HrSidebar';
import { hrLinks } from '@/components/layout/hrLinks';
import UserMenu from '@/components/layout/UserMenu';

export default function HrHeader() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const section = hrLinks.find((link) => pathname.startsWith(link.to))?.label ?? 'Tuyển dụng';

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent className="w-60 p-0">
            <HrSidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-xs text-muted-foreground">HireFlow</span>
        <span className="text-xs text-slate-300">/</span>
        <span className="font-medium text-foreground">{section}</span>
      </div>
      <UserMenu />
    </header>
  );
}
