import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DropdownContextValue = { open: boolean; setOpen: (open: boolean) => void };
const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  return (
    <button type="button" className={className} onClick={() => context.setOpen(!context.open)}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(DropdownContext);
  const contentRef = useRef<HTMLDivElement>(null);
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node))
        context.setOpen(false);
    };
    if (context.open) document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [context]);
  if (!context.open) return null;
  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute right-0 top-full z-50 mt-2 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu');
  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
        className,
      )}
      onClick={() => {
        onClick?.();
        context.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
