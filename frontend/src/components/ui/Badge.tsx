import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const variants = {
  default: 'border border-border bg-surface-muted/95 text-ink',
  neutral: 'border border-violet-200/50 bg-white/70 text-muted backdrop-blur-sm',
  primary: 'border border-primary/35 bg-primary/12 text-deep-purple',
  success: 'border border-success-border bg-success-surface text-success-ink',
  warning: 'border border-amber-200/90 bg-amber-50 text-amber-950',
  danger: 'border border-rose-200/90 bg-rose-50 text-rose-950',
  info: 'border border-ai-border bg-ai-surface text-ai-ink',
  pending: 'border border-amber-200/90 bg-amber-100 text-amber-950',
  drafted: 'border border-teal-200/90 bg-teal-50 text-teal-950',
  approved: 'border border-orange-200/90 bg-orange-50 text-orange-950',
  published: 'border border-emerald-200/90 bg-emerald-50 text-emerald-950',
} as const;

const sizes = {
  xs: 'px-2 py-0.5 text-[10px] uppercase tracking-wide',
  sm: 'px-2.5 py-0.5 text-[11px] uppercase tracking-wide',
  md: 'px-3 py-1 text-xs',
} as const;

export type BadgeVariant = keyof typeof variants;
export type BadgeSize = keyof typeof sizes;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

export function Badge({ className, variant = 'default', size = 'md', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center gap-1 rounded-full font-semibold leading-tight',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
