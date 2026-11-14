import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-indigo-50 text-indigo-700',
  secondary: 'bg-slate-100 text-slate-600',
  outline: 'border border-border bg-card text-slate-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

export type BadgeVariant = keyof typeof variants;

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
