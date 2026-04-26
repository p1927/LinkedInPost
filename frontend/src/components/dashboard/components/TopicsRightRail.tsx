import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CHANNEL_OPTIONS, type ChannelId, getChannelLabel } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import type { GoogleModelOption, LlmRef } from '@/services/configService';
import { FEATURE_MULTI_PROVIDER_LLM } from '@/generated/features';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopicPostPreviewCard } from './TopicPostPreviewCard';
import type { BackendApi } from '@/services/backendApi';
import { effectiveChannel, parseTopicDeliveryChannel } from '@/lib/topicEffectivePrefs';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAlert } from '@/components/useAlert';
import { queueStatusToBadgeVariant, shouldShowDraftedQueueActions } from '@/components/dashboard/utils';
import { topicNeedsFullTooltip, truncateTopicForUi } from '@/lib/topicDisplay';
import { Badge } from '@/components/ui/badge';
import { LlmModelCombobox } from '@/components/llm';
import { TopicDetailView } from '@/features/add-topic/TopicDetailView';
import { WORKSPACE_PATHS } from '@/features/topic-navigation/utils/workspaceRoutes';

const WORKSPACE_DEFAULT_MODEL = '__workspace_default__';
const WORKSPACE_DEFAULT_CHANNEL = '__workspace_default_channel__';

function ResizeHandle() {
  return (
    <PanelResizeHandle className="relative flex w-4 shrink-0 items-center justify-center bg-transparent outline-none group max-lg:hidden">
      <div className="z-10 flex h-10 w-1.5 items-center justify-center rounded-full bg-violet-200/50 transition-colors group-hover:bg-violet-400 group-active:bg-violet-500" />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-violet-200/30 transition-colors group-hover:bg-violet-300" />
    </PanelResizeHandle>
  );
}

function RailSection({
  title,
  infoTooltip,
  children,
  className,
}: {
  title: string;
  infoTooltip?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted/70">{title}</span>
        {infoTooltip ? (
          <button
            type="button"
            className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
            aria-label={infoTooltip}
            title={infoTooltip}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function TopicsRightRail({
  workspaceChannel,
  workspaceLlm,
  selectedTopicId,
  rows,
  availableModels,
  modelPickerLocked,
  providerLabel,
  previewAuthorName,
  onSaveTopicDeliveryPreferences,
  onOpenEditor,
  idToken,
  api,
  hidePreview,
}: {
  workspaceChannel: ChannelId;
  workspaceLlm: LlmRef;
  selectedTopicId: string | null;
  rows: SheetRow[];
  availableModels: GoogleModelOption[];
  modelPickerLocked: boolean;
  providerLabel?: string;
  previewAuthorName?: string;
  onSaveTopicDeliveryPreferences: (
    row: SheetRow,
    prefs: { topicDeliveryChannel?: string; topicGenerationModel?: string },
  ) => Promise<SheetRow>;
  onOpenEditor: (row: SheetRow) => void;
  idToken?: string;
  api?: BackendApi;
  hidePreview?: boolean;
  settingsOnly?: boolean;
}) {
  const { showAlert } = useAlert();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const selectedRow = useMemo(
    () => (selectedTopicId ? rows.find((r) => String(r.topicId).trim() === String(selectedTopicId).trim()) : undefined),
    [rows, selectedTopicId],
  );

  const hasSelection = Boolean(selectedRow);

  const previewCh = selectedRow ? effectiveChannel(selectedRow, workspaceChannel) : workspaceChannel;

  // Plain model-ID value for LlmModelCombobox (workspace-default uses sentinel string).
  const modelIdValue = useMemo(() => {
    if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
    const raw = String(selectedRow.topicGenerationModel || '').trim();
    if (!raw) return WORKSPACE_DEFAULT_MODEL;
    if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
      try {
        const o = JSON.parse(raw) as { provider?: string; model?: string };
        const m = String(o.model || '').trim();
        if (m && o.provider === workspaceLlm.provider) return m;
      } catch {
        /* fall through */
      }
      return WORKSPACE_DEFAULT_MODEL;
    }
    return raw;
  }, [selectedRow, workspaceLlm.provider]);

  const channelSelectValue = useMemo(() => {
    if (!selectedRow) return WORKSPACE_DEFAULT_CHANNEL;
    const o = parseTopicDeliveryChannel(selectedRow.topicDeliveryChannel);
    return o ?? WORKSPACE_DEFAULT_CHANNEL;
  }, [selectedRow]);

  const workspaceDefaultModelCaption = useMemo(() => {
    const modelLabel =
      availableModels.find((m) => m.value === workspaceLlm.model)?.label ??
      (workspaceLlm.model?.trim() || 'workspace model');
    if (FEATURE_MULTI_PROVIDER_LLM && providerLabel?.trim()) {
      return `Default - ${providerLabel.trim()}: ${modelLabel}`;
    }
    return `Default - ${modelLabel}`;
  }, [availableModels, workspaceLlm.model, providerLabel]);

  const workspaceDefaultChannelCaption = useMemo(
    () => `Default - ${getChannelLabel(workspaceChannel)}`,
    [workspaceChannel],
  );

  const aiModelInfoTooltip = useMemo(() => {
    let t = 'Override the workspace model for Quick Change and variants on this topic only.';
    if (FEATURE_MULTI_PROVIDER_LLM && providerLabel) {
      t += ` Workspace provider: ${providerLabel}.`;
    }
    return t;
  }, [providerLabel]);

  const deliveryInfoTooltip =
    'Override the workspace channel for this topic. Recipients for Telegram and WhatsApp remain workspace-wide.';

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);

  const flushSave = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
  }, []);

  useEffect(() => () => flushSave(), [flushSave]);

  const persist = useCallback(
    async (row: SheetRow, prefs: { topicDeliveryChannel?: string; topicGenerationModel?: string }) => {
      setSaving(true);
      try {
        await onSaveTopicDeliveryPreferences(row, prefs);
      } catch {
        void showAlert({ title: 'Notice', description: 'Could not save topic settings. Try again.' });
      } finally {
        setSaving(false);
      }
    },
    [onSaveTopicDeliveryPreferences, showAlert],
  );

  const scheduleModelSave = useCallback(
    (row: SheetRow, nextModelValue: string) => {
      flushSave();
      saveDebounceRef.current = setTimeout(() => {
        saveDebounceRef.current = null;
        const topicGenerationModel = nextModelValue === WORKSPACE_DEFAULT_MODEL ? '' : nextModelValue;
        void persist(row, { topicGenerationModel });
      }, 400);
    },
    [flushSave, persist],
  );

  // Settings-only mode: renders just the settings grid (no card wrapper, header, or topic details).
  // Used by TopicDetailPanel to embed settings as one section among others.
  if (settingsOnly) {
    if (!selectedRow) return null;
    return (
      <>
        <div className={cn('grid gap-3', modelPickerLocked ? 'grid-cols-1' : 'grid-cols-2')}>
          {!modelPickerLocked ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted">AI model</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
                  aria-label={aiModelInfoTooltip}
                  title={aiModelInfoTooltip}
                >
                  <Info className="h-3 w-3" strokeWidth={2} aria-hidden />
                </button>
              </div>
              <LlmModelCombobox
                models={availableModels}
                value={modelIdValue}
                disabled={saving}
                size="sm"
                prependOptions={[{ value: WORKSPACE_DEFAULT_MODEL, label: workspaceDefaultModelCaption }]}
                onChange={(val) => {
                  if (!selectedRow) return;
                  if (val === WORKSPACE_DEFAULT_MODEL) {
                    void persist(selectedRow, { topicGenerationModel: '' });
                    return;
                  }
                  if (FEATURE_MULTI_PROVIDER_LLM) {
                    const payload = JSON.stringify({ provider: workspaceLlm.provider, model: val });
                    scheduleModelSave(selectedRow, payload);
                    return;
                  }
                  scheduleModelSave(selectedRow, val);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted">AI model</span>
              <p className="text-[11px] text-muted">One model workspace.</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted">Channel</span>
              <button
                type="button"
                className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
                aria-label={deliveryInfoTooltip}
                title={deliveryInfoTooltip}
              >
                <Info className="h-3 w-3" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <Select
              value={channelSelectValue}
              disabled={saving}
              onValueChange={(val) => {
                if (!selectedRow) return;
                const topicDeliveryChannel = val === WORKSPACE_DEFAULT_CHANNEL ? '' : (val as ChannelId);
                void persist(selectedRow, { topicDeliveryChannel });
              }}
              itemToStringLabel={(v) => {
                if (v === WORKSPACE_DEFAULT_CHANNEL) return workspaceDefaultChannelCaption;
                return getChannelLabel(v as ChannelId);
              }}
            >
              <SelectTrigger className="h-9 py-2 text-left text-xs font-medium">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WORKSPACE_DEFAULT_CHANNEL}>{workspaceDefaultChannelCaption}</SelectItem>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {saving && <p className="mt-2 text-[10px] text-muted">Saving…</p>}
      </>
    );
  }

  const railInner = (
    <div className="glass-panel rounded-2xl border border-white/55 p-4 shadow-lift ring-1 ring-white/55 sm:p-5">
      {!hasSelection ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100/70 text-primary">
            <Eye className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">No topic selected</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Choose a topic in the list to see preview, model, and delivery settings.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Topic header */}
          {selectedRow && (
            <div className="mb-4 flex items-center gap-2 border-b border-violet-200/40 pb-3">
              <p
                className="min-w-0 flex-1 truncate text-xs font-semibold text-ink/80"
                title={topicNeedsFullTooltip(selectedRow.topic) ? selectedRow.topic.trim() : undefined}
              >
                {truncateTopicForUi(selectedRow.topic)}
              </p>
              <Badge variant={queueStatusToBadgeVariant(selectedRow.status)} size="sm">
                {selectedRow.status || 'Pending'}
              </Badge>
            </div>
          )}

          {/* Channel preview */}
          {!hidePreview && (
            <RailSection title="Preview" className="mb-5">
              {selectedRow ? (
                <TopicPostPreviewCard
                  row={selectedRow}
                  previewChannel={previewCh}
                  previewAuthorName={previewAuthorName}
                  compact
                  onOpenEditor={
                    shouldShowDraftedQueueActions(selectedRow)
                      ? () => onOpenEditor(selectedRow)
                      : undefined
                  }
                  idToken={idToken}
                  api={api}
                />
              ) : null}
            </RailSection>
          )}

          {/* Settings — compact 2-col grid, always visible */}
          {selectedRow ? (
            <div className="mb-5 border-t border-violet-200/40 pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted/70">Settings</p>
              <div className={cn('grid gap-3', modelPickerLocked ? 'grid-cols-1' : 'grid-cols-2')}>
                {/* AI model */}
                {!modelPickerLocked ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted">AI model</span>
                      <button
                        type="button"
                        className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
                        aria-label={aiModelInfoTooltip}
                        title={aiModelInfoTooltip}
                      >
                        <Info className="h-3 w-3" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <LlmModelCombobox
                      models={availableModels}
                      value={modelIdValue}
                      disabled={saving}
                      size="sm"
                      prependOptions={[
                        { value: WORKSPACE_DEFAULT_MODEL, label: workspaceDefaultModelCaption },
                      ]}
                      onChange={(val) => {
                        if (!selectedRow) return;
                        if (val === WORKSPACE_DEFAULT_MODEL) {
                          void persist(selectedRow, { topicGenerationModel: '' });
                          return;
                        }
                        if (FEATURE_MULTI_PROVIDER_LLM) {
                          const payload = JSON.stringify({ provider: workspaceLlm.provider, model: val });
                          scheduleModelSave(selectedRow, payload);
                          return;
                        }
                        scheduleModelSave(selectedRow, val);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-muted">AI model</span>
                    <p className="text-[11px] text-muted">One model workspace.</p>
                  </div>
                )}

                {/* Delivery channel */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted">Channel</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
                      aria-label={deliveryInfoTooltip}
                      title={deliveryInfoTooltip}
                    >
                      <Info className="h-3 w-3" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                  <Select
                    value={channelSelectValue}
                    disabled={saving}
                    onValueChange={(val) => {
                      if (!selectedRow) return;
                      const topicDeliveryChannel = val === WORKSPACE_DEFAULT_CHANNEL ? '' : (val as ChannelId);
                      void persist(selectedRow, { topicDeliveryChannel });
                    }}
                    itemToStringLabel={(v) => {
                      if (v === WORKSPACE_DEFAULT_CHANNEL) return workspaceDefaultChannelCaption;
                      return getChannelLabel(v as ChannelId);
                    }}
                  >
                    <SelectTrigger className="h-9 py-2 text-left text-xs font-medium">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WORKSPACE_DEFAULT_CHANNEL}>{workspaceDefaultChannelCaption}</SelectItem>
                      {CHANNEL_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {saving ? <p className="mt-2 text-[10px] text-muted">Saving…</p> : null}
            </div>
          ) : null}

          {/* Topic details from Notion-like editor */}
          {selectedRow && (
            <RailSection title="Topic Details">
              <TopicDetailView
                row={selectedRow}
                editPath={WORKSPACE_PATHS.addTopic}
                compact
              />
            </RailSection>
          )}
        </>
      )}
    </div>
  );

  if (!isDesktop) {
    return <aside className="min-w-0 w-full">{railInner}</aside>;
  }

  return <aside className="min-w-0 lg:min-h-0 lg:pb-2">{railInner}</aside>;
}

export function TopicsHomePanels({
  queue,
  rail,
}: {
  queue: React.ReactNode;
  rail: React.ReactNode;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (!isDesktop) {
    return (
      <div className="mx-auto flex w-full max-w-[min(100%,1820px)] flex-col gap-5">
        <div className="min-w-0">{queue}</div>
        {rail}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(100%,1820px)] min-w-0">
      <PanelGroup
        orientation="horizontal"
        id="topics-home-main-rail"
        className="min-h-[min(28rem,calc(100vh-8rem))] items-start"
        resizeTargetMinimumSize={{ coarse: 28, fine: 14 }}
      >
        <Panel defaultSize="58%" minSize="38%" className="min-w-0 min-h-0 overflow-hidden pr-1">
          <div className="custom-scrollbar max-h-[calc(100vh-3.5rem)] overflow-y-auto pr-2">{queue}</div>
        </Panel>
        <ResizeHandle />
        <Panel defaultSize="42%" minSize="24%" maxSize="58%" className="min-w-0 min-h-0">
          {rail}
        </Panel>
      </PanelGroup>
    </div>
  );
}
