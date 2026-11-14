import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logo({
  size = 'md',
  className,
}: {
  size?: 'md' | 'lg';
  className?: string;
}) {
  const large = size === 'lg';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex items-center justify-center bg-primary text-primary-foreground',
          large ? 'h-12 w-12 rounded-xl' : 'h-7 w-7 rounded-lg',
        )}
      >
        <Layers className={large ? 'h-6 w-6' : 'h-4 w-4'} />
      </span>
      {!large && <span className="text-card-title tracking-tight text-foreground">HireFlow</span>}
    </span>
  );
}
