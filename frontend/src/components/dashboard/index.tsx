import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { type AppSession, type BackendApi, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '../../services/configService';
import { getNormalizedRowStatus, queueStatusToBadgeVariant, canPreviewPublishedContent } from './utils';
import { type QueueFilter, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import {
  DashboardSettingsDrawer,
  type DashboardSettingsDrawerHandle,
} from './components/DashboardSettingsDrawer';
import { SettingsConnectionsCard } from './components/SettingsConnectionsCard';
import { DashboardToolbar } from './components/DashboardToolbar';
import { DashboardQueue } from './tabs/DashboardQueue';
import { DashboardDelivery } from './tabs/DashboardDelivery';
import { getChannelOption } from '../../integrations/channels';
import { useRegisterWorkspaceChrome } from '../workspace/WorkspaceChromeContext';
import { normalizeTelegramChatId, parseTelegramRecipientsInput } from '../../integrations/telegram';
import { normalizePhoneNumber } from '../../integrations/whatsapp';
import { TopicVariantsPage } from '../../features/topic-navigation/screens/TopicVariantsPage';
import { TopicEditorPage } from '../../features/topic-navigation/screens/TopicEditorPage';
import { GlobalRulesPage } from '../../pages/GlobalRulesPage';
import { ApprovedPostPreview } from '../ApprovedPostPreview';
import { findRowByTopicRouteId, normalizeTopicRouteParam } from '../../features/topic-navigation/utils/topicRoute';
import {
  WORKSPACE_PATHS,
  WORKSPACE_ROUTE_PATHS,
  topicVariantsPathForRow,
} from '../../features/topic-navigation/utils/workspaceRoutes';

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
  const topicIdFromPathRaw =
    location.pathname.match(new RegExp(`^${WORKSPACE_PATHS.topics.replace(/\//g, '\\/')}/([^/]+)`))?.[1] ??
    null;
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

  const queueHook = useDashboardQueue({
    idToken,
    api,
    session,
    onAuthExpired,
    googleModel: settingsHook.googleModel,
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

  useEffect(() => {
    if (!openPreviewForTopicKey) return;
    if (queueHook.loading) return;
    const row = findRowByTopicRouteId(queueHook.rows, openPreviewForTopicKey);
    if (row) {
      queueHook.setSelectedApprovedRowPreview(row);
    }
    navigate(WORKSPACE_PATHS.topics, { replace: true, state: null });
  }, [openPreviewForTopicKey, queueHook.loading, queueHook.rows, navigate, queueHook.setSelectedApprovedRowPreview]);

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

  const topicReviewBase = {
    rows: queueHook.rows,
    queueLoading: queueHook.loading,
    deliveryChannel: channelsHook.selectedChannel,
    previewAuthorName: previewAuthorDisplayName(session.email),
    globalGenerationRules: session.config.generationRules,
    googleModel: settingsHook.googleModel,
    onApprove: queueHook.handleApproveVariant,
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
    onUploadImage: queueHook.handleUploadReviewImage,
    onDownloadImage: queueHook.handleDownloadReviewImage,
    isAdmin: session.isAdmin,
    onSaveTopicGenerationRules: queueHook.handleSaveTopicGenerationRules,
  };

  const topicChromeRow = topicIdFromPath
    ? findRowByTopicRouteId(queueHook.rows, topicIdFromPath)
    : undefined;

  const headerOverrideTitle = topicChromeRow?.topic?.trim() || (queueHook.loading ? 'Loading topic…' : 'Topic');
  const headerOverride = useMemo(() => {
    return topicIdFromPath ? { title: headerOverrideTitle, subtitle: null } : null;
  }, [topicIdFromPath, headerOverrideTitle]);

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
      handleAddTopic={queueHook.handleAddTopic}
      newTopic={queueHook.newTopic}
      setNewTopic={queueHook.setNewTopic}
      loading={queueHook.loading}
      setStatusFilter={setStatusFilter}
      statusFilter={statusFilter}
      queueCounts={queueCounts}
      filteredRows={filteredRows}
      rows={queueHook.rows}
      getQueueStatusVariant={queueStatusToBadgeVariant}
      triggerRowGithubAction={queueHook.triggerRowGithubAction}
      actionLoading={queueHook.actionLoading}
      session={session}
      onOpenTopicReview={(row) => navigate(topicVariantsPathForRow(row))}
      onTopicNavigate={(row) => {
        const st = getNormalizedRowStatus(row.status);
        if (canPreviewPublishedContent(row)) {
          queueHook.setSelectedApprovedRowPreview(row);
          return;
        }
        if (st === 'drafted') {
          navigate(topicVariantsPathForRow(row));
        }
      }}
      publishRowToSelectedChannel={queueHook.publishRowToSelectedChannel}
      republishRowToSelectedChannel={queueHook.republishRowToSelectedChannel}
      setSelectedApprovedRowPreview={queueHook.setSelectedApprovedRowPreview}
      handleDeleteTopic={queueHook.handleDeleteTopic}
      deletingRowIndex={queueHook.deletingRowIndex}
      scrollTargetId={queueScrollTargetId}
      onScrollTargetHandled={handleScrollTargetHandled}
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
      embedded
      channelCredentialsConfigured={selectedChannelCredentialsConfigured}
      isAdmin={session.isAdmin}
      onOpenSettings={() => navigate(WORKSPACE_PATHS.settings)}
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
      generationRules={settingsHook.generationRules}
      setGenerationRules={settingsHook.setGenerationRules}
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
    />
  );

  const topicsHome = (
    <div className="mx-auto grid w-full max-w-[1400px] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0">{queueContent}</div>
      <aside className="min-w-0 lg:sticky lg:top-14 lg:z-10 lg:max-h-[calc(100vh-3.5rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
        <div className="glass-panel rounded-2xl border border-white/55 p-4 shadow-lift ring-1 ring-white/55 sm:p-5">
          <section aria-labelledby="topics-rail-ai-model" className="space-y-2">
            <h2 id="topics-rail-ai-model" className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
              AI model
            </h2>
            <DashboardToolbar
              embedded
              googleModel={settingsHook.googleModel}
              setGoogleModel={settingsHook.setGoogleModel}
              availableModels={settingsHook.availableModels}
            />
          </section>
          <div className="my-5 border-t border-violet-200/45" aria-hidden />
          <section aria-labelledby="topics-rail-delivery" className="space-y-3">
            <h2 id="topics-rail-delivery" className="text-[10px] font-semibold uppercase tracking-wider text-ink/70">
              Channel delivery
            </h2>
            {deliveryContent}
          </section>
        </div>
      </aside>
    </div>
  );

  const settingsHome = (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
      <div className="glass-panel rounded-2xl p-5 shadow-card sm:p-6">{settingsContent}</div>
      <SettingsConnectionsCard
        health={publishingHealth}
        onNavigateToSection={(sectionId) => settingsDrawerRef.current?.scrollToSection(sectionId)}
        className="rounded-2xl bg-white/80 p-0 shadow-card backdrop-blur-md lg:sticky lg:top-4"
      />
    </div>
  );

  const isTopicsMain = location.pathname === WORKSPACE_PATHS.topics;
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

  const isReviewRoute = location.pathname.includes('/topics/') && location.pathname !== WORKSPACE_PATHS.topics;

  return (
    <div
      className={`flex w-full flex-1 flex-col ${isReviewRoute ? 'min-h-0' : ''} ${isReviewRoute ? '' : 'pb-12'}`}
    >
      <div style={{ display: isTopicsMain ? 'block' : 'none' }}>
        {topicsHome}
      </div>

      <Routes>
        <Route
          path={WORKSPACE_ROUTE_PATHS.topicEditor}
          element={<TopicEditorPage {...topicReviewBase} />}
        />
        <Route
          path={WORKSPACE_ROUTE_PATHS.topicVariants}
          element={<TopicVariantsPage {...topicReviewBase} />}
        />
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
        <Route path="*" element={isTopicsMain ? null : <Navigate to={WORKSPACE_PATHS.topics} replace />} />
      </Routes>

      {queueHook.selectedApprovedRowPreview ? (
        <ApprovedPostPreview
          row={queueHook.selectedApprovedRowPreview}
          previewChannel={channelsHook.selectedChannel}
          onClose={() => queueHook.setSelectedApprovedRowPreview(null)}
        />
      ) : null}
    </div>
  );
}
