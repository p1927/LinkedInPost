import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DraftEditor } from '../../editor/DraftEditor';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';
import { EditorSidebar } from '../components/EditorSidebar';
import { LivePreviewSidebar } from '../components/LivePreviewSidebar';
import { EditorVariantBar } from '../../variant/components/EditorVariantBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { getChannelLabel } from '@/integrations/channels';
import { ScheduledPublishBanner } from '@/features/scheduled-publish';

function ResizeHandle() {
  return (
    <PanelResizeHandle className="relative flex w-4 shrink-0 items-center justify-center bg-transparent outline-none group">
      <div className="z-10 flex h-10 w-1.5 items-center justify-center rounded-full bg-violet-200/50 transition-colors group-hover:bg-violet-400 group-active:bg-violet-500" />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-violet-200/30 transition-colors group-hover:bg-violet-300" />
    </PanelResizeHandle>
  );
}

export function EditorScreen() {
  const {
    sheetRow,
    editorText,
    setEditorText,
    selection,
    setSelection,
    scope,
    setScope,
    editorDirty,
    handleFormatting,
    handleApprove,
    handlePublishNow,
    publishSubmitting,
    submitting,
    deliveryChannel,
    pendingScheduledPublish,
    scheduledPublishCancelBusy,
    onCancelScheduledPublish,
    onDismissScheduledPublish,
    postTime,
    setPostTime,
    previewReadyCount,
    routed,
    editorStartMediaPanel,
  } = useReviewFlow();

  const editorHistoryResetKey = `${sheetRow.topic}:${routed?.screen ?? ''}:${routed?.editorVariantSlot ?? ''}:${editorStartMediaPanel}`;

  const isPublished = (sheetRow.status || '').trim().toLowerCase() === 'published';
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const footerBusy = submitting || publishSubmitting;
  const channelLabel = getChannelLabel(deliveryChannel);
  const showScheduledBanner =
    pendingScheduledPublish != null
    && pendingScheduledPublish.topic.trim() === sheetRow.topic.trim()
    && pendingScheduledPublish.date.trim() === sheetRow.date.trim();

  const editorSection = (
    <section
      aria-labelledby="review-draft-editor-heading"
      className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-violet-200/30 px-4 py-3 xl:order-none xl:h-full xl:max-h-full xl:flex-1 xl:border-b-0"
    >
      <h3 id="review-draft-editor-heading" className="sr-only">
        Draft editor
      </h3>
      <DraftEditor
        value={editorText}
        selection={selection}
        preferredScope={scope}
        dirty={editorDirty}
        onChange={setEditorText}
        onSelectionChange={setSelection}
        onScopeChange={setScope}
        onFormatting={handleFormatting}
        historyResetKey={editorHistoryResetKey}
        compact
        className="min-h-0 xl:flex-none"
      />
    </section>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto xl:overflow-hidden">
        <EditorVariantBar />
        {isDesktop ? (
          <PanelGroup
            orientation="horizontal"
            className="min-h-0 w-full flex-1"
            resizeTargetMinimumSize={{ coarse: 28, fine: 14 }}
          >
            <Panel
              id="review-refine"
              defaultSize="26%"
              minSize="16%"
              maxSize="48%"
              className="flex min-h-0 flex-col"
            >
              <EditorSidebar />
            </Panel>
            <ResizeHandle />
            <Panel
              id="review-editor"
              defaultSize="48%"
              minSize="28%"
              className="flex min-h-0 flex-col"
            >
              {editorSection}
            </Panel>
            <ResizeHandle />
            <Panel
              id="review-preview"
              defaultSize="26%"
              minSize="16%"
              maxSize="48%"
              className="flex min-h-0 flex-col"
            >
              <LivePreviewSidebar />
            </Panel>
          </PanelGroup>
        ) : (
          <>
            {editorSection}
            <EditorSidebar />
            <LivePreviewSidebar />
          </>
        )}
      </div>

      <footer className="shrink-0 border-t border-violet-200/35 bg-canvas/95 px-4 py-3 backdrop-blur-sm">
        {showScheduledBanner && pendingScheduledPublish ? (
          <div className="mb-3">
            <ScheduledPublishBanner
              pending={pendingScheduledPublish}
              onCancel={() => void onCancelScheduledPublish()}
              cancelBusy={scheduledPublishCancelBusy}
              onDismiss={onDismissScheduledPublish}
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
          <div
            className={cn(
              'flex shrink-0 flex-col gap-2 justify-stretch sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3',
              !isPublished && 'sm:items-center',
            )}
          >
            <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:max-w-[240px] sm:shrink-0">
              <label
                htmlFor="review-post-time-input"
                className="text-[10px] font-bold uppercase tracking-wider text-ink/70"
              >
                Schedule
              </label>
              <Input
                id="review-post-time-input"
                type="datetime-local"
                value={postTime}
                onChange={(event) => setPostTime(event.target.value)}
                aria-label="Schedule post time"
                className={cn(
                  'min-h-[44px] w-full min-w-0 rounded-xl border border-violet-200/70 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm outline-none transition-all duration-200 hover:border-violet-300/80 hover:shadow-md',
                  'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/95 sm:w-[220px]',
                )}
              />
            </div>
            {isPublished ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => void handleApprove()}
                disabled={footerBusy}
                className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none lg:w-auto lg:min-w-[9rem]"
              >
                {submitting ? 'Saving…' : '✓ Save as draft'}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleApprove()}
                  disabled={footerBusy}
                  title="Mark as approved in the sheet only. Publish later from the queue."
                  className="min-h-[44px] w-full border-primary/25 shadow-sm sm:w-auto sm:min-w-[8.5rem]"
                >
                  {submitting ? 'Saving…' : 'Approve only'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void handlePublishNow()}
                  disabled={footerBusy}
                  title={`Approve and send immediately to ${channelLabel} (same as queue Publish).`}
                  className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none sm:w-auto sm:min-w-[9rem]"
                >
                  {publishSubmitting
                    ? 'Publishing…'
                    : `Publish to ${channelLabel}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
