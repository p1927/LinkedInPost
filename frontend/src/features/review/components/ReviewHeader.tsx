import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../../lib/cn';
import { useReviewFlow } from '../context/ReviewFlowContext';

export function ReviewHeader() {
  const {
    sheetRow,
    routed,
    topicHeadingRef,
    topicTitleInWorkspaceChrome,
    showPickPhase,
    showEditorLayout,
    sheetVariants,
    topicIsLong,
    topicExpanded,
    setTopicExpanded,
    leaveToTopics,
    requestNavigateToVariants,
    setReviewPhase,
    handleOpenMediaFromPickTile,
    pickCarouselIndex,
    handleLoadSheetVariant,
    editorDirty,
    previewReadyCount,
    postTime,
    setPostTime,
  } = useReviewFlow();

  const renderScheduleInput = (className?: string) => (
    <div className={cn("flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:max-w-[240px]", className)}>
      <label
        htmlFor="review-post-time-input"
        className="text-[10px] font-bold uppercase tracking-wider text-ink/70"
      >
        Schedule{' '}
        <span className="font-normal normal-case tracking-normal text-ink/65">(optional)</span>
      </label>
      <Input
        id="review-post-time-input"
        type="datetime-local"
        value={postTime}
        onChange={(event) => setPostTime(event.target.value)}
        aria-label="Schedule post time (optional)"
        className={cn(
          'min-h-[44px] w-full min-w-0 rounded-xl border border-violet-200/70 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm outline-none transition-all duration-200 hover:border-violet-300/80 hover:shadow-md',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/95 sm:w-[220px]',
        )}
      />
    </div>
  );

  return (
    <>
      {topicTitleInWorkspaceChrome ? (
        <h2 id="review-workspace-title" ref={topicHeadingRef} tabIndex={-1} className="sr-only">
          {sheetRow.topic}
        </h2>
      ) : null}
      {topicTitleInWorkspaceChrome && showPickPhase ? null : (
        <header className="shrink-0 border-b border-violet-200/35 px-4 py-2.5 sm:py-3">
          {showPickPhase ? (
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={leaveToTopics}
                  aria-label="Back to topics list"
                  className="h-10 min-h-10 shrink-0 gap-1.5 px-3 sm:h-9 sm:min-h-9"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">Topics</span>
                </Button>
                <div className="text-xs font-semibold text-muted">
                  Step 1 of 2
                </div>
                <div className="min-w-0 flex-1 border-l border-violet-200/35 pl-3 sm:pl-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Choose variant</p>
                  <h2
                    id="review-workspace-title"
                    ref={topicHeadingRef}
                    tabIndex={-1}
                    className={cn(
                      'mt-0.5 font-heading text-lg font-bold leading-snug text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-xl',
                      !topicExpanded && topicIsLong && 'line-clamp-2',
                    )}
                  >
                    {sheetRow.topic}
                  </h2>
                  {topicIsLong ? (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setTopicExpanded((v) => !v)}
                      className="mt-0.5 h-auto p-0 text-left text-[11px] font-semibold"
                    >
                      {topicExpanded ? 'Show less' : 'Show full topic'}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:w-auto sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenMediaFromPickTile(pickCarouselIndex)}
                  aria-label={`Open media for draft ${pickCarouselIndex + 1}`}
                  className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:w-auto sm:flex-none sm:px-4"
                >
                  Media
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleLoadSheetVariant(pickCarouselIndex)}
                  aria-label={`Open draft ${pickCarouselIndex + 1} in editor`}
                  className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:w-auto sm:flex-none sm:px-4"
                >
                  Open in editor
                </Button>
              </div>
            </div>
          ) : topicTitleInWorkspaceChrome ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div className="text-xs font-semibold text-muted">
                  Step {showEditorLayout ? 2 : 1} of 2
                </div>
                {showEditorLayout && sheetVariants.length > 0 ? (
                  <Badge variant="info" size="xs" className="normal-case font-bold shadow-sm">
                    Editing
                  </Badge>
                ) : null}
                {editorDirty ? (
                  <Badge variant="warning" size="xs" className="normal-case font-bold shadow-sm">
                    Draft edited
                  </Badge>
                ) : null}
                {previewReadyCount > 0 ? (
                  <Badge variant="neutral" size="xs" className="normal-case font-bold shadow-sm">
                    {previewReadyCount} AI preview{previewReadyCount === 1 ? '' : 's'}
                  </Badge>
                ) : null}
              </div>
              {renderScheduleInput("sm:self-end")}
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                {showEditorLayout && sheetVariants.length > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={routed ? requestNavigateToVariants : () => setReviewPhase('pick-variant')}
                    aria-label="Back to variants"
                    className="h-10 min-h-10 shrink-0 gap-1.5 px-3 sm:h-9 sm:min-h-9"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">Variants</span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={leaveToTopics}
                  aria-label="Back to topics list"
                  className="h-10 min-h-10 shrink-0 gap-1.5 px-3 sm:h-9 sm:min-h-9"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">Topics</span>
                </Button>
                <div className="min-w-0 flex-1 basis-full border-t border-violet-200/35 pt-2 sm:basis-auto sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  {sheetVariants.length > 0 ? (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                      {showPickPhase ? 'Choose variant' : 'Refine'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Review</p>
                  )}
                  <h2
                    id="review-workspace-title"
                    ref={topicHeadingRef}
                    tabIndex={-1}
                    className={cn(
                      'mt-0.5 font-heading text-lg font-bold leading-snug text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-xl',
                      !topicExpanded && topicIsLong && 'line-clamp-2',
                    )}
                  >
                    {sheetRow.topic}
                  </h2>
                  {topicIsLong ? (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setTopicExpanded((v) => !v)}
                      className="mt-0.5 h-auto p-0 text-left text-[11px] font-semibold"
                    >
                      {topicExpanded ? 'Show less' : 'Show full topic'}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:max-w-[min(100%,20rem)] sm:items-end">
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {showEditorLayout && sheetVariants.length > 0 ? (
                    <Badge variant="info" size="xs" className="normal-case font-bold shadow-sm">
                      Editing
                    </Badge>
                  ) : null}
                  {editorDirty ? (
                    <Badge variant="warning" size="xs" className="normal-case font-bold shadow-sm">
                      Draft edited
                    </Badge>
                  ) : null}
                  {previewReadyCount > 0 ? (
                    <Badge variant="neutral" size="xs" className="normal-case font-bold shadow-sm">
                      {previewReadyCount} AI preview{previewReadyCount === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                </div>
                {renderScheduleInput()}
              </div>
            </div>
          )}
        </header>
      )}
    </>
  );
}
