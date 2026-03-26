import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkedInPostPreview } from '../../../components/LinkedInPostPreview';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';

export function LivePreviewSidebar() {
  const {
    selectedImageUrl,
    previewCollapsed,
    setPreviewCollapsed,
    editorText,
    deliveryChannel,
    previewAuthorName,
    setActiveWorkspacePanel,
  } = useReviewFlow();

  return (
    <aside className="order-3 min-h-0 min-w-0 overflow-y-auto px-2 py-3 xl:order-none xl:max-h-full xl:overflow-y-auto">
      <section
        aria-labelledby="review-live-preview-heading"
        className="sticky top-0 flex min-w-0 flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5 shadow-sm">
          <p
            id="review-live-preview-heading"
            className="text-[10px] font-semibold uppercase tracking-wider text-ink/65"
          >
            Live preview
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="neutral" size="xs" className="normal-case">
              {selectedImageUrl ? 'Image' : 'Text only'}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="inline"
              onClick={() => setPreviewCollapsed((c) => !c)}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-white/55 hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              {previewCollapsed ? 'Show' : 'Hide'}
            </Button>
          </div>
        </div>
        {!previewCollapsed ? (
          <div className="flex w-full min-w-0 justify-center overflow-x-auto px-0.5 pb-1">
            <LinkedInPostPreview
              optionNumber={1}
              text={editorText}
              imageUrl={selectedImageUrl}
              previewChannel={deliveryChannel}
              previewAuthorName={previewAuthorName}
              layout="sidebar"
              selected
              expanded
              onSelect={() => undefined}
              onToggleExpanded={() => undefined}
              onOpenMedia={() => setActiveWorkspacePanel('media')}
            />
          </div>
        ) : (
          <p className="px-1 text-center text-[10px] leading-relaxed text-muted">
            Preview hidden. Show when you want to check layout and media.
          </p>
        )}
      </section>
    </aside>
  );
}
