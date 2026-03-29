import { Highlighter, List, Redo2, ScanSearch, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import type { GenerationScope, TextSelectionRange } from '../../services/backendApi';
import { cn } from '../../lib/cn';
import { type FormattingAction, getEffectiveScope, normalizeSelection } from './selection';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

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
  className?: string;
}

const FORMATTING_ACTIONS: Array<{ id: FormattingAction; label: string; icon: typeof ScanSearch }> = [
  { id: 'tighten-spacing', label: 'Tighten spacing', icon: ScanSearch },
  { id: 'bulletize', label: 'Bulletize', icon: List },
  { id: 'emphasize', label: 'Unicode emphasis', icon: Highlighter },
];

const MAX_EDITOR_HISTORY = 100;

type EditorHistoryEntry = { value: string; start: number; end: number };

export function DraftEditor({
  value,
  selection,
  preferredScope,
  onChange,
  onSelectionChange,
  onScopeChange,
  onFormatting,
  compact = false,
  className,
}: DraftEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<EditorHistoryEntry[] | null>(null);
  const historyIndexRef = useRef(0);
  const applyingHistoryRef = useRef(false);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [, bumpHistoryUi] = useReducer((n: number) => n + 1, 0);

  if (historyRef.current === null) {
    historyRef.current = [{ value, start: value.length, end: value.length }];
    historyIndexRef.current = 0;
  }

  const effectiveScope = getEffectiveScope(preferredScope, selection);
  const selectionSummary = selection?.text?.trim()
    ? `${selection.text.trim().slice(0, 72)}${selection.text.trim().length > 72 ? '...' : ''}`
    : 'No text selected';

  useEffect(() => {
    if (preferredScope === 'selection' && !selection?.text?.trim()) {
      onScopeChange('whole-post');
    }
  }, [onScopeChange, preferredScope, selection]);

  useEffect(() => {
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }
    const hist = historyRef.current;
    if (!hist?.length) return;
    const idx = historyIndexRef.current;
    if (value === hist[idx]?.value) return;
    historyRef.current = [{ value, start: value.length, end: value.length }];
    historyIndexRef.current = 0;
    bumpHistoryUi();
  }, [value]);

  const syncSelection = () => {
    const element = textareaRef.current;
    if (!element) {
      onSelectionChange(null);
      return;
    }

    onSelectionChange(normalizeSelection(value, element.selectionStart, element.selectionEnd));
  };

  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    const el = textareaRef.current;
    if (pending === null || !el) return;
    pendingSelectionRef.current = null;
    const len = el.value.length;
    const s = Math.max(0, Math.min(pending.start, len));
    const e = Math.max(0, Math.min(pending.end, len));
    el.setSelectionRange(s, e);
    onSelectionChange(normalizeSelection(el.value, s, e));
  }, [value, onSelectionChange]);

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const el = event.target;
    const newValue = el.value;
    const start = el.selectionStart ?? newValue.length;
    const end = el.selectionEnd ?? newValue.length;
    const hist = historyRef.current ?? [];
    const idx = historyIndexRef.current;
    const next = [...hist.slice(0, idx + 1), { value: newValue, start, end }];
    if (next.length > MAX_EDITOR_HISTORY) {
      const overflow = next.length - MAX_EDITOR_HISTORY;
      next.splice(0, overflow);
      historyIndexRef.current = next.length - 1;
    } else {
      historyIndexRef.current = next.length - 1;
    }
    historyRef.current = next;
    bumpHistoryUi();
    onChange(newValue);
  };

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const entry = historyRef.current![historyIndexRef.current];
    pendingSelectionRef.current = { start: entry.start, end: entry.end };
    applyingHistoryRef.current = true;
    bumpHistoryUi();
    onChange(entry.value);
  }, [onChange]);

  const redo = useCallback(() => {
    const hist = historyRef.current;
    if (!hist || historyIndexRef.current >= hist.length - 1) return;
    historyIndexRef.current += 1;
    const entry = hist[historyIndexRef.current];
    pendingSelectionRef.current = { start: entry.start, end: entry.end };
    applyingHistoryRef.current = true;
    bumpHistoryUi();
    onChange(entry.value);
  }, [onChange]);

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (event.key === 'y' && event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      redo();
    }
  };

  const hist = historyRef.current ?? [];
  const canUndo = hist.length > 0 && historyIndexRef.current > 0;
  const canRedo = hist.length > 0 && historyIndexRef.current < hist.length - 1;

  const tBtn = compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const taMin = compact
    ? 'min-h-[140px] max-h-[min(72dvh,34rem)] overflow-y-auto'
    : 'min-h-[320px]';
  const taText = compact ? 'px-3 py-3 text-sm leading-6' : 'px-5 py-4 text-base leading-7';
  const fmtIcon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const fmtBtn = compact ? 'p-1.5' : 'p-2';

  return (
    <div className={cn('flex min-h-0 flex-col', !compact && 'flex-1', className)}>
      {compact ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200/60 bg-white/70 px-2 py-1.5 backdrop-blur-sm">
          <div className="inline-flex shrink-0 rounded-full border border-violet-200/50 bg-white/80 p-0.5 backdrop-blur-sm">
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={() => onScopeChange('whole-post')}
              className={`cursor-pointer rounded-full font-semibold transition-all duration-200 ${tBtn} ${effectiveScope === 'whole-post' ? 'bg-ink text-primary-fg shadow-sm hover:bg-ink/90 hover:text-primary-fg' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
            >
              Whole post
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={() => onScopeChange('selection')}
              disabled={!selection?.text?.trim()}
              className={`cursor-pointer rounded-full font-semibold transition-all duration-200 ${tBtn} ${effectiveScope === 'selection' ? 'bg-primary text-primary-fg shadow-sm hover:bg-primary/90 hover:text-primary-fg' : 'text-muted hover:bg-white/60 hover:text-ink/70 disabled:cursor-not-allowed disabled:text-muted/40'}`}
            >
              Selection
            </Button>
          </div>
          <p className="min-w-0 max-w-full flex-[1_1_12rem] text-xs text-muted sm:flex-[1_1_16rem]">
            <span className="font-semibold text-ink">Target: </span>
            <span className="break-words">{effectiveScope === 'selection' ? selectionSummary : 'Entire draft'}</span>
          </p>
          <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Undo and redo">
            <Button
              type="button"
              variant="ghost"
              size="inline"
              title="Undo"
              aria-label="Undo"
              disabled={!canUndo}
              onClick={() => undo()}
              className={`inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold text-ink transition-all duration-200 hover:bg-violet-100/50 hover:text-primary hover:shadow-md active:scale-95 active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 ${fmtBtn}`}
            >
              <Undo2 className={fmtIcon} aria-hidden />
              <span className="sr-only">Undo</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              title="Redo"
              aria-label="Redo"
              disabled={!canRedo}
              onClick={() => redo()}
              className={`inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold text-ink transition-all duration-200 hover:bg-violet-100/50 hover:text-primary hover:shadow-md active:scale-95 active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 ${fmtBtn}`}
            >
              <Redo2 className={fmtIcon} aria-hidden />
              <span className="sr-only">Redo</span>
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-0.5" role="toolbar" aria-label="Formatting">
            {FORMATTING_ACTIONS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant="ghost"
                size="inline"
                title={label}
                onClick={() => onFormatting(id)}
                className={`inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold text-ink transition-all duration-200 hover:bg-violet-100/50 hover:text-primary hover:shadow-md active:scale-95 active:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 ${fmtBtn}`}
              >
                <Icon className={fmtIcon} aria-hidden />
                <span className="sr-only">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        /* Non-compact: original single-row toolbar with dropdown */
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200/60 bg-white/70 backdrop-blur-sm transition-all duration-200 px-3 py-2">
          <div className="inline-flex rounded-full border border-violet-200/50 bg-white/80 backdrop-blur-sm transition-all duration-200 p-1">
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={() => onScopeChange('whole-post')}
              className={`cursor-pointer rounded-full font-semibold transition-all duration-200 ${tBtn} ${effectiveScope === 'whole-post' ? 'bg-ink text-primary-fg shadow-sm hover:bg-ink/90 hover:text-primary-fg' : 'text-muted hover:bg-white/60 hover:text-ink/70'}`}
            >
              Whole post
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={() => onScopeChange('selection')}
              disabled={!selection?.text?.trim()}
              className={`cursor-pointer rounded-full font-semibold transition-all duration-200 ${tBtn} ${effectiveScope === 'selection' ? 'bg-primary text-primary-fg shadow-sm hover:bg-primary/90 hover:text-primary-fg' : 'text-muted hover:bg-white/60 hover:text-ink/70 disabled:cursor-not-allowed disabled:text-muted/40'}`}
            >
              Selection
            </Button>
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-2.5 py-1 text-sm text-muted">
            <span className="font-semibold text-ink">Target:</span>{' '}
            {effectiveScope === 'selection' ? selectionSummary : 'Entire draft'}
            <span className="mt-0.5 block text-[0.65rem] font-normal text-muted/90">
              Quick Change and 4 Variants use this target.
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Undo and redo">
            <Button
              type="button"
              variant="ghost"
              size="inline"
              title="Undo"
              aria-label="Undo"
              disabled={!canUndo}
              onClick={() => undo()}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surface p-2 font-semibold text-ink transition-colors hover:bg-canvas disabled:pointer-events-none disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Undo</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              title="Redo"
              aria-label="Redo"
              disabled={!canRedo}
              onClick={() => redo()}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surface p-2 font-semibold text-ink transition-colors hover:bg-canvas disabled:pointer-events-none disabled:opacity-40"
            >
              <Redo2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Redo</span>
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button
                variant="ghost"
                type="button"
                className="inline-flex cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Formatting actions
              </Button>} />
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="mt-1 grid min-w-[220px] max-w-[min(100vw-2rem,280px)] gap-0.5"
            >
              {FORMATTING_ACTIONS.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem key={id} onClick={() => onFormatting(id)}>
                  <Icon className="h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleEditorKeyDown}
        onSelect={syncSelection}
        onKeyUp={syncSelection}
        onMouseUp={syncSelection}
        spellCheck={false}
        className={cn(
          'w-full resize-none rounded-xl border border-violet-200/60 bg-white/85 text-ink outline-none transition-all duration-200 hover:border-violet-300/70 hover:bg-white/95 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/35 focus:ring-offset-0 focus:shadow-lg',
          !compact && 'flex-1',
          taMin,
          taText,
        )}
        placeholder="Edit the draft here. Select a sentence to target only that part with Quick Change or 4 Variants."
      />
    </div>
  );
}
