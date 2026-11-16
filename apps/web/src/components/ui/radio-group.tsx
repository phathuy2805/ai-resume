import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function RadioGroup({
  value,
  onValueChange,
  className,
  children,
}: RadioGroupContextValue & { className?: string; children: ReactNode }) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div role="radiogroup" className={cn('grid gap-2', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({
  value,
  id,
  className,
}: {
  value: string;
  id: string;
  className?: string;
}) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');
  return (
    <button
      type="button"
      role="radio"
      aria-checked={context.value === value}
      id={id}
      className={cn(
        'h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        context.value === value && 'bg-primary shadow-[inset_0_0_0_3px_hsl(var(--background))]',
        className,
      )}
      onClick={() => context.onValueChange?.(value)}
    />
  );
}
