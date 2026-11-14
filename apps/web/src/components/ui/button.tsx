import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonSize, type ButtonVariant } from './button-variants';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  type = 'button',
  ...props
}: ButtonProps & { children?: ReactNode }) {
  const buttonClassName = buttonVariants({ variant, size, className });
  if (asChild && isValidElement<{ className?: string }>(children)) {
    return cloneElement(children, { className: cn(buttonClassName, children.props.className) });
  }
  return (
    <button type={type} className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
