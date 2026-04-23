import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '@/components/ui/button';

export type ChipToggleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
};

export function ChipToggle({ selected, className, type = 'button', ...props }: ChipToggleProps) {
  return (
    <Button
      type={type}
      variant={selected ? 'primary' : 'secondary'}
      size="sm"
      className={cn(
        'h-9 min-h-9 cursor-pointer rounded-full px-3.5 text-xs font-semibold shadow-sm',
        !selected && 'text-muted hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}
