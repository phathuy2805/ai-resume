import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-indigo-700 active:bg-indigo-800',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-red-700',
  'destructive-outline': 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  success: 'bg-green-600 text-white hover:bg-green-700',
  outline: 'border border-input bg-card text-foreground hover:bg-slate-50',
  secondary: 'bg-secondary text-foreground hover:bg-slate-200',
  ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizes = {
  default: 'h-10 px-4',
  sm: 'h-8 px-3',
  lg: 'h-11 px-6',
  icon: 'h-8 w-8',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

/** Button classes, also used to style <Link> elements as buttons. */
export function buttonVariants({
  variant = 'default',
  size = 'default',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
    className,
  );
}
