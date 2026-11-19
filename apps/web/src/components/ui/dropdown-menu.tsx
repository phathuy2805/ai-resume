import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
};
const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(component: string) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error(`${component} must be used within DropdownMenu`);
  return context;
}

const GAP = 4;
const VIEWPORT_MARGIN = 8;

export function DropdownMenu({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // The menu is portalled to <body>, so it is not inside rootRef.
      if (rootRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);
  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={rootRef} className={cn('relative inline-block', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}) {
  const { open, setOpen, triggerRef } = useDropdown('DropdownMenuTrigger');
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      className={className}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

/**
 * Rendered in a portal with fixed positioning so it floats above scroll/overflow containers
 * (e.g. tables). Opens below the trigger, or above it when there is not enough room below.
 */
export function DropdownMenuContent({
  children,
  className,
  align = 'end',
}: {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  const { open, triggerRef, contentRef } = useDropdown('DropdownMenuContent');

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const rect = trigger.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = content;
      const fitsBelow = rect.bottom + GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
      const fitsAbove = rect.top - GAP - height >= VIEWPORT_MARGIN;
      const top = !fitsBelow && fitsAbove ? rect.top - GAP - height : rect.bottom + GAP;
      const rawLeft = align === 'end' ? rect.right - width : rect.left;
      const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
      content.style.top = `${top}px`;
      content.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(rawLeft, maxLeft))}px`;
      content.style.visibility = 'visible';
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, triggerRef, contentRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={contentRef}
      role="menu"
      style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
      className={cn(
        'z-50 min-w-44 rounded-lg border border-border bg-popover py-1.5 text-popover-foreground shadow-md',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
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
  const context = useDropdown('DropdownMenuItem');
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-slate-50 [&_svg]:size-4 [&_svg]:text-muted-foreground',
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
