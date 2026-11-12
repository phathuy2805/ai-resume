import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null);

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>;
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  return <button type="button" onClick={() => context.setValue(value)} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all", context.value === value && "bg-background text-foreground shadow-sm", className)}>{children}</button>;
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <div className={className}>{children}</div>;
}
