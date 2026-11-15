import { cn } from '@/lib/utils';
export function Progress({ value, label }: { value?: number; label: string }) {
  const percent = value === undefined ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-indigo-100"
    >
      <div
        className={cn(
          'h-full bg-primary transition-all',
          percent === undefined && 'w-1/3 animate-pulse',
        )}
        style={percent === undefined ? undefined : { width: `${percent}%` }}
      />
    </div>
  );
}
