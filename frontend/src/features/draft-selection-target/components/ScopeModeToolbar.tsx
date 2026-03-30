import type { ReactNode } from 'react';
import type { GenerationScope, TextSelectionRange } from '@/services/backendApi';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

function targetSummary(preferredScope: GenerationScope, selection: TextSelectionRange | null): string {
  if (preferredScope === 'whole-post') return 'Entire draft';
  if (!selection?.text?.trim()) return 'Select text in the draft';
  const n = selection.end - selection.start;
  return `${n} character${n === 1 ? '' : 's'} selected`;
}

export interface ScopeModeToolbarProps {
  preferredScope: GenerationScope;
  selection: TextSelectionRange | null;
  onScopeChange: (scope: GenerationScope) => void;
  compact?: boolean;
  /** Controls after the target summary (undo, formatting, etc.). */
  trailing?: ReactNode;
}

const tBtnCompact = 'px-2.5 py-1 text-xs';
const tBtnWide = 'px-3 py-1.5 text-sm';

export function ScopeModeToolbar({
  preferredScope,
  selection,
  onScopeChange,
  compact = false,
  trailing,
}: ScopeModeToolbarProps) {
  const tBtn = compact ? tBtnCompact : tBtnWide;
  const summary = targetSummary(preferredScope, selection);

  const toggle = (
    <div
      className={cn(
        'inline-flex shrink-0 rounded-full border border-violet-200/50 bg-white/80 backdrop-blur-sm',
        compact ? 'p-0.5' : 'p-1',
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="inline"
        onClick={() => onScopeChange('whole-post')}
        className={cn(
          'cursor-pointer rounded-full font-semibold transition-all duration-200',
          tBtn,
          preferredScope === 'whole-post'
            ? 'bg-ink text-primary-fg shadow-sm hover:bg-ink/90 hover:text-primary-fg'
            : 'text-muted hover:bg-white/60 hover:text-ink/70',
        )}
      >
        Whole post
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="inline"
        onClick={() => onScopeChange('selection')}
        className={cn(
          'cursor-pointer rounded-full font-semibold transition-all duration-200',
          tBtn,
          preferredScope === 'selection'
            ? 'bg-primary text-primary-fg shadow-sm hover:bg-primary/90 hover:text-primary-fg'
            : 'text-muted hover:bg-white/60 hover:text-ink/70',
        )}
      >
        Selection
      </Button>
    </div>
  );

  if (compact) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200/60 bg-white/70 px-2 py-1.5 backdrop-blur-sm">
        {toggle}
        <p className="min-w-0 max-w-full flex-[1_1_12rem] text-xs text-muted sm:flex-[1_1_16rem]">
          <span className="font-semibold text-ink">Target: </span>
          <span className="break-words">{summary}</span>
        </p>
        {trailing}
      </div>
    );
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200/60 bg-white/70 px-3 py-2 backdrop-blur-sm transition-all duration-200">
      {toggle}
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-2.5 py-1 text-sm text-muted">
        <span className="font-semibold text-ink">Target:</span> {summary}
        <span className="mt-0.5 block text-[0.65rem] font-normal text-muted/90">
          Quick Change and 4 Variants use this target. The selected range is highlighted in the draft.
        </span>
      </div>
      {trailing}
    </div>
  );
}
