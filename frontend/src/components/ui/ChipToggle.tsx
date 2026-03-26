import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type ChipToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
};

export function ChipToggle({ selected, className, type = 'button', ...props }: ChipToggleProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full px-3.5 py-2 text-sm font-semibold transition-[color,background-color,border-color,box-shadow] duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        selected
          ? 'border border-primary/25 bg-primary text-primary-fg shadow-sm'
          : 'border border-violet-200/50 bg-white/70 text-muted shadow-sm backdrop-blur-md hover:border-primary/35 hover:bg-white/90 hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}
