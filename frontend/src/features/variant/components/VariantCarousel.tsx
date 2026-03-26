import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../../../lib/cn';
import { LinkedInPostPreview } from '../../../components/LinkedInPostPreview';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';

export function VariantCarousel() {
  const {
    sheetVariants,
    pickCarouselIndex,
    setPickCarouselIndex,
    changePickCarouselBy,
    handlePickCarouselKeyDown,
    deliveryChannel,
    previewAuthorName,
    handleLoadSheetVariant,
    handleOpenMediaFromPickTile,
  } = useReviewFlow();

  return (
    <>
      <div
        className="relative flex min-h-0 flex-1 flex-col justify-center sm:min-h-[min(42vh,480px)]"
        role="region"
        aria-roledescription="carousel"
        aria-label="Variants"
      >
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute -left-2 sm:-left-4 top-1/2 z-20 size-12 min-h-12 min-w-12 -translate-y-1/2 rounded-full border border-border bg-white shadow-md transition-all duration-200 hover:bg-surface-muted sm:size-14 sm:min-h-14 sm:min-w-14"
          aria-label="Previous variant"
          disabled={pickCarouselIndex === 0 || sheetVariants.length <= 1}
          onClick={() => changePickCarouselBy(-1)}
        >
          <ChevronLeft className="size-7 sm:size-8 transition-transform duration-200" aria-hidden strokeWidth={2.25} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute -right-2 sm:-right-4 top-1/2 z-20 size-12 min-h-12 min-w-12 -translate-y-1/2 rounded-full border border-border bg-white shadow-md transition-all duration-200 hover:bg-surface-muted sm:size-14 sm:min-h-14 sm:min-w-14"
          aria-label="Next variant"
          disabled={pickCarouselIndex === sheetVariants.length - 1 || sheetVariants.length <= 1}
          onClick={() => changePickCarouselBy(1)}
        >
          <ChevronRight className="size-7 sm:size-8 transition-transform duration-200" aria-hidden strokeWidth={2.25} />
        </Button>

        <div
          className="min-h-0 min-w-0 flex-1 overflow-hidden px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-2"
          onKeyDown={handlePickCarouselKeyDown}
          tabIndex={0}
        >
          <div
            className="flex h-full min-w-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: `${sheetVariants.length * 100}%`,
              transform: `translateX(-${(100 / sheetVariants.length) * pickCarouselIndex}%)`,
            }}
          >
            {sheetVariants.map((variant, index) => (
              <div
                key={`sheet-variant-${variant.originalIndex}`}
                className={cn(
                  'flex h-full min-h-[min(40vh,420px)] min-w-0 flex-shrink-0 flex-col items-center justify-center px-1 sm:min-h-[min(44vh,480px)] sm:px-2 sm:py-2',
                  index !== pickCarouselIndex && 'pointer-events-none',
                )}
                style={{ width: `${100 / sheetVariants.length}%` }}
                aria-hidden={index !== pickCarouselIndex}
              >
                <LinkedInPostPreview
                  optionNumber={index + 1}
                  text={variant.text}
                  imageUrl={variant.imageUrl || undefined}
                  selected={index === pickCarouselIndex}
                  expanded={false}
                  pickMode
                  previewChannel={deliveryChannel}
                  previewAuthorName={previewAuthorName}
                  mode="carousel"
                  className="max-h-full w-full max-w-[min(100%,36rem)] min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-white shadow-sm"
                  onSelect={() => handleLoadSheetVariant(index)}
                  onToggleExpanded={() => undefined}
                  onOpenMedia={() => handleOpenMediaFromPickTile(index)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-5"
        role="tablist"
        aria-label="Jump to variant"
      >
        <p className="text-xs font-semibold tabular-nums text-ink/70">
          {pickCarouselIndex + 1}
          <span className="font-medium text-ink/50"> / {sheetVariants.length}</span>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {sheetVariants.map((variant, index) => {
            const active = index === pickCarouselIndex;
            return (
              <Button
                key={`pick-dot-${variant.originalIndex}`}
                type="button"
                variant="ghost"
                size="icon-sm"
                role="tab"
                aria-selected={active}
                aria-label={`Variant ${index + 1}`}
                onClick={() => setPickCarouselIndex(index)}
                className={cn(
                  'size-2.5 min-h-0 min-w-0 rounded-full p-0 transition-colors duration-200',
                  active
                    ? 'scale-110 bg-primary shadow-sm ring-2 ring-primary/25'
                    : 'bg-ink/20 hover:bg-ink/35',
                )}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
