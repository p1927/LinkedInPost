import { Highlighter, List, ScanSearch } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { GenerationScope, TextSelectionRange } from '../../services/backendApi';
import { type FormattingAction, getEffectiveScope, normalizeSelection } from './selection';

interface DraftEditorProps {
  value: string;
  selection: TextSelectionRange | null;
  preferredScope: GenerationScope;
  dirty: boolean;
  onChange: (value: string) => void;
  onSelectionChange: (selection: TextSelectionRange | null) => void;
  onScopeChange: (scope: GenerationScope) => void;
  onFormatting: (action: FormattingAction) => void;
  /** Tighter toolbar and editor for multi-column review layout. */
  compact?: boolean;
}

const FORMATTING_ACTIONS: Array<{ id: FormattingAction; label: string; icon: typeof ScanSearch }> = [
  { id: 'tighten-spacing', label: 'Tighten spacing', icon: ScanSearch },
  { id: 'bulletize', label: 'Bulletize', icon: List },
  { id: 'emphasize', label: 'Unicode emphasis', icon: Highlighter },
];

export function DraftEditor({
  value,
  selection,
  preferredScope,
  onChange,
  onSelectionChange,
  onScopeChange,
  onFormatting,
  compact = false,
}: DraftEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const effectiveScope = getEffectiveScope(preferredScope, selection);
  const selectionSummary = selection?.text.trim()
    ? `${selection.text.trim().slice(0, 72)}${selection.text.trim().length > 72 ? '...' : ''}`
    : 'No text selected';

  useEffect(() => {
    if (preferredScope === 'selection' && !selection?.text.trim()) {
      onScopeChange('whole-post');
    }
  }, [onScopeChange, preferredScope, selection]);

  const syncSelection = () => {
    const element = textareaRef.current;
    if (!element) {
      onSelectionChange(null);
      return;
    }

    onSelectionChange(normalizeSelection(value, element.selectionStart, element.selectionEnd));
  };

  const t = compact ? 'text-xs' : 'text-sm';
  const tBtn = compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const taMin = compact ? 'min-h-[220px]' : 'min-h-[320px]';
  const taText = compact ? 'px-3 py-3 text-sm leading-6' : 'px-5 py-4 text-base leading-7';

  return (
    <div className="flex h-full flex-col">
      <div className={`mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
        <div className={`inline-flex rounded-full border border-border bg-surface ${compact ? 'p-0.5' : 'p-1'}`}>
          <button
            type="button"
            onClick={() => onScopeChange('whole-post')}
            className={`cursor-pointer rounded-full font-semibold transition-colors ${tBtn} ${effectiveScope === 'whole-post' ? 'bg-ink text-primary-fg' : 'text-muted hover:bg-canvas'}`}
          >
            Whole post
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('selection')}
            disabled={!selection?.text.trim()}
            className={`cursor-pointer rounded-full font-semibold transition-colors ${tBtn} ${effectiveScope === 'selection' ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-canvas disabled:cursor-not-allowed disabled:text-muted/50'}`}
          >
            Selection
          </button>
        </div>
        <div className={`min-w-0 flex-1 rounded-2xl border border-border bg-surface px-2.5 py-1 text-muted ${t}`}>
          <span className="font-semibold text-ink">Target:</span>{' '}
          {effectiveScope === 'selection' ? selectionSummary : 'Entire draft'}
        </div>
        <details className="group relative">
          <summary
            className={`list-none cursor-pointer rounded-full border border-border bg-surface font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
          >
            Formatting actions
          </summary>
          <div className="absolute right-0 z-10 mt-2 grid min-w-[220px] max-w-[calc(100vw-2rem)] gap-2 rounded-xl border border-border bg-surface p-3 shadow-lift sm:left-0 sm:right-auto">
            {FORMATTING_ACTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onFormatting(id)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </details>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={syncSelection}
        onKeyUp={syncSelection}
        onMouseUp={syncSelection}
        spellCheck={false}
        className={`${taMin} w-full flex-1 resize-none rounded-xl border border-border bg-canvas text-ink outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 ${taText}`}
        placeholder="Edit the draft here. Select a sentence to target only that part with Quick Change or 4 Variants."
      />
    </div>
  );
}