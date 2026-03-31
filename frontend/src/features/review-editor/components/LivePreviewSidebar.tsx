import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChannelPostPreview } from '../../../components/channel-previews/ChannelPostPreview';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';
import { useReviewFlowEditor } from '../../review/context/ReviewFlowEditorContext';

export function LivePreviewSidebar() {
  const {
    selectedImageUrls,
    previewCollapsed,
    setPreviewCollapsed,
    deliveryChannel,
    previewAuthorName,
    setActiveWorkspacePanel,
    emailTo,
    emailSubject,
  } = useReviewFlow();
  const { editorText } = useReviewFlowEditor();

  return (
    <aside className="order-3 min-h-0 min-w-0 px-3 py-3 xl:order-none xl:max-h-full xl:overflow-y-auto">
      <section
        aria-labelledby="review-live-preview-heading"
        className="sticky top-0 flex min-w-0 flex-col gap-2.5"
      >
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <p
              id="review-live-preview-heading"
              className="text-[10px] font-semibold uppercase tracking-wider text-ink/65 whitespace-nowrap"
            >
              Live preview
            </p>
            <Badge variant="neutral" size="xs" className="normal-case shrink-0">
              {deliveryChannel === 'gmail'
                ? selectedImageUrls.length > 1
                  ? `Gmail · ${selectedImageUrls.length} images`
                  : selectedImageUrls.length === 1
                    ? 'Gmail · image'
                    : 'Gmail · text'
                : selectedImageUrls.length > 1
                  ? `${selectedImageUrls.length} images`
                  : selectedImageUrls.length === 1
                    ? 'Image'
                    : 'Text only'}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="inline"
            onClick={() => setPreviewCollapsed((c) => !c)}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-primary hover:bg-violet-50 hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            {previewCollapsed ? 'Show' : 'Hide'}
          </Button>
        </div>
        {!previewCollapsed ? (
          <div className="flex w-full min-w-0 justify-center px-0.5 pb-1">
            <ChannelPostPreview
              optionNumber={1}
              text={editorText}
              imageUrl={selectedImageUrls[0]}
              imageUrls={selectedImageUrls.length > 1 ? selectedImageUrls : undefined}
              previewChannel={deliveryChannel}
              previewAuthorName={previewAuthorName}
              gmailTo={emailTo}
              gmailSubject={emailSubject}
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
