import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { type AppSession, type BackendApi, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type SheetRow } from '../../services/sheets';
import { type BotConfig, type BotConfigUpdate, type LlmRef } from '../../services/configService';
import { getNormalizedRowStatus, queueStatusToBadgeVariant } from './utils';
import { type QueueFilter, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import {
  DashboardSettingsDrawer,
  type DashboardSettingsDrawerHandle,
} from './components/DashboardSettingsDrawer';
import { SettingsConnectionsCard } from './components/SettingsConnectionsCard';
import { DashboardQueue } from './tabs/DashboardQueue';
import { DashboardDelivery } from './tabs/DashboardDelivery';
import { TopicsHomePanels, TopicsRightRail } from './components/TopicsRightRail';
import { getChannelOption } from '../../integrations/channels';
import { useRegisterWorkspaceChrome } from '../workspace/WorkspaceChromeContext';
import { normalizeTelegramChatId, parseTelegramRecipientsInput } from '../../integrations/telegram';
import { normalizePhoneNumber } from '../../integrations/whatsapp';
import { TopicVariantsPage } from '../../features/topic-navigation/screens/TopicVariantsPage';
import { TopicEditorPage } from '../../features/topic-navigation/screens/TopicEditorPage';
import { GlobalRulesPage } from '../../pages/GlobalRulesPage';
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
import { topicNeedsFullTooltip, truncateTopicForUi } from '../../lib/topicDisplay';
import type { TopicRescheduleCommitPayload } from '@/features/content-schedule-calendar';

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
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
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
  const [highlightRefreshQueue, setHighlightRefreshQueue] = useState(false);
  const refreshGlowTimerRef = useRef<{ start?: ReturnType<typeof setTimeout>; end?: ReturnType<typeof setTimeout> }>({});
  const settingsDrawerRef = useRef<DashboardSettingsDrawerHandle>(null);

  const clearRefreshGlowTimers = useCallback(() => {
    const t = refreshGlowTimerRef.current;
    if (t.start) clearTimeout(t.start);
    if (t.end) clearTimeout(t.end);
    refreshGlowTimerRef.current = {};
  }, []);

  const onDraftWorkflowStarted = useCallback(() => {
    clearRefreshGlowTimers();
    setHighlightRefreshQueue(false);
    refreshGlowTimerRef.current.start = setTimeout(() => {
      setHighlightRefreshQueue(true);
      refreshGlowTimerRef.current.end = setTimeout(() => setHighlightRefreshQueue(false), 10000);
    }, 2800);
  }, [clearRefreshGlowTimers]);

  useEffect(() => () => clearRefreshGlowTimers(), [clearRefreshGlowTimers]);

  const channelsHook = useDashboardChannels({
    idToken,
    api,
    session,
    onAuthExpired,
    onSaveConfig,
    telegramBotTokenInput: '', 
  });

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

  const workspaceLlm: LlmRef = useMemo(
    () =>
      settingsHook.generationLlm ?? {
        provider: 'gemini',
        model: settingsHook.googleModel,
      },
    [settingsHook.generationLlm, settingsHook.googleModel],
  );

  const [selectedTopicsPanelTopicId, setSelectedTopicsPanelTopicId] = useState<string | null>(null);

  const queueHook = useDashboardQueue({
    idToken,
    api,
    session,
    onAuthExpired,
    workspaceLlm,
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
    onDraftWorkflowStarted,
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
    setHighlightRefreshQueue(false);
    clearRefreshGlowTimers();
    void queueHook.loadData();
  }, [session.config.spreadsheetId, queueHook.loadData, clearRefreshGlowTimers]);

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
  const reviewLlm = topicChromeRow ? effectiveLlmRef(topicChromeRow, workspaceLlm) : workspaceLlm;

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

  const addTopicForm = useMemo(
    () =>
      isTopicsMain && !topicIdFromPath
        ? {
            newTopic: queueHook.newTopic,
            setNewTopic: queueHook.setNewTopic,
            handleAddTopic: queueHook.handleAddTopic,
            addingTopic: queueHook.addingTopic,
            loading: queueHook.loading,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTopicsMain, topicIdFromPath, queueHook.newTopic, queueHook.addingTopic, queueHook.loading],
  );

  useRegisterWorkspaceChrome({
    onRefreshQueue: session.config.spreadsheetId ? refreshQueue : null,
    queueLoading: queueHook.loading,
    highlightRefreshQueue,
    health: publishingHealth,
    headerOverride,
    clearTopicReviewHeader: !topicIdFromPath,
    addTopicForm,
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
    [api, idToken, queueHook.rows, queueHook.loadData],
  );

  const queueContent = (
    <DashboardQueue
      setStatusFilter={setStatusFilter}
      statusFilter={statusFilter}
      queueCounts={queueCounts}
      filteredRows={filteredRows}
      rows={queueHook.rows}
      getQueueStatusVariant={queueStatusToBadgeVariant}
      triggerRowGithubAction={queueHook.triggerRowGithubAction}
      onGenerationWorkerDraft={queueHook.draftWithGenerationWorker}
      actionLoading={queueHook.actionLoading}
      draftDispatchPendingTopicIds={queueHook.draftDispatchPendingTopicIds}
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
    />
  );

  const topicsRail = (
    <TopicsRightRail
      workspaceChannel={channelsHook.selectedChannel}
      workspaceLlm={workspaceLlm}
      selectedTopicId={railSelectedTopicId}
      rows={queueHook.rows}
      availableModels={settingsHook.availableModels}
      modelPickerLocked={settingsHook.modelPickerLocked}
      providerLabel={settingsHook.llmPrimaryProvider === 'grok' ? 'Grok (xAI)' : 'Google Gemini'}
      previewAuthorName={previewAuthorDisplayName(session.email)}
      onSaveTopicDeliveryPreferences={queueHook.handleSaveTopicDeliveryPreferences}
      onOpenEditor={(row) => navigate(topicEditorPathForRow(row))}
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
      sheetIdInput={settingsHook.sheetIdInput}
      setSheetIdInput={settingsHook.setSheetIdInput}
      selectedChannel={channelsHook.selectedChannel}
      githubRepo={settingsHook.githubRepo}
      setGithubRepo={settingsHook.setGithubRepo}
      githubTokenInput={settingsHook.githubTokenInput}
      setGithubTokenInput={settingsHook.setGithubTokenInput}
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
            allowedGrokModels: settingsHook.allowedGrokModels,
            toggleAllowedGrokModel: settingsHook.toggleAllowedGrokModel,
            refreshGrokModels: settingsHook.refreshGrokModels,
          }
        : {})}
    />
  );

  const topicsHome = <TopicsHomePanels queue={queueContent} rail={topicsRail} />;

  const settingsHome = (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
      <div className="glass-panel rounded-2xl p-5 shadow-card sm:p-6">{settingsContent}</div>
      <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4 lg:self-start">
        <div className="glass-panel rounded-2xl border border-white/55 p-3 shadow-lift ring-1 ring-white/55">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">Channel delivery</h2>
          <div className="mt-2">{deliveryContent}</div>
        </div>
        <SettingsConnectionsCard
          health={publishingHealth}
          onNavigateToSection={(sectionId) => settingsDrawerRef.current?.scrollToSection(sectionId)}
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
          path={WORKSPACE_ROUTE_PATHS.topicEditor}
          element={<TopicEditorPage {...topicReviewBase} />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.topicVariants}
          element={<TopicVariantsPage {...topicReviewBase} />}
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
        <Route path="*" element={<Navigate to={WORKSPACE_PATHS.topics} replace />} />
      </Routes>

    </div>
  );
}
