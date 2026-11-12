import { BriefcaseBusiness, ChartNoAxesCombined, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const links = [
  { to: "/hr/jobs", label: "Tin tuyển dụng", icon: BriefcaseBusiness },
  { to: "/hr/candidates", label: "Ứng viên", icon: Users },
  { to: "/hr/stats", label: "Thống kê", icon: ChartNoAxesCombined },
];

export default function HrSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background p-4">
    <div className="mb-8 px-3 text-lg font-bold text-primary">AI Resume</div>
    <nav className="space-y-1">
      {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", isActive && "bg-primary/10 font-medium text-primary")}>
        <Icon className="h-4 w-4" />{label}
      </NavLink>)}
    </nav>
  </aside>;
}
