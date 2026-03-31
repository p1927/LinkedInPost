import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { CHANNEL_OPTIONS, type ChannelId, getChannelLabel } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import type { GoogleModelOption, LlmRef } from '@/services/configService';
import { FEATURE_MULTI_PROVIDER_LLM } from '@/generated/features';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopicPostPreviewCard } from './TopicPostPreviewCard';
import { effectiveChannel, parseTopicDeliveryChannel } from '@/lib/topicEffectivePrefs';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAlert } from '@/components/AlertProvider';
import { getNormalizedRowStatus } from '@/components/dashboard/utils';

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

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  disabledHint,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: (open: boolean) => void;
  disabledHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-violet-200/40 py-3 last:border-b-0">
      <button
        type="button"
        className="flex w-full cursor-pointer list-none items-center justify-between gap-2 text-left"
        onClick={() => onToggle(!expanded)}
        aria-expanded={expanded}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {disabledHint ? (
        <p className="mt-2 text-xs text-muted">{disabledHint}</p>
      ) : expanded ? (
        <div className="mt-3">{children}</div>
      ) : null}
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
}) {
  const { showAlert } = useAlert();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const selectedRow = useMemo(
    () => (selectedTopicId ? rows.find((r) => String(r.topicId).trim() === String(selectedTopicId).trim()) : undefined),
    [rows, selectedTopicId],
  );

  const hasSelection = Boolean(selectedRow);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  useEffect(() => {
    if (hasSelection) {
      setPreviewOpen(true);
      setModelOpen(true);
      setDeliveryOpen(true);
    } else {
      setPreviewOpen(false);
      setModelOpen(false);
      setDeliveryOpen(false);
    }
  }, [hasSelection, selectedTopicId]);

  const previewCh = selectedRow ? effectiveChannel(selectedRow, workspaceChannel) : workspaceChannel;

  const modelSelectValue = useMemo(() => {
    if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
    const raw = String(selectedRow.topicGenerationModel || '').trim();
    if (!raw) return WORKSPACE_DEFAULT_MODEL;
    if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
      try {
        const o = JSON.parse(raw) as { provider?: string; model?: string };
        const prov = o.provider === 'grok' || o.provider === 'gemini' ? o.provider : workspaceLlm.provider;
        const m = String(o.model || '').trim();
        if (m) return JSON.stringify({ provider: prov, model: m });
      } catch {
        /* fall through */
      }
      return raw;
    }
    return raw;
  }, [selectedRow, workspaceLlm.provider]);

  const channelSelectValue = useMemo(() => {
    if (!selectedRow) return WORKSPACE_DEFAULT_CHANNEL;
    const o = parseTopicDeliveryChannel(selectedRow.topicDeliveryChannel);
    return o ?? WORKSPACE_DEFAULT_CHANNEL;
  }, [selectedRow]);

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

  const railInner = (
    <div className="glass-panel rounded-2xl border border-white/55 p-4 shadow-lift ring-1 ring-white/55 sm:p-5">
      <CollapsibleSection
        title="Preview"
        expanded={previewOpen}
        onToggle={setPreviewOpen}
        disabledHint={!hasSelection ? 'Select a topic from the list to see a channel preview and publishing details.' : undefined}
      >
        {selectedRow ? (
          <TopicPostPreviewCard
            row={selectedRow}
            previewChannel={previewCh}
            previewAuthorName={previewAuthorName}
            compact
            onOpenEditor={
              getNormalizedRowStatus(selectedRow.status) === 'drafted'
                ? () => onOpenEditor(selectedRow)
                : undefined
            }
          />
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        title="AI model"
        expanded={modelOpen}
        onToggle={setModelOpen}
        disabledHint={!hasSelection ? 'Select a topic to set a model override for generation on that topic (or use the workspace default).' : undefined}
      >
        {selectedRow ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-muted">
              Override the workspace model for Quick Change and variants on this topic only.
              {FEATURE_MULTI_PROVIDER_LLM && providerLabel ? (
                <span className="mt-0.5 block font-medium text-ink/80">Workspace provider: {providerLabel}</span>
              ) : null}
            </p>
            {modelPickerLocked ? (
              <p className="text-[11px] text-muted">This workspace allows only one model.</p>
            ) : (
              <Select
                value={modelSelectValue}
                disabled={saving}
                onValueChange={(val) => {
                  if (!selectedRow) return;
                  if (FEATURE_MULTI_PROVIDER_LLM) {
                    if (val === WORKSPACE_DEFAULT_MODEL) {
                      void persist(selectedRow, { topicGenerationModel: '' });
                      return;
                    }
                    const payload = JSON.stringify({
                      provider: workspaceLlm.provider,
                      model: val,
                    });
                    scheduleModelSave(selectedRow, payload);
                    return;
                  }
                  if (val === WORKSPACE_DEFAULT_MODEL) {
                    void persist(selectedRow, { topicGenerationModel: '' });
                    return;
                  }
                  scheduleModelSave(selectedRow, val);
                }}
                itemToStringLabel={(v) => {
                  if (v === WORKSPACE_DEFAULT_MODEL) return 'Workspace default';
                  if (FEATURE_MULTI_PROVIDER_LLM && String(v).startsWith('{')) {
                    try {
                      const o = JSON.parse(String(v)) as { model?: string };
                      const m = String(o.model || '').trim();
                      return availableModels.find((x) => x.value === m)?.label ?? m;
                    } catch {
                      return String(v);
                    }
                  }
                  return availableModels.find((m) => m.value === v)?.label ?? String(v ?? '');
                }}
              >
                <SelectTrigger className="h-auto min-h-10 py-2.5 text-left font-medium">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent className="max-w-[min(100vw-1.5rem,28rem)]">
                  <SelectItem value={WORKSPACE_DEFAULT_MODEL}>Workspace default</SelectItem>
                  {availableModels.map((m) => (
                    <SelectItem
                      key={m.value}
                      value={
                        FEATURE_MULTI_PROVIDER_LLM
                          ? JSON.stringify({ provider: workspaceLlm.provider, model: m.value })
                          : m.value
                      }
                      className="items-start py-2.5"
                    >
                      <span className="whitespace-normal leading-snug">{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {saving ? <p className="text-[10px] text-muted">Saving…</p> : null}
          </div>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        title="Delivery channel"
        expanded={deliveryOpen}
        onToggle={setDeliveryOpen}
        disabledHint={
          !hasSelection
            ? 'Select a topic to choose where that topic will publish. Telegram and WhatsApp recipients still come from workspace settings.'
            : undefined
        }
      >
        {selectedRow ? (
          <div className="space-y-2">
            <p className="text-[11px] leading-relaxed text-muted">
              Override the workspace channel for this topic. Recipients for Telegram/WhatsApp remain workspace-wide.
            </p>
            <Select
              value={channelSelectValue}
              disabled={saving}
              onValueChange={(val) => {
                if (!selectedRow) return;
                const topicDeliveryChannel = val === WORKSPACE_DEFAULT_CHANNEL ? '' : (val as ChannelId);
                void persist(selectedRow, { topicDeliveryChannel });
              }}
              itemToStringLabel={(v) => {
                if (v === WORKSPACE_DEFAULT_CHANNEL) return 'Workspace default';
                return getChannelLabel(v as ChannelId);
              }}
            >
              <SelectTrigger className="h-auto min-h-10 py-2.5 text-left font-medium">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={WORKSPACE_DEFAULT_CHANNEL}>Workspace default</SelectItem>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CollapsibleSection>
    </div>
  );

  if (!isDesktop) {
    return <aside className="min-w-0 w-full">{railInner}</aside>;
  }

  return (
    <aside className="min-w-0 lg:sticky lg:top-14 lg:z-10 lg:max-h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
      {railInner}
    </aside>
  );
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
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
        <div className="min-w-0">{queue}</div>
        {rail}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] min-w-0">
      <PanelGroup
        orientation="horizontal"
        autoSaveId="topics-home-main-rail"
        className="min-h-[min(28rem,calc(100vh-8rem))]"
        resizeTargetMinimumSize={{ coarse: 28, fine: 14 }}
      >
        <Panel defaultSize={72} minSize={45} className="min-w-0 min-h-0 overflow-hidden pr-1">
          <div className="custom-scrollbar max-h-[calc(100vh-3.5rem)] overflow-y-auto pr-2">{queue}</div>
        </Panel>
        <ResizeHandle />
        <Panel defaultSize={28} minSize={18} maxSize={42} className="min-w-0 min-h-0">
          {rail}
        </Panel>
      </PanelGroup>
    </div>
  );
}
