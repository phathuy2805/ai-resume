import { Menu, UserCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { mockUser } from "@/lib/mockUser";
import { cn } from "@/lib/utils";

const links = [{ to: "/candidate/jobs", label: "Việc làm" }, { to: "/candidate/applications", label: "Hồ sơ của tôi" }];

export default function CandidateHeader() {
  const navigate = useNavigate();
  return <header className="border-b bg-background">
    <div className="container flex h-16 items-center justify-between px-4">
      <div className="flex items-center gap-6"><NavLink to="/candidate/jobs" className="font-bold text-primary">AI Resume</NavLink>
        <nav className="hidden items-center gap-1 md:flex">{links.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => cn("rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent", isActive && "bg-primary/10 font-medium text-primary")}>{label}</NavLink>)}</nav>
      </div>
      <div className="flex items-center gap-2">
        <Sheet><SheetTrigger className="rounded-md p-2 hover:bg-accent md:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></SheetTrigger><SheetContent><nav className="mt-8 space-y-2">{links.map(({ to, label }) => <NavLink key={to} to={to} className="block rounded-md px-3 py-2 hover:bg-accent">{label}</NavLink>)}</nav></SheetContent></Sheet>
        <div className="relative"><DropdownMenu><DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"><UserCircle className="h-5 w-5" /><span className="hidden text-sm sm:inline">{mockUser.name}</span></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => navigate("/login")}>Đăng xuất</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
    </div>
  </header>;
}
