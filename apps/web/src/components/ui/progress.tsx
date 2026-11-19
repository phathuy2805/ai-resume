import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

// shadcn/ui's Radix Progress, with an indeterminate state for uploads without total.
const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { label?: string }
>(({ className, value, label, ...props }, ref) => {
  const percent = value == null ? null : Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
      value={percent}
      aria-label={label}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all',
          percent === null && 'w-1/3 animate-pulse',
        )}
        style={percent === null ? undefined : { transform: `translateX(-${100 - percent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;
export { Progress };
