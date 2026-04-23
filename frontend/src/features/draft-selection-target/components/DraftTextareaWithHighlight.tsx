import { forwardRef, useCallback, useRef, type ComponentPropsWithoutRef, type UIEventHandler } from 'react';
import type { GenerationScope, TextSelectionRange } from '@/services/backendApi';
import { cn } from '@/lib/cn';
import { getClampedSelectionForHighlight, getEffectiveScope } from '../model';

export type DraftTextareaWithHighlightProps = Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'className' | 'children'
> & {
  value: string;
  preferredScope: GenerationScope;
  selection: TextSelectionRange | null;
  /** Shared typography + padding (mirror must match textarea). */
  editorTypographyClassName: string;
  /** Min height / max height / overflow (shared). */
  editorContainerClassName: string;
  /** Wrapper: border, radius, focus ring. */
  className?: string;
};

export const DraftTextareaWithHighlight = forwardRef<HTMLTextAreaElement, DraftTextareaWithHighlightProps>(
  function DraftTextareaWithHighlight(
    {
      value,
      preferredScope,
      selection,
      editorTypographyClassName,
      editorContainerClassName,
      className,
      onScroll,
      spellCheck = false,
      ...textareaProps
    },
    ref,
  ) {
    const mirrorRef = useRef<HTMLDivElement>(null);
    const effectiveScope = getEffectiveScope(preferredScope, selection);
    const range =
      effectiveScope === 'selection' ? getClampedSelectionForHighlight(value, selection) : null;

    const syncMirrorScroll = useCallback((scrollTop: number, scrollLeft: number) => {
      const m = mirrorRef.current;
      if (!m) return;
      m.scrollTop = scrollTop;
      m.scrollLeft = scrollLeft;
    }, []);

    const handleScroll: UIEventHandler<HTMLTextAreaElement> = (e) => {
      syncMirrorScroll(e.currentTarget.scrollTop, e.currentTarget.scrollLeft);
      onScroll?.(e);
    };

    const mirrorBody =
      range != null ? (
        <>
          {value.slice(0, range.start)}
          <span className="rounded-sm bg-primary/25 text-ink">{value.slice(range.start, range.end)}</span>
          {value.slice(range.end)}
        </>
      ) : (
        value
      );

    return (
      <div
        className={cn(
          'grid w-full rounded-xl border border-violet-200/60 bg-white/85 transition-all duration-200 hover:border-violet-300/70 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/35 focus-within:ring-offset-0 focus-within:shadow-lg',
          className,
        )}
      >
        <div
          ref={mirrorRef}
          className={cn(
            'col-start-1 row-start-1 overflow-auto whitespace-pre-wrap break-words text-ink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            editorTypographyClassName,
            editorContainerClassName,
          )}
          aria-hidden
        >
          {mirrorBody}
          {value === '' ? '\u00a0' : null}
        </div>
        <textarea
          ref={ref}
          spellCheck={spellCheck}
          value={value}
          {...textareaProps}
          className={cn(
            'col-start-1 row-start-1 z-[1] w-full resize-none overflow-auto border-0 bg-transparent text-transparent caret-ink outline-none [color:transparent] [-webkit-text-fill-color:transparent]',
            editorTypographyClassName,
            editorContainerClassName,
          )}
          onScroll={handleScroll}
        />
      </div>
    );
  },
);
