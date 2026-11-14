import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  outline: 'text-foreground',
  success: 'border-transparent bg-emerald-100 text-emerald-700',
  warning: 'border-transparent bg-amber-100 text-amber-700',
  danger: 'border-transparent bg-red-100 text-red-700',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof variants }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
