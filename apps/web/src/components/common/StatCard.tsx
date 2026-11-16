import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{label}</span>
        {Icon && <Icon className={cn('h-[18px] w-[18px] text-muted-foreground', iconClassName)} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-page-title text-foreground">{value}</span>
        {hint}
      </div>
    </Card>
  );
}
