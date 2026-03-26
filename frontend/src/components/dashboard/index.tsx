import { useState, useCallback, useMemo } from 'react';
import { type AppSession, type BackendApi, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '../../services/configService';
import { getNormalizedRowStatus, queueStatusToBadgeVariant } from './utils';
import { type QueueFilter, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import { DashboardSettingsDrawer } from './components/DashboardSettingsDrawer';
import { SettingsConnectionsCard } from './components/SettingsConnectionsCard';
import { DashboardToolbar } from './components/DashboardToolbar';
import { DashboardQueue } from './tabs/DashboardQueue';
import { DashboardDelivery } from './tabs/DashboardDelivery';
import { getChannelOption } from '../../integrations/channels';
import { useRegisterWorkspaceChrome } from '../workspace/WorkspaceChromeContext';
import { type WorkspaceNavPage } from '../workspace/AppSidebar';
import { normalizeTelegramChatId, parseTelegramRecipientsInput } from '../../integrations/telegram';
import { normalizePhoneNumber } from '../../integrations/whatsapp';
import { ReviewWorkspace } from '../../features/review/ReviewWorkspace';
import { ApprovedPostPreview } from '../ApprovedPostPreview';

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
  workspacePage,
  onOpenSettings,
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
  workspacePage: WorkspaceNavPage;
  onOpenSettings?: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('all');
  const [lastDeliverySummary, setLastDeliverySummary] = useState<DeliverySummary | null>(null);
  const [queueScrollTargetId, setQueueScrollTargetId] = useState<string | null>(null);

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

  const selectedChannelCredentialsConfigured =
    channelsHook.selectedChannel === 'linkedin'
      ? linkedinConfigured
      : channelsHook.selectedChannel === 'instagram'
        ? instagramConfigured
        : channelsHook.selectedChannel === 'telegram'
          ? telegramConfigured
          : whatsappConfigured;

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
    setLastDeliverySummary,
  });

  const queueCounts = queueHook.rows.reduce<Record<QueueFilter, number>>((acc, row) => {
    const status = getNormalizedRowStatus(row.status) as Exclude<QueueFilter, 'all'>;
    acc.all += 1;
    if (status in acc) acc[status] += 1;
    return acc;
  }, { all: 0, pending: 0, drafted: 0, approved: 0, published: 0 });

  const filteredRows = queueHook.rows.filter((row) => statusFilter === 'all' || getNormalizedRowStatus(row.status) === statusFilter);

  const deliveryTargetSummary = selectedChannelOption.requiresRecipient
    ? (selectedRecipientLabel || resolvedRecipientId || 'Choose a recipient')
    : channelsHook.selectedChannel === 'instagram'
      ? session.config.instagramUsername
        ? `@${session.config.instagramUsername}`
        : instagramConfigured
          ? 'Connected Instagram account'
          : 'Instagram not connected'
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
    }),
    [linkedinConfigured, instagramConfigured, telegramConfigured, whatsappConfigured],
  );

  const topicReviewWorkspace =
    queueHook.selectedRowForReview ? (
      <div className="-mx-4 min-h-[calc(100dvh-7.5rem)] sm:-mx-6">
        <ReviewWorkspace
          row={queueHook.selectedRowForReview}
          deliveryChannel={channelsHook.selectedChannel}
          previewAuthorName={previewAuthorDisplayName(session.email)}
          sharedRules={session.config.generationRules}
          googleModel={settingsHook.googleModel}
          onApprove={queueHook.handleApproveVariant}
          onGenerateQuickChange={queueHook.handleGenerateQuickChange}
          onGenerateVariants={queueHook.handleGenerateVariantsPreview}
          onSaveVariants={queueHook.handleSaveDraftVariants}
          onFetchMoreImages={queueHook.handleFetchReviewImages}
          onUploadImage={queueHook.handleUploadReviewImage}
          onDownloadImage={queueHook.handleDownloadReviewImage}
          onCancel={() => queueHook.setSelectedRowForReview(null)}
        />
      </div>
    ) : null;

  useRegisterWorkspaceChrome({
    onRefreshQueue: session.config.spreadsheetId ? refreshQueue : null,
    queueLoading: queueHook.loading,
    health: publishingHealth,
    headerOverride: queueHook.selectedRowForReview
      ? { title: 'Topic', subtitle: 'Variants, refine, and approve' }
      : null,
  });

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
      setSelectedRowForReview={queueHook.setSelectedRowForReview}
      publishRowToSelectedChannel={queueHook.publishRowToSelectedChannel}
      republishRowToSelectedChannel={queueHook.republishRowToSelectedChannel}
      setSelectedApprovedRowPreview={queueHook.setSelectedApprovedRowPreview}
      handleDeleteTopic={queueHook.handleDeleteTopic}
      deletingRowIndex={queueHook.deletingRowIndex}
      scrollTargetId={queueScrollTargetId}
      onScrollTargetHandled={handleScrollTargetHandled}
    />
  );

  const parsedTelegramRecipientsForSettings = useMemo(() => {
    try {
      return parseTelegramRecipientsInput(channelsHook.telegramRecipientsInput);
    } catch {
      return [];
    }
  }, [channelsHook.telegramRecipientsInput]);

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
      onOpenSettings={onOpenSettings}
    />
  );

  const settingsContent = (
    <DashboardSettingsDrawer
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

  if (workspacePage === 'settings' && session.isAdmin) {
    return (
      <div className="w-full pb-12">
        {topicReviewWorkspace ?? (
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
            <div className="glass-panel rounded-2xl p-5 shadow-card sm:p-6">{settingsContent}</div>
            <SettingsConnectionsCard
              health={publishingHealth}
              className="rounded-2xl bg-white/80 p-0 shadow-card backdrop-blur-md lg:sticky lg:top-4"
            />
          </div>
        )}

        {queueHook.selectedApprovedRowPreview && (
          <ApprovedPostPreview
            row={queueHook.selectedApprovedRowPreview}
            onClose={() => queueHook.setSelectedApprovedRowPreview(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      {topicReviewWorkspace ?? (
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
      )}

      {queueHook.selectedApprovedRowPreview && (
        <ApprovedPostPreview
          row={queueHook.selectedApprovedRowPreview}
          onClose={() => queueHook.setSelectedApprovedRowPreview(null)}
        />
      )}
    </div>
  );
}
