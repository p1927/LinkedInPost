import { CalendarClock, Eye, X } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { Button } from '@/components/ui/button';

interface ApprovedPostPreviewProps {
  row: SheetRow;
  onClose: () => void;
}

export function ApprovedPostPreview({ row, onClose }: ApprovedPostPreviewProps) {
  const normalizedStatus = (row.status || '').trim().toLowerCase() || 'approved';
  const isPublished = normalizedStatus === 'published';
  const previewLabel = isPublished ? 'Published Preview' : 'Approved Preview';
  const previewDescription = isPublished
    ? 'This view shows the final post that was published from this topic, including the approved copy and selected image at publish time.'
    : 'This is the exact post currently queued for publishing. Review the final copy, image, and scheduled time before you send it.';
  const statusLabel = isPublished ? 'Published' : 'Approved and ready';
  const imageLabel = isPublished
    ? 'The image shown here is the one that was attached when this post was published.'
    : 'The chosen image is attached to this post preview.';
  const emptyImageLabel = isPublished
    ? 'This published post did not include a selected image.'
    : 'No image was selected for this approved post.';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-deep-purple/35 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1240px)] items-center justify-center">
        <div className="glass-panel-strong flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/45 px-6 py-5 sm:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-success-border bg-success-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-success-ink">
                <Eye className="h-3.5 w-3.5" /> {previewLabel}
              </div>
              <h2 className="mt-3 font-heading text-xl font-semibold text-ink">{row.topic}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {previewDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon-lg"
              onClick={onClose}
              className="cursor-pointer rounded-full bg-white/60 p-2.5 text-muted transition-all duration-200 hover:bg-white/90 hover:text-ink hover:shadow-md focus:ring-2 focus:ring-primary/50 focus:outline-none"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_360px] xl:overflow-hidden">
            <section className="bg-white/25 px-4 py-5 backdrop-blur-sm sm:px-6 xl:min-h-0 xl:overflow-y-auto xl:px-8 xl:py-8">
              <LinkedInPostPreview
                optionNumber={1}
                text={row.selectedText || row.variant1}
                imageUrl={row.selectedImageId}
                selected={true}
                expanded={true}
                onSelect={() => undefined}
                onToggleExpanded={() => undefined}
                mode="hero"
              />
            </section>

            <aside className="flex flex-col border-t border-white/40 bg-white/20 px-5 py-5 backdrop-blur-sm xl:min-h-0 xl:border-l xl:border-t-0 xl:px-6 xl:py-8">
              <div className="glass-panel rounded-xl p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Publishing summary</p>

                <div className="mt-5 grid gap-4">
                  <div className="glass-inset rounded-2xl px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Status</p>
                    <p className="mt-2 text-sm font-semibold text-success-ink">{statusLabel}</p>
                  </div>

                  <div className="glass-inset rounded-2xl px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Scheduled time</p>
                    <div className="mt-2 flex items-start gap-3 text-ink">
                      <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                      <p className="text-sm leading-6">
                        {row.postTime?.trim()
                          ? row.postTime
                          : 'No scheduled time is set. Publishing will use the next available workflow run.'}
                      </p>
                    </div>
                  </div>

                  <div className="glass-inset rounded-2xl px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Selected image</p>
                    <p className="mt-2 text-sm leading-6 text-ink">
                      {row.selectedImageId?.trim()
                        ? imageLabel
                        : emptyImageLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  className="cursor-pointer rounded-xl px-5 transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-primary/50 focus:outline-none"
                >
                  Close preview
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
