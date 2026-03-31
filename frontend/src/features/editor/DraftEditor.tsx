import { Highlighter, List, Redo2, ScanSearch, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import type { GenerationScope, TextSelectionRange } from '../../services/backendApi';
import { cn } from '@/lib/cn';
import {
  DraftTextareaWithHighlight,
  ScopeModeToolbar,
  type FormattingAction,
  normalizeSelection,
} from '@/features/draft-selection-target';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

function cursorFromSelection(sel: TextSelectionRange | null, len: number): { start: number; end: number } {
  if (sel != null && sel.start >= 0 && sel.end >= 0 && sel.start <= sel.end && sel.end <= len) {
    return { start: sel.start, end: sel.end };
  }
  return { start: len, end: len };
}

interface DraftEditorProps {
  value: string;
  selection: TextSelectionRange | null;
  preferredScope: GenerationScope;
  dirty: boolean;
  onChange: (value: string) => void;
  onSelectionChange: (selection: TextSelectionRange | null) => void;
  onScopeChange: (scope: GenerationScope) => void;
  onFormatting: (action: FormattingAction) => void;
  /** When this changes, undo history is cleared (e.g. new sheet row or editor route). */
  historyResetKey?: string;
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
  historyResetKey = '',
  compact = false,
  className,
}: DraftEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<EditorHistoryEntry[] | null>(null);
  const historyIndexRef = useRef(0);
  const applyingHistoryRef = useRef(false);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const lastHistoryResetKeyRef = useRef(historyResetKey);
  const [, bumpHistoryUi] = useReducer((n: number) => n + 1, 0);

  if (historyRef.current === null) {
    historyRef.current = [{ value, start: value.length, end: value.length }];
    historyIndexRef.current = 0;
  }

  const pushHistoryEntry = (nextValue: string, start: number, end: number) => {
    const hist = historyRef.current ?? [];
    const idx = historyIndexRef.current;
    const next = [...hist.slice(0, idx + 1), { value: nextValue, start, end }];
    if (next.length > MAX_EDITOR_HISTORY) {
      const overflow = next.length - MAX_EDITOR_HISTORY;
      next.splice(0, overflow);
      historyIndexRef.current = next.length - 1;
    } else {
      historyIndexRef.current = next.length - 1;
    }
    historyRef.current = next;
    bumpHistoryUi();
  };

  useEffect(() => {
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }
    const hist = historyRef.current ?? [];
    const idx = historyIndexRef.current;

    if (historyResetKey !== lastHistoryResetKeyRef.current) {
      lastHistoryResetKeyRef.current = historyResetKey;
      const c = cursorFromSelection(selection, value.length);
      historyRef.current = [{ value, start: c.start, end: c.end }];
      historyIndexRef.current = 0;
      bumpHistoryUi();
      return;
    }

    if (value === hist[idx]?.value) return;

    const c = cursorFromSelection(selection, value.length);
    pushHistoryEntry(value, c.start, c.end);
  }, [value, selection, historyResetKey]);

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
    pushHistoryEntry(newValue, start, end);
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

  const taMin = compact
    ? 'min-h-[140px] max-h-[min(72dvh,34rem)] overflow-y-auto'
    : 'min-h-[320px] flex-1 min-h-0 overflow-y-auto';
  const taText = compact ? 'px-3 py-3 text-sm leading-6' : 'px-5 py-4 text-base leading-7';
  const fmtIcon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const fmtBtn = compact ? 'p-1.5' : 'p-2';

  const undoRedoCompact = (
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
  );

  const formatToolbarCompact = (
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
  );

  const undoRedoWide = (
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
  );

  const formatMenuWide = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            type="button"
            className="inline-flex cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Formatting actions
          </Button>
        }
      />
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
  );

  return (
    <div className={cn('flex min-h-0 flex-col', !compact && 'flex-1', className)}>
      {compact ? (
        <ScopeModeToolbar
          compact
          preferredScope={preferredScope}
          selection={selection}
          onScopeChange={onScopeChange}
          trailing={
            <>
              {undoRedoCompact}
              {formatToolbarCompact}
            </>
          }
        />
      ) : (
        <ScopeModeToolbar
          preferredScope={preferredScope}
          selection={selection}
          onScopeChange={onScopeChange}
          trailing={
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {undoRedoWide}
              {formatMenuWide}
            </div>
          }
        />
      )}

      <div className={cn('flex min-h-0 flex-col', !compact && 'min-h-0 flex-1')}>
        <DraftTextareaWithHighlight
          ref={textareaRef}
          value={value}
          preferredScope={preferredScope}
          selection={selection}
          editorTypographyClassName={taText}
          editorContainerClassName={taMin}
          onChange={handleTextChange}
          onKeyDown={handleEditorKeyDown}
          onSelect={syncSelection}
          onKeyUp={syncSelection}
          onMouseUp={syncSelection}
          spellCheck={false}
          className={cn(!compact && 'min-h-0 flex-1')}
          aria-labelledby="review-draft-editor-heading"
          placeholder="Write or edit your post…"
        />
      </div>
    </div>
  );
}
