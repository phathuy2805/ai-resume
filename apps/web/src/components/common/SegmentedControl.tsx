import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Pill-style switch used for filters ("Tất cả / Đang mở / Đã đóng") and small
 * radio choices. `tone="primary"` fills the active segment with indigo.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'neutral',
  className,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'neutral' | 'primary';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? tone === 'primary'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-primary shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold leading-4',
                  active ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600',
                  active && tone === 'primary' && 'bg-white/20',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
