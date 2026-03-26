import { Highlighter, List, ScanSearch } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { GenerationScope, TextSelectionRange } from '../../services/backendApi';
import { type FormattingAction, getEffectiveScope, getTargetText, normalizeSelection } from './selection';

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
  dirty,
  onChange,
  onSelectionChange,
  onScopeChange,
  onFormatting,
}: DraftEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const effectiveScope = getEffectiveScope(preferredScope, selection);
  const targetText = getTargetText(value, effectiveScope, selection);

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
    <section className="rounded-[30px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Editor working state</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">Edit before you generate</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Select text to target a specific passage, or stay in whole-post mode to revise the full draft.
          </p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${dirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {dirty ? 'Unsaved editor changes' : 'Editor matches current base'}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onScopeChange('whole-post')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${effectiveScope === 'whole-post' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Whole post
        </button>
        <button
          type="button"
          onClick={() => onScopeChange('selection')}
          disabled={!selection?.text.trim()}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${effectiveScope === 'selection' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400'}`}
        >
          Selected text
        </button>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Active target:</span>{' '}
          {effectiveScope === 'selection' ? targetText : 'Entire editor draft'}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FORMATTING_ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onFormatting(id)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onSelect={syncSelection}
        onKeyUp={syncSelection}
        onMouseUp={syncSelection}
        spellCheck={false}
        className="mt-5 min-h-[280px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-base leading-7 text-slate-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-200"
        placeholder="Edit the draft here. Select a sentence to target only that part with Quick Change or 4 Variants."
      />
    </section>
  );
}