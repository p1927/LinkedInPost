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

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => onScopeChange('whole-post')}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${effectiveScope === 'whole-post' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Whole post
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('selection')}
            disabled={!selection?.text.trim()}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${effectiveScope === 'selection' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400'}`}
          >
            Selection
          </button>
        </div>
        <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
          <span className="font-semibold text-slate-900">Target:</span>{' '}
          {effectiveScope === 'selection' ? selectionSummary : 'Entire draft'}
        </div>
        <details className="group relative">
          <summary className="list-none cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
            Formatting actions
          </summary>
          <div className="absolute right-0 z-10 mt-2 grid min-w-[220px] max-w-[calc(100vw-2rem)] gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:right-auto sm:left-0">
            {FORMATTING_ACTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onFormatting(id)}
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
        className="flex-1 min-h-[320px] w-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-base leading-7 text-slate-900 outline-none transition-all focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 resize-none"
        placeholder="Edit the draft here. Select a sentence to target only that part with Quick Change or 4 Variants."
      />
    </div>
  );
}