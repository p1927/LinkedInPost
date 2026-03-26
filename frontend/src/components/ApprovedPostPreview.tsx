import { CalendarClock, Eye, X } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';

interface ApprovedPostPreviewProps {
  row: SheetRow;
  onClose: () => void;
}

export function ApprovedPostPreview({ row, onClose }: ApprovedPostPreviewProps) {
  const normalizedStatus = row.status?.trim().toLowerCase() || 'approved';
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1240px)] items-center justify-center">
        <div className="flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b from-white/95 to-slate-50/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 sm:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Eye className="h-3.5 w-3.5" /> {previewLabel}
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">{row.topic}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {previewDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden xl:overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="xl:min-h-0 xl:overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(241,245,249,0.72))] px-4 py-5 sm:px-6 xl:px-8 xl:py-8">
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

            <aside className="flex xl:min-h-0 flex-col border-t border-slate-200/70 bg-white/70 px-5 py-5 xl:border-l xl:border-t-0 xl:px-6 xl:py-8">
              <div className="rounded-xl border border-white/60 bg-white/90 p-6 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Publishing summary</p>

                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{statusLabel}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scheduled time</p>
                    <div className="mt-2 flex items-start gap-3 text-slate-700">
                      <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                      <p className="text-sm leading-6">
                        {row.postTime?.trim()
                          ? row.postTime
                          : 'No scheduled time is set. Publishing will use the next available workflow run.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Selected image</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {row.selectedImageId?.trim()
                        ? imageLabel
                        : emptyImageLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Close preview
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}