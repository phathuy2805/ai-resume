import { Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import HrSidebar from '@/components/layout/HrSidebar';
import { mockUser } from '@/lib/mockUser';

export default function HrHeader() {
  const navigate = useNavigate();
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <Sheet>
        <SheetTrigger className="rounded-md p-2 hover:bg-accent md:hidden" aria-label="Mở menu">
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent>
          <HrSidebar />
        </SheetContent>
      </Sheet>
      <div className="ml-auto relative">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
            <UserCircle className="h-5 w-5" />
            <span className="hidden text-sm sm:inline">{mockUser.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => navigate('/login')}>Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
