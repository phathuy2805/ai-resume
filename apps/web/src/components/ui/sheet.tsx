import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetContextValue = { open: boolean; setOpen: (open: boolean) => void };
const SheetContext = createContext<SheetContextValue | null>(null);

export function Sheet({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  return <SheetContext.Provider value={{ open: isControlled ? open : uncontrolledOpen, setOpen }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const context = useContext(SheetContext);
  if (!context) throw new Error("SheetTrigger must be used within Sheet");
  return <button type="button" className={className} onClick={() => context.setOpen(true)}>{children}</button>;
}

export function SheetContent({ side = "left", className, children }: { side?: "left" | "right"; className?: string; children: ReactNode }) {
  const context = useContext(SheetContext);
  if (!context) throw new Error("SheetContent must be used within Sheet");
  useEffect(() => {
    if (!context.open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") context.setOpen(false); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [context]);
  if (!context.open) return null;
  return <div className="fixed inset-0 z-50 bg-black/50" role="dialog" aria-modal="true" onClick={() => context.setOpen(false)}>
    <div className={cn("fixed inset-y-0 z-50 w-3/4 max-w-sm bg-background p-6 shadow-lg", side === "left" ? "left-0" : "right-0", className)} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label="Đóng" onClick={() => context.setOpen(false)}><X className="h-4 w-4" /></button>
      {children}
    </div>
  </div>;
}

export function SheetClose({ children }: { children: ReactNode }) {
  const context = useContext(SheetContext);
  if (!context) throw new Error("SheetClose must be used within Sheet");
  return <button type="button" onClick={() => context.setOpen(false)}>{children}</button>;
}
