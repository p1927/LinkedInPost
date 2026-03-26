import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  primary:
    'border border-primary/20 bg-primary text-primary-fg shadow-card hover:border-primary-hover hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-primary',
  secondary:
    'border border-violet-200/55 bg-white/80 text-ink shadow-sm backdrop-blur-md hover:border-primary/30 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-primary',
  ghost:
    'border border-transparent text-muted hover:border-violet-200/40 hover:bg-white/55 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-primary',
  danger:
    'border border-red-700/20 bg-red-600 text-primary-fg shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-red-600',
  outline:
    'border-2 border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-primary',
  ai: 'border border-ai-border bg-ai-surface text-ai-ink shadow-sm hover:border-ai-hover hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-cyan-600',
  ink: 'border border-ink/20 bg-ink text-primary-fg shadow-sm hover:border-ink-hover hover:bg-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offset-canvas focus-visible:outline-deep-indigo',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2',
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
