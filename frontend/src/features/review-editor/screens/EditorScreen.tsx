import { useState } from 'react';
import { ShieldCheck, Eye } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DraftEditor } from '../../editor/DraftEditor';
import { useReviewFlow } from '../../review/context/useReviewFlow';
import { useReviewFlowEditor } from '../../review/context/ReviewFlowEditorContext';
import { EditorSidebar } from '../components/EditorSidebar';
import { LivePreviewSidebar } from '../components/LivePreviewSidebar';
import { EditorVariantBar } from '../../variant/components/EditorVariantBar';
import { ContentReviewReport } from '@/features/content-review/ContentReviewReport';
import type { ContentReviewReport as ContentReviewReportData } from '@/features/content-review/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { getChannelLabel } from '@/integrations/channels';
import { ScheduledPublishBanner, rowMatchesPendingScheduledPublish } from '@/features/scheduled-publish';
import { FEATURE_CONTENT_REVIEW } from '@/generated/features';

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
    handleSaveDraft,
    savingDraft,
    handleApprove,
    handlePublishNow,
    publishSubmitting,
    submitting,
    deliveryChannel,
    pendingScheduledPublish,
    scheduledPublishCancelBusy,
    onCancelScheduledPublish,
    postTime,
    setPostTime,
    previewReadyCount,
    routed,
    editorStartMediaPanel,
    sheetVariants,
    selectedImageUrls,
    onRunContentReview,
    onAfterContentReview,
  } = useReviewFlow();
  const {
    editorText,
    setEditorText,
    selection,
    setSelection,
    scope,
    setScope,
    editorDirty,
    handleFormatting,
  } = useReviewFlowEditor();

  const [contentReviewOpen, setContentReviewOpen] = useState(false);
  const [contentReviewBusy, setContentReviewBusy] = useState(false);
  const [contentReviewResult, setContentReviewResult] = useState<ContentReviewReportData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const editorHistoryResetKey = `${sheetRow.topic}:${routed?.screen ?? ''}:${routed?.editorVariantSlot ?? ''}:${editorStartMediaPanel}`;

  const isPublished = (sheetRow.status || '').trim().toLowerCase() === 'published';
  const hasSheetVariants = sheetVariants.length > 0;
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const footerBusy = submitting || publishSubmitting || savingDraft || contentReviewBusy;
  const showContentReview =
    FEATURE_CONTENT_REVIEW && typeof onRunContentReview === 'function';

  const runManualContentReview = async () => {
    if (!onRunContentReview) return;
    setContentReviewBusy(true);
    try {
      const report = await onRunContentReview(editorText, selectedImageUrls, deliveryChannel);
      setContentReviewResult(report);
      setContentReviewOpen(true);
      await onAfterContentReview?.();
    } finally {
      setContentReviewBusy(false);
    }
  };
  const channelLabel = getChannelLabel(deliveryChannel);
  const showScheduledBanner =
    pendingScheduledPublish != null
    && rowMatchesPendingScheduledPublish(
      { topicId: sheetRow.topicId, postTime },
      pendingScheduledPublish,
      deliveryChannel,
    );

  const editorSection = (
    <section
      aria-labelledby="review-draft-editor-heading"
      className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-violet-200/30 px-4 py-3 xl:order-none xl:h-full xl:max-h-full xl:flex-1 xl:border-b-0"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h3
          id="review-draft-editor-heading"
          className="text-[10px] font-semibold uppercase tracking-wider text-ink/55"
        >
          Draft editor
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold text-primary hover:bg-violet-50 hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Preview
        </Button>
      </div>
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
              defaultSize="32%"
              minSize="20%"
              maxSize="52%"
              className="flex min-h-0 flex-col"
            >
              <EditorSidebar />
            </Panel>
            <ResizeHandle />
            <Panel
              id="review-editor"
              defaultSize="68%"
              minSize="36%"
              className="flex min-h-0 flex-col"
            >
              {editorSection}
            </Panel>
          </PanelGroup>
        ) : (
          <>
            {editorSection}
            <EditorSidebar />
          </>
        )}
        <LivePreviewSidebar isOpen={previewOpen} onClose={() => setPreviewOpen(false)} />
      </div>

      <footer className="shrink-0 border-t border-violet-200/35 bg-canvas/95 px-4 py-3 backdrop-blur-sm">
        {showScheduledBanner && pendingScheduledPublish ? (
          <div className="mb-3">
            <ScheduledPublishBanner
              pending={pendingScheduledPublish}
              onCancel={() => void onCancelScheduledPublish()}
              cancelBusy={scheduledPublishCancelBusy}
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
              (!isPublished || (isPublished && hasSheetVariants)) && 'sm:items-center',
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
            {showContentReview ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void runManualContentReview()}
                disabled={footerBusy}
                title="Run AI checks on the current editor text and selected image(s). You do not need to save first."
                className="min-h-[44px] w-full border-violet-200/80 bg-white/90 shadow-sm sm:w-auto sm:min-w-[9rem]"
              >
                {contentReviewBusy ? (
                  'Checking…'
                ) : (
                  <>
                    <ShieldCheck className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                    Check content
                  </>
                )}
              </Button>
            ) : null}
            {isPublished && !hasSheetVariants ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => void handleApprove()}
                disabled={footerBusy}
                title="No generated variants on this row yet — save a draft copy first (e.g. after GitHub draft generation)."
                className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none lg:w-auto lg:min-w-[9rem]"
              >
                {submitting ? 'Saving…' : 'Save as draft'}
              </Button>
            ) : isPublished && hasSheetVariants ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleApprove()}
                  disabled={footerBusy}
                  title="Writes your edits to a new drafted row. The current published post stays until you publish that copy."
                  className="min-h-[44px] w-full border-primary/25 shadow-sm sm:w-auto sm:min-w-[8.5rem]"
                >
                  {submitting ? 'Saving…' : 'Save edits'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void handlePublishNow()}
                  disabled={footerBusy || showScheduledBanner}
                  title={
                    showScheduledBanner
                      ? 'Already scheduled for this time — cancel above or change the schedule.'
                      : `Save a draft copy with your edits, approve it, and send to ${channelLabel} (same as queue Publish).`
                  }
                  className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none sm:w-auto sm:min-w-[9rem]"
                >
                  {publishSubmitting
                    ? 'Publishing…'
                    : `Publish to ${channelLabel}`}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSaveDraft()}
                  disabled={footerBusy}
                  title="Save your edits as a draft without approving."
                  className="min-h-[44px] w-full border-primary/25 shadow-sm sm:w-auto sm:min-w-[8rem]"
                >
                  {savingDraft ? 'Saving…' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleApprove()}
                  disabled={footerBusy}
                  title="Mark as approved in the sheet only. Publish later from the queue."
                  className="min-h-[44px] w-full border-primary/25 shadow-sm sm:w-auto sm:min-w-[8rem]"
                >
                  {submitting ? 'Saving…' : 'Approve'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void handlePublishNow()}
                  disabled={footerBusy || showScheduledBanner}
                  title={
                    showScheduledBanner
                      ? 'Already scheduled for this time — cancel above or change the schedule.'
                      : `Approve and send immediately to ${channelLabel} (same as queue Publish).`
                  }
                  className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none sm:w-auto sm:min-w-[9rem]"
                >
                  {publishSubmitting ? 'Publishing…' : `Publish to ${channelLabel}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </footer>
      {contentReviewOpen && contentReviewResult ? (
        <ContentReviewReport
          report={contentReviewResult}
          onClose={() => {
            setContentReviewOpen(false);
            setContentReviewResult(null);
          }}
        />
      ) : null}
    </div>
  );
}
