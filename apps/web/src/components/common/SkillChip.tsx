import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  /** Compact grey tag used in tables and cards. */
  muted: 'rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600',
  /** Required skill on the job detail page. */
  required:
    'rounded-lg border border-border bg-slate-50 px-3 py-1 text-xs font-medium text-foreground',
  /** Preferred (nice-to-have) skill. */
  preferred:
    'rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground',
  /** Missing skill highlighted for HR. */
  missing: 'rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700',
};

export default function SkillChip({
  children,
  variant = 'muted',
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', variants[variant], className)}>
      {variant === 'required' && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      {children}
    </span>
  );
}
