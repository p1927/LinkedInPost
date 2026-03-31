import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useReviewFlow } from '../../review/context/useReviewFlow';
import { VariantCarousel } from './VariantCarousel';

export function EditorVariantBar() {
  const {
    sheetVariants,
    editorVariantIndex,
    pickCarouselIndex,
    handleLoadSheetVariant,
    setPickCarouselIndex,
  } = useReviewFlow();

  const [expanded, setExpanded] = useState(false);
  const prevVariantIndexRef = useRef(editorVariantIndex);
  const rootRef = useRef<HTMLDivElement>(null);

  const highlightedVariantIndex = expanded
    ? pickCarouselIndex
    : editorVariantIndex !== null
      ? editorVariantIndex
      : pickCarouselIndex;

  // Auto-collapse when a variant is successfully loaded (editorVariantIndex changes)
  useEffect(() => {
    if (prevVariantIndexRef.current !== editorVariantIndex) {
      prevVariantIndexRef.current = editorVariantIndex;
      setExpanded(false);
    }
  }, [editorVariantIndex]);

  // Sync the carousel to the active variant when expanding
  useEffect(() => {
    if (expanded && editorVariantIndex !== null) {
      setPickCarouselIndex(editorVariantIndex);
    }
  }, [expanded, editorVariantIndex, setPickCarouselIndex]);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      const el = rootRef.current;
      if (!el || el.contains(event.target as Node)) return;
      setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [expanded]);

  if (sheetVariants.length === 0) return null;

  return (
    <div ref={rootRef} className="shrink-0 border-b border-violet-200/35 bg-canvas/98 backdrop-blur-sm">
      {/* Tab bar — whole row expands when collapsed (variant buttons still load / toggle as before) */}
      <div
        role="presentation"
        className={cn('flex cursor-pointer items-center gap-2 px-4 py-2')}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink/50">
          Variants
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none">
          {sheetVariants.map((_, index) => {
            const isHighlighted = index === highlightedVariantIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  if (expanded) {
                    e.stopPropagation();
                    if (index === pickCarouselIndex) {
                      setExpanded(false);
                    } else {
                      setPickCarouselIndex(index);
                    }
                    return;
                  }
                  if (index === editorVariantIndex) {
                    e.stopPropagation();
                    setExpanded((x) => !x);
                    return;
                  }
                  handleLoadSheetVariant(index);
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  isHighlighted
                    ? 'bg-primary text-white shadow-sm ring-2 ring-primary/20'
                    : 'bg-violet-100/70 text-ink/65 hover:bg-violet-200/80 hover:text-ink/85',
                )}
                aria-pressed={isHighlighted}
              >
                Variant {index + 1}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          className="ml-auto shrink-0 size-7 min-h-0 min-w-0 rounded-lg text-ink/50 hover:text-ink/80"
          aria-label={expanded ? 'Collapse variants' : 'Expand variants'}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </Button>
      </div>

      {/* Expanded carousel */}
      {expanded && (
        <div className="px-4 pb-5 pt-1">
          <VariantCarousel />
        </div>
      )}
    </div>
  );
}
