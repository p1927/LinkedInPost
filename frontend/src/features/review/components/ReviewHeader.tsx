import { useState } from 'react';
import { ArrowLeft, LayoutTemplate, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../../../lib/cn';
import { topicNeedsFullTooltip, truncateTopicForUi } from '../../../lib/topicDisplay';
import { useReviewFlow } from '../context/useReviewFlow';
import { FEATURE_CONTENT_FLOW } from '../../../generated/features';
import { TemplateSelector } from '../../content-flow/TemplateSelector';
import { SelectedPatternCard } from '../../content-flow/SelectedPatternCard';
import { PostGenerateSettings } from './PostGenerateSettings';
import type { ContentPattern } from '../../content-flow/types';

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
    postTemplates,
    sheetRow: { generationTemplateId },
    handleSaveGenerationTemplateId,
    handleSaveGenerationLlm,
    deliveryChannel,
  } = useReviewFlow();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Treat postTemplates as ContentPattern[] — they satisfy the shape (id, name, rules, + optional fields).
  const patterns = postTemplates as ContentPattern[];
  const selectedPattern = patterns.find((p) => p.id === (generationTemplateId ?? '')) ?? null;

  const handleSelectPattern = async (patternId: string) => {
    setSelectorOpen(false);
    await handleSaveGenerationTemplateId(patternId);
  };

  const handleClearPattern = async () => {
    await handleSaveGenerationTemplateId('');
  };

  return (
    <>
      {topicTitleInWorkspaceChrome ? (
        <p id="review-workspace-title" ref={topicHeadingRef} tabIndex={-1} className="sr-only">
          {sheetRow.topic}
        </p>
      ) : null}
      {topicTitleInWorkspaceChrome ? null : (
        <header className="shrink-0 border-b border-violet-200/35 px-4 py-2.5 sm:py-3">
          {showPickPhase ? (
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={leaveToTopics}
                  aria-label="Back to topics list"
                  className="h-10 w-10 shrink-0 rounded-lg text-slate-700 transition-all duration-200 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                >
                  <ArrowLeft className="size-5 shrink-0" aria-hidden />
                </Button>
                <div className="text-xs font-semibold text-muted">
                  Step 1 of 2
                </div>
                <div className="min-w-0 flex-1 border-l border-violet-200/35 pl-3 sm:pl-4">
                  {FEATURE_CONTENT_FLOW && selectedPattern ? (
                    <SelectedPatternCard
                      pattern={selectedPattern}
                      onClear={handleClearPattern}
                      className="mb-1.5"
                    />
                  ) : null}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink/60">Choose variant</p>
                  <h2
                    id="review-workspace-title"
                    ref={topicHeadingRef}
                    tabIndex={-1}
                    className={cn(
                      'mt-0.5 min-w-0 font-heading text-lg font-bold leading-snug text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-xl',
                      !topicExpanded && topicIsLong ? 'truncate' : 'break-words',
                    )}
                    title={!topicExpanded && topicNeedsFullTooltip(sheetRow.topic) ? sheetRow.topic.trim() : undefined}
                  >
                    {!topicIsLong || topicExpanded ? sheetRow.topic : truncateTopicForUi(sheetRow.topic)}
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
                {FEATURE_CONTENT_FLOW && patterns.length > 0 ? (
                  <div className="relative">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectorOpen((v) => !v)}
                      aria-label="Choose content pattern"
                      aria-expanded={selectorOpen}
                      className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:w-auto sm:flex-none sm:px-4 gap-1.5"
                    >
                      <LayoutTemplate className="size-3.5 shrink-0" aria-hidden />
                      Pattern
                    </Button>
                    {selectorOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-1 w-80">
                        <TemplateSelector
                          patterns={patterns}
                          selectedPatternId={generationTemplateId}
                          deliveryChannel={deliveryChannel}
                          onSelect={handleSelectPattern}
                          onClose={() => setSelectorOpen(false)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
                <div className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSettingsOpen((v) => !v)}
                    aria-label="Post generation settings"
                    aria-expanded={settingsOpen}
                    className="min-h-10 min-w-0 flex-1 sm:min-h-9 sm:w-auto sm:flex-none sm:px-4 gap-1.5"
                  >
                    <Settings className="size-3.5 shrink-0" aria-hidden />
                    Settings
                  </Button>
                  {settingsOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-1 w-96">
                      <PostGenerateSettings
                        onSettingsChange={(settings) => {
                          void handleSaveGenerationLlm({
                            provider: settings.provider,
                            model: settings.model,
                          });
                        }}
                        className="shadow-lg"
                      />
                    </div>
                  ) : null}
                </div>
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
          ) : (
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={
                    showEditorLayout &&
                    sheetVariants.length > 0 &&
                    (!routed || routed.screen !== 'editor')
                      ? routed
                        ? requestNavigateToVariants
                        : () => setReviewPhase('pick-variant')
                      : leaveToTopics
                  }
                  aria-label="Back"
                  className="h-10 w-10 shrink-0 rounded-lg text-slate-700 transition-all duration-200 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                >
                  <ArrowLeft className="size-5 shrink-0" aria-hidden />
                </Button>
                <div className="min-w-0 flex-1 basis-full border-t border-violet-200/35 pt-2 sm:basis-auto sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  {FEATURE_CONTENT_FLOW && selectedPattern ? (
                    <SelectedPatternCard
                      pattern={selectedPattern}
                      onClear={handleClearPattern}
                      className="mb-1.5"
                    />
                  ) : null}
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
                      'mt-0.5 min-w-0 font-heading text-lg font-bold leading-snug text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:text-xl',
                      !topicExpanded && topicIsLong ? 'truncate' : 'break-words',
                    )}
                    title={!topicExpanded && topicNeedsFullTooltip(sheetRow.topic) ? sheetRow.topic.trim() : undefined}
                  >
                    {!topicIsLong || topicExpanded ? sheetRow.topic : truncateTopicForUi(sheetRow.topic)}
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
            </div>
          )}
        </header>
      )}
    </>
  );
}
