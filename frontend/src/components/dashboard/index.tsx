import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { type AppSession, type BackendApi, type SocialIntegration, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type SheetRow } from '../../services/sheets';
import { type BotConfig, type BotConfigUpdate, type LlmRef, type GoogleModelOption, type EnrichmentSkillConfig, type EnrichmentSkillId } from '../../services/configService';
import type { LlmProviderId } from '@repo/llm-core';
import { getNormalizedRowStatus, queueStatusToBadgeVariant, shouldShowDraftedQueueActions } from './utils';
import { FileEdit, Trash2, Send, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type QueueFilter, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import { useCustomWorkflows } from '../../features/workflows/useCustomWorkflows';
import {
  DashboardSettingsDrawer,
  type DashboardSettingsDrawerHandle,
} from './components/DashboardSettingsDrawer';
import { SettingsConnectionsCard } from './components/SettingsConnectionsCard';
import { DashboardQueue } from './tabs/DashboardQueue';
import { DashboardDelivery } from './tabs/DashboardDelivery';
import { TopicsRightRail } from './components/TopicsRightRail';
import { TopicDetailPanel } from './components/TopicDetailPanel';
import { TopicPostPreviewCard } from './components/TopicPostPreviewCard';
import { getChannelOption } from '../../integrations/channels';
import { useRegisterWorkspaceChrome } from '../workspace/WorkspaceChromeContext';
import { normalizeTelegramChatId, parseTelegramRecipientsInput } from '../../integrations/telegram';
import { normalizePhoneNumber } from '../../integrations/whatsapp';
import { TopicVariantsPage } from '../../features/topic-navigation/screens/TopicVariantsPage';
import { TopicEditorPage } from '../../features/topic-navigation/screens/TopicEditorPage';
import { GlobalRulesPage } from '../../pages/GlobalRulesPage';
import { EnrichmentFlowPage } from '../../pages/EnrichmentFlowPage';
import { UsagePage } from '../../pages/UsagePage';
import { ConnectionsPage } from '../../pages/connections/ConnectionsPage';
import { effectiveChannel, effectiveLlmRef } from '@/lib/topicEffectivePrefs';
import { findRowByTopicRouteId, normalizeTopicRouteParam } from '../../features/topic-navigation/utils/topicRoute';
import {
  WORKSPACE_PATHS,
  WORKSPACE_ROUTE_PATHS,
  normalizeWorkspacePathname,
  topicEditorPathForRow,
} from '../../features/topic-navigation/utils/workspaceRoutes';
import {
  FEATURE_CAMPAIGN,
  FEATURE_CONTENT_REVIEW,
  FEATURE_MULTI_PROVIDER_LLM,
  FEATURE_NEWS_RESEARCH,
} from '../../generated/features';
import { CampaignPage } from '../../features/campaign';
import { FeedPage } from '../../features/feed/FeedPage';
import type { TrendingCapabilities } from '../../features/trending/hooks/useTrending';
import { AddTopicPage } from '../../features/add-topic/AddTopicPage';
import { TopicDetailView } from '../../features/add-topic/TopicDetailView';
import { AutomationsTab } from '../../features/automations';
import { SetupWizard } from '../../features/setup-wizard/SetupWizard';
import AdminPanel from '../../features/saas/AdminPanel';
import { topicNeedsFullTooltip, truncateTopicForUi } from '../../lib/topicDisplay';
import type { TopicRescheduleCommitPayload } from '@/features/content-schedule-calendar';

function AddTopicPageWithEdit({
  idToken,
  api,
  rows,
  capabilities,
  onSaved,
}: {
  idToken: string;
  api: BackendApi;
  rows: SheetRow[];
  capabilities?: TrendingCapabilities;
  onSaved?: () => void;
}) {
  const [searchParams] = useSearchParams();
  const editTopicId = searchParams.get('edit') ?? '';
  const editRow = editTopicId
    ? findRowByTopicRouteId(rows, editTopicId) ?? rows.find((r) => String(r.topicId).trim() === editTopicId.trim())
    : undefined;
  return <AddTopicPage idToken={idToken} api={api} editRow={editRow} capabilities={capabilities} onSaved={onSaved} />;
}

function TopicVariantsOrDetail(p: Parameters<typeof TopicVariantsPage>[0] & { rows: SheetRow[] }) {
  const { topicId } = useParams<{ topicId: string }>();
  const row = topicId ? findRowByTopicRouteId(p.rows, topicId) : undefined;
  const isPending = row && !row.variant1?.trim() && !row.variant2?.trim();
  if (isPending) {
    return (
      <div className="flex h-full min-h-0 flex-1">
        <TopicDetailView row={row} editPath={WORKSPACE_PATHS.addTopic} />
      </div>
    );
  }
  return <TopicVariantsPage {...p} />;
}

function getProviderDisplayLabel(provider: string): string {
  switch (provider) {
    case 'grok': return 'Grok (xAI)';
    case 'openrouter': return 'OpenRouter';
    case 'minimax': return 'Minimax';
    default: return 'Google Gemini';
  }
}

function previewAuthorDisplayName(email: string): string {
  const local = email.split('@')[0]?.trim() ?? '';
  if (!local) {
    return email;
  }

  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Dashboard({
  idToken,
  session,
  api,
  onSaveConfig,
  onAuthExpired,
  llmCatalog,
  integrations,
  onConnect,
  onDisconnect,
  connecting,
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
  llmCatalog: Array<{ id: LlmProviderId; name: string; models: GoogleModelOption[] }> | null;
  integrations: SocialIntegration[];
  onConnect: (provider: 'linkedin' | 'instagram' | 'gmail' | 'whatsapp' | 'youtube') => void;
  onDisconnect: (provider: string) => void;
  connecting: string | null;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathNorm = normalizeWorkspacePathname(location.pathname);
  const topicIdFromPathRaw =
    pathNorm.match(new RegExp(`^${WORKSPACE_PATHS.topics.replace(/\//g, '\\/')}/([^/]+)`))?.[1] ?? null;
  const topicIdFromPath = topicIdFromPathRaw ? normalizeTopicRouteParam(topicIdFromPathRaw) : null;
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('all');
  const [lastDeliverySummary, setLastDeliverySummary] = useState<DeliverySummary | null>(null);
  const [queueScrollTargetId, setQueueScrollTargetId] = useState<string | null>(null);
  const settingsDrawerRef = useRef<DashboardSettingsDrawerHandle>(null);

  const channelsHook = useDashboardChannels({
    idToken,
    api,
    session,
    onAuthExpired,
    onSaveConfig,
    telegramBotTokenInput: '', 
  });

  // Custom workflow CRUD — results are threaded into topicReviewBase so the
  // WorkflowBuilderModal in EditorSidebar can create/update/delete workflows.
  const customWorkflowsHook = useCustomWorkflows({ api, idToken, enabled: true });

  const settingsHook = useDashboardSettings({
    idToken,
    api,
    session,
    onSaveConfig,
    onAuthExpired,
    loadData: async () => {},
    selectedChannel: channelsHook.selectedChannel,
    telegramRecipientsInput: channelsHook.telegramRecipientsInput,
    whatsappRecipientsInput: channelsHook.whatsappRecipientsInput,
  });

  const handleToggleEnrichmentSkill = useCallback(async (id: EnrichmentSkillId, enabled: boolean) => {
    const currentSkills: EnrichmentSkillConfig[] = session.config.enrichmentSkills ?? [];
    const existing = currentSkills.find((s) => s.id === id);
    const updated = existing
      ? currentSkills.map((s) => s.id === id ? { ...s, enabled } : s)
      : [...currentSkills, { id, enabled }];
    await onSaveConfig({ enrichmentSkills: updated });
  }, [session.config.enrichmentSkills, onSaveConfig]);

  const [telegramVerification, setTelegramVerification] = useState<{ kind: 'success' | 'error'; message: string; result?: TelegramChatVerificationResult; } | null>(null);

  const handleVerifyTelegramChat = async () => {
    const chatId = normalizeTelegramChatId(channelsHook.telegramDraftChatId);
    if (!chatId) {
      setTelegramVerification({ kind: 'error', message: 'Enter a valid Telegram target before verifying.' });
      return;
    }
    setTelegramVerification(null);
    try {
      const result = await api.verifyTelegramChat(idToken, chatId, settingsHook.telegramBotTokenInput.trim() || undefined);
      channelsHook.setTelegramDraftChatId(result.chatId);
      if (!channelsHook.telegramDraftLabel.trim()) {
        channelsHook.setTelegramDraftLabel(result.title || (result.username ? `@${result.username}` : 'Verified Telegram chat'));
      }
      setTelegramVerification({
        kind: 'success',
        message: 'Telegram chat verified successfully.',
        result,
      });
    } catch {
      setTelegramVerification({ kind: 'error', message: 'Failed to verify the Telegram chat.' });
    }
  };

  const selectedChannelOption = getChannelOption(channelsHook.selectedChannel);
  const activeRecipientOptions = session.config.telegramRecipients.map(r => ({ label: r.label, value: r.chatId })); 
  const resolvedRecipientId = channelsHook.recipientMode === 'saved'
    ? channelsHook.selectedRecipientId
    : channelsHook.selectedChannel === 'telegram'
      ? normalizeTelegramChatId(channelsHook.manualRecipientId)
      : normalizePhoneNumber(channelsHook.manualRecipientId);
  
  const selectedRecipientLabel = activeRecipientOptions.find((r) => r.value === channelsHook.selectedRecipientId)?.label || '';

  const whatsappConfigured = Boolean(session.config.whatsappPhoneNumberId && session.config.hasWhatsAppAccessToken);
  const instagramConfigured = Boolean(session.config.instagramUserId && session.config.hasInstagramAccessToken);
  const linkedinConfigured = Boolean(session.config.linkedinPersonUrn && session.config.hasLinkedInAccessToken);
  const telegramConfigured = Boolean(session.config.hasTelegramBotToken);
  const gmailConfigured = Boolean(session.config.gmailEmailAddress && session.config.hasGmailAccessToken);

  const selectedChannelCredentialsConfigured =
    channelsHook.selectedChannel === 'linkedin'
      ? linkedinConfigured
      : channelsHook.selectedChannel === 'instagram'
        ? instagramConfigured
        : channelsHook.selectedChannel === 'telegram'
          ? telegramConfigured
          : channelsHook.selectedChannel === 'gmail'
            ? gmailConfigured
            : whatsappConfigured;

  const openPreviewForTopicKey =
    typeof location.state === 'object' &&
    location.state !== null &&
    'openPreviewForTopicKey' in location.state &&
    typeof (location.state as { openPreviewForTopicKey: unknown }).openPreviewForTopicKey === 'string'
      ? (location.state as { openPreviewForTopicKey: string }).openPreviewForTopicKey
      : undefined;

  const queueWorkspaceLlm: LlmRef = useMemo(
    () =>
      settingsHook.generationWorkerLlm ?? {
        provider: 'gemini',
        model: settingsHook.googleModel,
      },
    [settingsHook.generationWorkerLlm, settingsHook.googleModel],
  );

  const reviewBaseLlm: LlmRef = useMemo(
    () =>
      settingsHook.reviewGenerationLlm ?? {
        provider: 'gemini',
        model: settingsHook.googleModel,
      },
    [settingsHook.reviewGenerationLlm, settingsHook.googleModel],
  );

  const [selectedTopicsPanelTopicId, setSelectedTopicsPanelTopicId] = useState<string | null>(null);

  const queueHook = useDashboardQueue({
    idToken,
    api,
    session,
    onAuthExpired,
    workspaceLlm: queueWorkspaceLlm,
    selectedChannel: channelsHook.selectedChannel,
    resolvedRecipientId,
    selectedRecipientLabel,
    telegramConfigured,
    whatsappConfigured,
    instagramConfigured,
    linkedinConfigured,
    gmailConfigured,
    setLastDeliverySummary,
    viewingTopicRouteId: topicIdFromPath,
    onLeaveTopicRoute: () => navigate(WORKSPACE_PATHS.topics),
    onAfterApprove: () => navigate(WORKSPACE_PATHS.topics),
  });

  const queueCounts = queueHook.rows.reduce<Record<QueueFilter, number>>((acc, row) => {
    const status = getNormalizedRowStatus(row.status) as Exclude<QueueFilter, 'all'>;
    acc.all += 1;
    if (status in acc) acc[status] += 1;
    return acc;
  }, { all: 0, pending: 0, drafted: 0, approved: 0, published: 0 });

  const filteredRows = queueHook.rows.filter((row) => statusFilter === 'all' || getNormalizedRowStatus(row.status) === statusFilter);

  /** Consume `location.state.openPreviewForTopicKey` once — `queueHook.rows` changes every poll; re-running navigate() caused max update depth (React #185). */
  const openPreviewHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!openPreviewForTopicKey) {
      openPreviewHandledRef.current = null;
      return;
    }
    if (openPreviewHandledRef.current === openPreviewForTopicKey) {
      return;
    }
    if (queueHook.loading) {
      return;
    }
    openPreviewHandledRef.current = openPreviewForTopicKey;
    const row = findRowByTopicRouteId(queueHook.rows, openPreviewForTopicKey);
    if (row) {
      queueMicrotask(() => setSelectedTopicsPanelTopicId(String(row.topicId).trim()));
    }
    navigate({ pathname: WORKSPACE_PATHS.topics }, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rows updates every poll; ref ensures one consume per openPreview key
  }, [openPreviewForTopicKey, queueHook.loading, navigate]);

  const railSelectedTopicId = useMemo(() => {
    if (!selectedTopicsPanelTopicId) return null;
    const id = String(selectedTopicsPanelTopicId).trim();
    if (queueHook.loading) return id;
    return queueHook.rows.some((r) => String(r.topicId).trim() === id) ? id : null;
  }, [selectedTopicsPanelTopicId, queueHook.rows, queueHook.loading]);

  const drawerRow = useMemo(
    () =>
      railSelectedTopicId
        ? (queueHook.rows.find((r) => String(r.topicId).trim() === railSelectedTopicId) ?? null)
        : null,
    [railSelectedTopicId, queueHook.rows],
  );

  const deliveryTargetSummary = selectedChannelOption.requiresRecipient
    ? (selectedRecipientLabel || resolvedRecipientId || 'Choose a recipient')
    : channelsHook.selectedChannel === 'instagram'
      ? session.config.instagramUsername
        ? `@${session.config.instagramUsername}`
        : instagramConfigured
          ? 'Connected Instagram account'
          : 'Instagram not connected'
      : channelsHook.selectedChannel === 'gmail'
        ? session.config.gmailEmailAddress
          ? session.config.gmailEmailAddress
          : gmailConfigured
            ? 'Connected Gmail account'
            : 'Gmail not connected'
        : linkedinConfigured
          ? 'Connected LinkedIn account'
          : 'LinkedIn not connected';

  const handleScrollTargetHandled = useCallback(() => {
    setQueueScrollTargetId(null);
  }, []);

  const refreshQueue = useCallback(() => {
    if (!session.config.spreadsheetId) return;
    void queueHook.loadData();
  }, [session.config.spreadsheetId, queueHook.loadData]);

  const publishingHealth = useMemo(
    () => ({
      linkedin: linkedinConfigured,
      instagram: instagramConfigured,
      telegram: telegramConfigured,
      whatsapp: whatsappConfigured,
      gmail: gmailConfigured,
    }),
    [linkedinConfigured, instagramConfigured, telegramConfigured, whatsappConfigured, gmailConfigured],
  );

  const topicChromeRow = topicIdFromPath
    ? findRowByTopicRouteId(queueHook.rows, topicIdFromPath)
    : undefined;

  const reviewDeliveryChannel = topicChromeRow
    ? effectiveChannel(topicChromeRow, channelsHook.selectedChannel)
    : channelsHook.selectedChannel;
  const reviewLlm = topicChromeRow ? effectiveLlmRef(topicChromeRow, reviewBaseLlm) : reviewBaseLlm;

  const topicReviewBase = {
    rows: queueHook.rows,
    queueLoading: queueHook.loading,
    deliveryChannel: reviewDeliveryChannel,
    previewAuthorName: previewAuthorDisplayName(session.email),
    globalGenerationRules: session.config.generationRules,
    googleModel: reviewLlm.model,
    generationLlm: FEATURE_MULTI_PROVIDER_LLM ? reviewLlm : undefined,
    onApprove: queueHook.handleApproveVariant,
    onPublishNow: queueHook.publishFromReviewEditor,
    onSaveEmailFields: queueHook.handleSaveEmailFields,
    globalEmailDefaults: {
      emailTo: settingsHook.gmailDefaultTo,
      emailCc: settingsHook.gmailDefaultCc,
      emailBcc: settingsHook.gmailDefaultBcc,
      emailSubject: settingsHook.gmailDefaultSubject,
    },
    onGenerateQuickChange: queueHook.handleGenerateQuickChange,
    onGenerateVariants: queueHook.handleGenerateVariantsPreview,
    onSaveVariants: queueHook.handleSaveDraftVariants,
    onFetchMoreImages: queueHook.handleFetchReviewImages,
    onPromoteRemoteImage: queueHook.handlePromoteReviewImage,
    onUploadImage: queueHook.handleUploadReviewImage,
    onDownloadImage: queueHook.handleDownloadReviewImage,
    isAdmin: session.isAdmin,
    onSaveTopicGenerationRules: queueHook.handleSaveTopicGenerationRules,
    loadPostTemplates: queueHook.loadPostTemplates,
    onSaveGenerationTemplateId: queueHook.handleSaveGenerationTemplateId,
    pendingScheduledPublish: queueHook.pendingScheduledPublish,
    scheduledPublishCancelBusy: queueHook.scheduledPublishCancelBusy,
    onCancelScheduledPublish: () => void queueHook.cancelPendingScheduledPublish(),
    newsResearch: FEATURE_NEWS_RESEARCH ? session.config.newsResearch : undefined,
    newsProviderKeys: FEATURE_NEWS_RESEARCH ? session.config.newsProviderKeys : undefined,
    onSearchNewsResearch: FEATURE_NEWS_RESEARCH ? queueHook.handleSearchNewsResearch : undefined,
    onListNewsResearchHistory: FEATURE_NEWS_RESEARCH ? queueHook.handleListNewsResearchHistory : undefined,
    onGetNewsResearchSnapshot: FEATURE_NEWS_RESEARCH ? queueHook.handleGetNewsResearchSnapshot : undefined,
    onGenerateReferenceImage: queueHook.handleGenerateReferenceImage,
    onGenerateImageFromText: queueHook.handleGenerateImageFromText,
    onUploadContextDocument: queueHook.handleUploadContextDocument,
    imageGenConfig: session.config.imageGen,
    onGetNodeRuns: queueHook.getNodeRunsForRow,
    // Workflow builder — lets EditorSidebar open the modal for create/edit/delete
    customWorkflows: customWorkflowsHook.workflows,
    isLoadingCustomWorkflows: customWorkflowsHook.isLoading,
    onCreateCustomWorkflow: customWorkflowsHook.create,
    onUpdateCustomWorkflow: customWorkflowsHook.update,
    onDeleteCustomWorkflow: customWorkflowsHook.remove,
    ...(FEATURE_CONTENT_REVIEW
      ? {
          onRunContentReview: queueHook.handleRunContentReview,
          onAfterContentReview: () => queueHook.loadData(true),
        }
      : {}),
  };

  const topicChromeRaw = topicChromeRow?.topic?.trim() ?? '';
  const headerOverride = useMemo(() => {
    if (FEATURE_CAMPAIGN && pathNorm === WORKSPACE_PATHS.campaign) {
      return {
        eyebrow: 'Campaign',
        title: 'Bulk Import',
        subtitle: 'Generate with AI, paste JSON, preview and publish.',
        subtitleTone: 'sentence' as const,
        titleTooltip: null as string | null,
      };
    }
    if (!topicIdFromPath) return null;
    if (!topicChromeRaw) {
      return {
        title: queueHook.loading ? 'Loading topic…' : 'Topic',
        subtitle: null as string | null,
        titleTooltip: null as string | null,
      };
    }
    const title = truncateTopicForUi(topicChromeRaw);
    return {
      title,
      subtitle: null,
      titleTooltip: topicNeedsFullTooltip(topicChromeRaw) ? topicChromeRaw : null,
    };
  }, [pathNorm, topicIdFromPath, topicChromeRaw, queueHook.loading]);

  const isTopicsMain = pathNorm === WORKSPACE_PATHS.topics;

  useRegisterWorkspaceChrome({
    onRefreshQueue: session.config.spreadsheetId ? refreshQueue : null,
    queueLoading: queueHook.loading,
    health: publishingHealth,
    headerOverride,
    clearTopicReviewHeader: !topicIdFromPath,
  });

  const parsedTelegramRecipientsForSettings = useMemo(() => {
    try {
      return parseTelegramRecipientsInput(channelsHook.telegramRecipientsInput);
    } catch {
      return [];
    }
  }, [channelsHook.telegramRecipientsInput]);

  const savedScrollY = useRef(0);

  useEffect(() => {
    if (!isTopicsMain) return;
    const handleScroll = () => {
      savedScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isTopicsMain]);

  useEffect(() => {
    if (isTopicsMain) {
      window.scrollTo(0, savedScrollY.current);
    } else {
      window.scrollTo(0, 0);
    }
  }, [isTopicsMain]);

  const handleBulkDelete = useCallback(async (rows: SheetRow[]) => {
    for (const row of rows) {
      try {
        await api.deleteRow(idToken, row);
      } catch {
        // continue with remaining rows
      }
    }
    void queueHook.loadData(true);
  }, [api, idToken, queueHook.loadData]);

  const handleBulkSetChannel = useCallback(async (rows: SheetRow[], channel: string) => {
    for (const row of rows) {
      await queueHook.handleSaveTopicDeliveryPreferences(row, { topicDeliveryChannel: channel });
    }
  }, [queueHook.handleSaveTopicDeliveryPreferences]);

  const handleBulkSetModel = useCallback(async (rows: SheetRow[], model: string) => {
    for (const row of rows) {
      await queueHook.handleSaveTopicDeliveryPreferences(row, { topicGenerationModel: model });
    }
  }, [queueHook.handleSaveTopicDeliveryPreferences]);

  const handleBulkSetSchedule = useCallback(async (rows: SheetRow[], date: string, time: string) => {
    const postTime = time ? `${date} ${time}` : date;
    for (const row of rows) {
      try {
        await api.updatePostSchedule(idToken, row, postTime);
      } catch {
        // continue
      }
    }
    void queueHook.loadData(true);
  }, [api, idToken, queueHook.loadData]);

  const handleUpdatePostSchedule = useCallback(async (row: SheetRow, postTime: string) => {
    try {
      await api.updatePostSchedule(idToken, row, postTime);
    } catch {
      // ignore; queue refresh still runs so UI can reconcile
    }
    void queueHook.loadData(true);
  }, [api, idToken, queueHook.loadData]);

  const handleCalendarRescheduleCommit = useCallback(
    async ({ topicIds, date, time }: TopicRescheduleCommitPayload) => {
      const postTime = time ? `${date} ${time}` : date;
      const d = date.trim();
      const timeNorm = time.trim();
      const nonPublishedIds = topicIds.filter((id) => {
        const row = queueHook.rows.find((r) => String(r.topicId).trim() === String(id).trim());
        return row && getNormalizedRowStatus(row.status) !== 'published';
      });
      if (nonPublishedIds.length) {
        queueHook.applyOptimisticPostSchedule(nonPublishedIds, d, timeNorm);
      }
      for (const id of topicIds) {
        const row = queueHook.rows.find((r) => String(r.topicId).trim() === String(id).trim());
        if (!row) continue;
        try {
          if (getNormalizedRowStatus(row.status) === 'published') {
            await api.createDraftFromPublished(
              idToken,
              row,
              (row.selectedText ?? '').trim(),
              row.selectedImageId ?? '',
              postTime,
              (row.emailTo ?? '').trim(),
              (row.emailCc ?? '').trim(),
              (row.emailBcc ?? '').trim(),
              (row.emailSubject ?? '').trim(),
              row.selectedImageUrlsJson ?? '',
            );
          } else {
            await api.updatePostSchedule(idToken, row, postTime);
          }
        } catch {
          // continue with remaining topics
        }
      }
      void queueHook.loadData(true);
    },
    [api, idToken, queueHook.rows, queueHook.loadData, queueHook.applyOptimisticPostSchedule],
  );

  if (!session.config.spreadsheetId && !session.isAdmin) {
    return (
      <div className="glass-panel mx-auto mt-8 max-w-xl rounded-2xl p-8 text-left shadow-card">
        <h2 className="font-heading text-xl font-semibold text-ink">Workspace setup pending</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          You are signed in as <strong className="text-ink">{session.email}</strong>. An admin still needs to finish setup before you can use the queue:
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          <li>Connect the shared Google Sheet and draft workflow</li>
          <li>Configure publishing for LinkedIn and Instagram</li>
          <li>Configure Telegram and WhatsApp delivery in the Worker</li>
        </ul>
      </div>
    );
  }

  const queueContent = (
    <DashboardQueue
      setStatusFilter={setStatusFilter}
      statusFilter={statusFilter}
      queueCounts={queueCounts}
      filteredRows={filteredRows}
      rows={queueHook.rows}
      getQueueStatusVariant={queueStatusToBadgeVariant}
      onGenerationWorkerDraft={queueHook.draftWithGenerationWorker}
      generationProgress={queueHook.generationProgress}
      actionLoading={queueHook.actionLoading}
      session={session}
      onOpenTopicReview={(row) => navigate(topicEditorPathForRow(row))}
      selectedTopicId={railSelectedTopicId}
      onSelectTopicRow={(row) => setSelectedTopicsPanelTopicId(String(row.topicId).trim())}
      publishRowToSelectedChannel={queueHook.publishRowToSelectedChannel}
      republishRowToSelectedChannel={queueHook.republishRowToSelectedChannel}
      handleDeleteTopic={queueHook.handleDeleteTopic}
      deletingRowIndex={queueHook.deletingRowIndex}
      scrollTargetId={queueScrollTargetId}
      onScrollTargetHandled={handleScrollTargetHandled}
      pendingScheduledPublish={queueHook.pendingScheduledPublish}
      selectedChannel={channelsHook.selectedChannel}
      availableModels={settingsHook.availableModels}
      onBulkDelete={handleBulkDelete}
      onBulkSetChannel={handleBulkSetChannel}
      onBulkSetModel={handleBulkSetModel}
      onBulkSetSchedule={handleBulkSetSchedule}
      onUpdatePostSchedule={handleUpdatePostSchedule}
      onCalendarRescheduleCommit={handleCalendarRescheduleCommit}
      contentPatterns={queueHook.postTemplates}
      disableCalendarInternalDrawer={true}
      loading={queueHook.loading}
      idToken={idToken}
      api={api}
    />
  );

  const topicsRailForPanel = (
    <TopicsRightRail
      workspaceChannel={channelsHook.selectedChannel}
      workspaceLlm={queueWorkspaceLlm}
      selectedTopicId={railSelectedTopicId}
      rows={queueHook.rows}
      availableModels={settingsHook.availableModels}
      modelPickerLocked={settingsHook.modelPickerLocked}
      providerLabel={getProviderDisplayLabel(settingsHook.llmPrimaryProvider)}
      previewAuthorName={previewAuthorDisplayName(session.email)}
      onSaveTopicDeliveryPreferences={queueHook.handleSaveTopicDeliveryPreferences}
      onOpenEditor={(row) => navigate(topicEditorPathForRow(row))}
      idToken={idToken}
      api={api}
      hidePreview={true}
      settingsOnly={true}
    />
  );

  const deliveryContent = (
    <DashboardDelivery
      selectedChannel={channelsHook.selectedChannel}
      setSelectedChannel={channelsHook.setSelectedChannel}
      deliveryTargetSummary={deliveryTargetSummary}
      selectedChannelOption={selectedChannelOption}
      recipientMode={channelsHook.recipientMode}
      setRecipientMode={channelsHook.setRecipientMode}
      selectedRecipientId={channelsHook.selectedRecipientId}
      setSelectedRecipientId={channelsHook.setSelectedRecipientId}
      activeRecipientOptions={activeRecipientOptions}
      manualRecipientId={channelsHook.manualRecipientId}
      setManualRecipientId={channelsHook.setManualRecipientId}
      lastDeliverySummary={lastDeliverySummary}
      pendingScheduledPublish={queueHook.pendingScheduledPublish}
      scheduledPublishCancelBusy={queueHook.scheduledPublishCancelBusy}
      onCancelScheduledPublish={() => void queueHook.cancelPendingScheduledPublish()}
      embedded
      channelCredentialsConfigured={selectedChannelCredentialsConfigured}
      isAdmin={session.isAdmin}
      onOpenSettings={() => navigate(WORKSPACE_PATHS.settings)}
      compact
    />
  );

  const settingsContent = (
    <DashboardSettingsDrawer
      ref={settingsDrawerRef}
      session={session}
      backendApi={api}
      idToken={idToken}
      sheetIdInput={settingsHook.sheetIdInput}
      setSheetIdInput={settingsHook.setSheetIdInput}
      selectedChannel={channelsHook.selectedChannel}
      telegramBotTokenInput={settingsHook.telegramBotTokenInput}
      setTelegramBotTokenInput={settingsHook.setTelegramBotTokenInput}
      telegramDraftLabel={channelsHook.telegramDraftLabel}
      setTelegramDraftLabel={channelsHook.setTelegramDraftLabel}
      telegramDraftChatId={channelsHook.telegramDraftChatId}
      setTelegramDraftChatId={channelsHook.setTelegramDraftChatId}
      verifyingTelegramChat={channelsHook.verifyingTelegramChat}
      handleVerifyTelegramChat={handleVerifyTelegramChat}
      handleAddTelegramRecipient={channelsHook.handleAddTelegramRecipient}
      telegramVerification={telegramVerification}
      setTelegramVerification={setTelegramVerification}
      recipientMode={channelsHook.recipientMode}
      handleUseManualTelegramChat={channelsHook.handleUseManualTelegramChat}
      parsedTelegramRecipients={parsedTelegramRecipientsForSettings}
      handleRemoveTelegramRecipient={channelsHook.handleRemoveTelegramRecipient}
      telegramRecipientsInput={channelsHook.telegramRecipientsInput}
      setTelegramRecipientsInput={channelsHook.setTelegramRecipientsInput}
      channelActionBusy={channelsHook.connectingChannel !== null || channelsHook.disconnectingChannel !== null}
      handleInstagramConnection={channelsHook.handleInstagramConnection}
      connectingChannel={channelsHook.connectingChannel}
      handleDisconnectChannel={channelsHook.handleDisconnectChannel}
      disconnectingChannel={channelsHook.disconnectingChannel}
      handleLinkedInConnection={channelsHook.handleLinkedInConnection}
      handleWhatsAppConnection={channelsHook.handleWhatsAppConnection}
      handleGmailConnection={channelsHook.handleGmailConnection}
      gmailDefaultTo={settingsHook.gmailDefaultTo}
      setGmailDefaultTo={settingsHook.setGmailDefaultTo}
      gmailDefaultCc={settingsHook.gmailDefaultCc}
      setGmailDefaultCc={settingsHook.setGmailDefaultCc}
      gmailDefaultBcc={settingsHook.gmailDefaultBcc}
      setGmailDefaultBcc={settingsHook.setGmailDefaultBcc}
      gmailDefaultSubject={settingsHook.gmailDefaultSubject}
      setGmailDefaultSubject={settingsHook.setGmailDefaultSubject}
      pendingWhatsAppOptions={channelsHook.pendingWhatsAppOptions}
      selectedWhatsAppPhoneId={channelsHook.selectedWhatsAppPhoneId}
      setSelectedWhatsAppPhoneId={channelsHook.setSelectedWhatsAppPhoneId}
      completeWhatsAppPhoneSelection={channelsHook.completeWhatsAppPhoneSelection}
      whatsappRecipientsInput={channelsHook.whatsappRecipientsInput}
      setWhatsappRecipientsInput={channelsHook.setWhatsappRecipientsInput}
      saveSettings={settingsHook.saveSettings}
      savingConfig={settingsHook.savingConfig}
      hasUnsavedSettingsChanges={settingsHook.hasUnsavedSettingsChanges}
      adminModelCatalog={settingsHook.adminModelCatalog}
      allowedGoogleModels={settingsHook.allowedGoogleModels}
      toggleAllowedGoogleModel={settingsHook.toggleAllowedGoogleModel}
      newsResearch={FEATURE_NEWS_RESEARCH ? settingsHook.newsResearch : undefined}
      setNewsResearch={FEATURE_NEWS_RESEARCH ? settingsHook.setNewsResearch : undefined}
      newsProviderKeys={FEATURE_NEWS_RESEARCH ? session.config.newsProviderKeys : undefined}
      contentReview={FEATURE_CONTENT_REVIEW ? settingsHook.contentReview : undefined}
      setContentReview={FEATURE_CONTENT_REVIEW ? settingsHook.setContentReview : undefined}
      imageGenProvider={settingsHook.imageGenProvider}
      setImageGenProvider={settingsHook.setImageGenProvider}
      imageGenModel={settingsHook.imageGenModel}
      setImageGenModel={settingsHook.setImageGenModel}
      newsResearchEnabledForContentReview={
        FEATURE_NEWS_RESEARCH && FEATURE_CONTENT_REVIEW && settingsHook.newsResearch.enabled
      }
      {...(FEATURE_MULTI_PROVIDER_LLM
        ? {
            llmPrimaryProvider: settingsHook.llmPrimaryProvider,
            setLlmPrimaryProvider: settingsHook.setLlmPrimaryProvider,
            llmModelId: settingsHook.googleModel,
            setLlmModelId: settingsHook.setGoogleModel,
            llmFallback: settingsHook.llmFallback,
            setLlmFallback: settingsHook.setLlmFallback,
            grokAdminCatalog: settingsHook.grokAdminCatalog,
            openrouterAdminCatalog: settingsHook.openrouterAdminCatalog,
            allowedOpenrouterModels: settingsHook.allowedOpenrouterModels,
            toggleAllowedOpenrouterModel: settingsHook.toggleAllowedOpenrouterModel,
            refreshOpenrouterModels: settingsHook.refreshOpenrouterModels,
            minimaxAdminCatalog: settingsHook.minimaxAdminCatalog,
            allowedMinimaxModels: settingsHook.allowedMinimaxModels,
            toggleAllowedMinimaxModel: settingsHook.toggleAllowedMinimaxModel,
            allowedGrokModels: settingsHook.allowedGrokModels,
            toggleAllowedGrokModel: settingsHook.toggleAllowedGrokModel,
            refreshGrokModels: settingsHook.refreshGrokModels,
          }
        : {})}
      llmCatalog={llmCatalog}
      enrichmentSkills={session.config.enrichmentSkills}
      onToggleEnrichmentSkill={handleToggleEnrichmentSkill}
      publishingHealth={publishingHealth}
    />
  );

  const topicsHome = (
    <div className="mx-auto w-full max-w-[min(100%,1820px)] min-w-0 px-2">
      {queueContent}
    </div>
  );

  const settingsHome = (
    <div className="mx-auto flex max-w-[90rem] flex-col gap-4 lg:flex-row lg:items-stretch lg:h-[calc(100vh-9.5rem)]">
      <div className="min-w-0 flex-1 lg:h-full lg:min-h-0 flex">{settingsContent}</div>
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-4 lg:w-72 lg:h-full lg:overflow-y-auto lg:pb-2">
        <div className="glass-panel rounded-2xl border border-white/55 shadow-lift ring-1 ring-white/55 overflow-hidden">
          <div className="px-4 py-3 border-b border-violet-200/40">
            <h2 className="text-xs font-semibold text-ink/80 tracking-wide">Channel Delivery</h2>
            <p className="mt-0.5 text-[11px] text-muted">Select channel and recipient for publishing</p>
          </div>
          <div className="p-3">{deliveryContent}</div>
        </div>
        <SettingsConnectionsCard
          integrations={integrations}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          connecting={connecting}
          className="rounded-2xl bg-white/80 p-0 shadow-card backdrop-blur-md"
        />
      </div>
    </div>
  );

  const isReviewRoute =
    pathNorm.startsWith(`${WORKSPACE_PATHS.topics}/`) && pathNorm !== WORKSPACE_PATHS.topics;

  return (
    <div
      className={`flex w-full flex-1 flex-col ${isReviewRoute ? 'min-h-0' : ''} ${isReviewRoute ? '' : 'pb-12'}`}
    >
      <Routes>
        <Route
          path={WORKSPACE_ROUTE_PATHS.addTopic}
          element={<AddTopicPageWithEdit idToken={idToken} api={api} rows={queueHook.rows} capabilities={{ youtube: session.config.youtubeAuthAvailable, instagram: session.config.hasInstagramAccessToken, linkedin: session.config.hasLinkedInAccessToken }} onSaved={() => void queueHook.loadData(true)} />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.topicEditor}
          element={<TopicEditorPage {...topicReviewBase} />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.topicVariants}
          element={<TopicVariantsOrDetail {...topicReviewBase} rows={queueHook.rows} />}
        />
        <Route path={WORKSPACE_ROUTE_PATHS.topics} element={topicsHome} />
        <Route path={`${WORKSPACE_PATHS.topics}/`} element={topicsHome} />
        <Route
          path={WORKSPACE_ROUTE_PATHS.settings}
          element={session.isAdmin ? settingsHome : <Navigate to={WORKSPACE_PATHS.topics} replace />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.rules}
          element={
            <GlobalRulesPage
              idToken={idToken}
              session={session}
              api={api}
              onSaveConfig={onSaveConfig}
              onAuthExpired={onAuthExpired}
            />
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.campaign}
          element={
            FEATURE_CAMPAIGN ? (
              <CampaignPage
                idToken={idToken}
                session={session}
                api={api}
                onSaveConfig={onSaveConfig}
                onAuthExpired={onAuthExpired}
              />
            ) : (
              <Navigate to={WORKSPACE_PATHS.topics} replace />
            )
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.usage}
          element={<UsagePage idToken={idToken} session={session} api={api} />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.connections}
          element={
            <ConnectionsPage
              idToken={idToken}
              api={api}
              integrations={integrations}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              connecting={connecting}
            />
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.enrichment}
          element={
            session.isAdmin ? (
              <EnrichmentFlowPage session={session} llmCatalog={llmCatalog} rows={queueHook.rows} idToken={idToken} api={api} />
            ) : (
              <Navigate to={WORKSPACE_PATHS.topics} replace />
            )
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.feed}
          element={
            <FeedPage
              idToken={idToken}
              api={api}
              newsProviderKeys={FEATURE_NEWS_RESEARCH ? session.config.newsProviderKeys : undefined}
              capabilities={{
                youtube: session.config.youtubeAuthAvailable,
                instagram: session.config.hasInstagramAccessToken,
                linkedin: session.config.hasLinkedInAccessToken,
              }}
              rows={queueHook.rows}
            />
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.trending}
          element={<Navigate to={WORKSPACE_PATHS.feed} replace />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.automations}
          element={
            session.isAdmin ? (
              <AutomationsTab idToken={idToken} isAdmin={session.isAdmin} />
            ) : (
              <Navigate to={WORKSPACE_PATHS.topics} replace />
            )
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.setup}
          element={
            session.isAdmin ? (
              <SetupWizard embedded />
            ) : (
              <Navigate to={WORKSPACE_PATHS.topics} replace />
            )
          }
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.admin}
          element={
            session.isAdmin ? (
              <AdminPanel idToken={idToken} />
            ) : (
              <Navigate to={WORKSPACE_PATHS.topics} replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={WORKSPACE_PATHS.topics} replace />} />
      </Routes>

      {railSelectedTopicId && (
        <TopicDetailPanel
          row={drawerRow}
          onClose={() => setSelectedTopicsPanelTopicId(null)}
          onSaveSchedule={handleUpdatePostSchedule}
          renderPreview={drawerRow ? (channel) => (
            <TopicPostPreviewCard
              row={drawerRow}
              previewChannel={channel as import('@/integrations/channels').ChannelId}
              previewAuthorName={previewAuthorDisplayName(session.email)}
              compact={false}
              noVariantHeader={true}
              idToken={idToken}
              api={api}
            />
          ) : undefined}
          renderFooterActions={drawerRow ? () => {
            const st = getNormalizedRowStatus(drawerRow.status);
            const hasDraft = shouldShowDraftedQueueActions(drawerRow);
            const canEdit = hasDraft || st === 'approved' || st === 'published';
            const canPublish = hasDraft || st === 'approved';
            const isPublished = st === 'published';
            const close = () => setSelectedTopicsPanelTopicId(null);
            return (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-auto text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => { queueHook.handleDeleteTopic(drawerRow); close(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { navigate(topicEditorPathForRow(drawerRow)); close(); }}
                  >
                    <FileEdit className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                )}
                {isPublished && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { void queueHook.republishRowToSelectedChannel(drawerRow); close(); }}
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden />
                    Republish
                  </Button>
                )}
                {canPublish && !isPublished && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => { void queueHook.publishRowToSelectedChannel(drawerRow); close(); }}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    Publish
                  </Button>
                )}
              </>
            );
          } : undefined}
        >
          {topicsRailForPanel}
        </TopicDetailPanel>
      )}
    </div>
  );
}
