import { useState } from 'react';
import { Bot, RefreshCw } from 'lucide-react';
import { type AppSession, type BackendApi, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '../../services/configService';
import { getNormalizedRowStatus } from './utils';
import { type QueueFilter, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import { DashboardSettingsDrawer } from './components/DashboardSettingsDrawer';
import { DashboardOverview } from './tabs/DashboardOverview';
import { DashboardQueue } from './tabs/DashboardQueue';
import { DashboardDelivery } from './tabs/DashboardDelivery';
import { getChannelOption } from '../../integrations/channels';
import { normalizeTelegramChatId } from '../../integrations/telegram';
import { normalizePhoneNumber } from '../../integrations/whatsapp';
import { ReviewWorkspace } from '../../features/review/ReviewWorkspace';
import { ApprovedPostPreview } from '../ApprovedPostPreview';

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
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('all');
  const [lastDeliverySummary, setLastDeliverySummary] = useState<DeliverySummary | null>(null);

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

  const loadData = async () => {
    if (!session.config.spreadsheetId) return;
    queueHook.loadData();
  };

  const queueCounts = queueHook.rows.reduce<Record<QueueFilter, number>>((acc, row) => {
    const status = getNormalizedRowStatus(row.status) as Exclude<QueueFilter, 'all'>;
    acc.all += 1;
    if (status in acc) acc[status] += 1;
    return acc;
  }, { all: 0, pending: 0, drafted: 0, approved: 0, published: 0 });

  const filteredRows = queueHook.rows.filter((row) => statusFilter === 'all' || getNormalizedRowStatus(row.status) === statusFilter);
  const queueSpotlightRows = filteredRows.slice(0, 3);
  
  const deliveryTargetSummary = selectedChannelOption.requiresRecipient
    ? (selectedRecipientLabel || resolvedRecipientId || 'Choose a recipient')
    : channelsHook.selectedChannel === 'instagram'
      ? (session.config.instagramUsername ? `@${session.config.instagramUsername}` : 'Connected Instagram account')
      : 'Connected LinkedIn account';

  if (!session.config.spreadsheetId && !session.isAdmin) {
    return (
      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-border bg-surface p-8 text-left shadow-card">
        <h2 className="font-heading text-xl font-semibold text-ink">Workspace setup pending</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          You are signed in as <strong className="text-ink">{session.email}</strong>, but an admin still needs to finish the shared spreadsheet, draft workflow, Instagram publishing, LinkedIn publishing, plus Telegram and WhatsApp delivery settings in the backend.
        </p>
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
      getStatusColor={queueHook.getStatusColor}
      triggerRowGithubAction={queueHook.triggerRowGithubAction}
      actionLoading={queueHook.actionLoading}
      session={session}
      setSelectedRowForReview={queueHook.setSelectedRowForReview}
      publishRowToSelectedChannel={queueHook.publishRowToSelectedChannel}
      republishRowToSelectedChannel={queueHook.republishRowToSelectedChannel}
      setSelectedApprovedRowPreview={queueHook.setSelectedApprovedRowPreview}
      handleDeleteTopic={queueHook.handleDeleteTopic}
      deletingRowIndex={queueHook.deletingRowIndex}
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
    />
  );

  const settingsContent = (
    <DashboardSettingsDrawer
      session={session}
      sheetIdInput={settingsHook.sheetIdInput}
      setSheetIdInput={settingsHook.setSheetIdInput}
      selectedChannel={channelsHook.selectedChannel}
      setSelectedChannel={channelsHook.setSelectedChannel}
      githubRepo={settingsHook.githubRepo}
      setGithubRepo={settingsHook.setGithubRepo}
      googleModel={settingsHook.googleModel}
      setGoogleModel={settingsHook.setGoogleModel}
      availableModels={settingsHook.availableModels}
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
      parsedTelegramRecipients={[]} 
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

  return (
    <div className="mx-auto w-full max-w-[1600px] px-0 pb-12 sm:px-1">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card">
        <div>
          <h2 className="font-heading text-base font-semibold text-ink">Overview</h2>
          <p className="mt-0.5 text-xs text-muted">Queue snapshot and delivery context.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-muted transition-colors focus-within:ring-2 focus-within:ring-primary/30">
            <Bot className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="hidden sm:inline">Model</span>
            <select
              value={settingsHook.googleModel}
              onChange={(e) => settingsHook.setGoogleModel(e.target.value)}
              className="max-w-[200px] cursor-pointer bg-transparent font-semibold text-ink outline-none sm:max-w-xs"
            >
              {settingsHook.availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={queueHook.loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-canvas px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${queueHook.loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
        <aside className="custom-scrollbar sticky top-20 flex max-h-[calc(100vh-5rem)] w-full shrink-0 flex-col gap-6 overflow-y-auto pb-4 pr-1 lg:w-[320px] xl:w-[360px]">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
            <h2 className="font-heading text-lg font-semibold text-ink">Delivery</h2>
            {deliveryContent}
          </div>

          {session.isAdmin ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
              <h2 className="font-heading text-lg font-semibold text-ink">Workspace settings</h2>
              {settingsContent}
            </div>
          ) : null}
        </aside>

        <div className="flex-1 min-w-0 space-y-6 flex flex-col">
          <DashboardOverview
            setStatusFilter={setStatusFilter}
            statusFilter={statusFilter}
            queueSpotlightRows={queueSpotlightRows}
            getStatusColor={queueHook.getStatusColor}
            selectedChannel={channelsHook.selectedChannel}
            deliveryTargetSummary={deliveryTargetSummary}
            selectedChannelOption={selectedChannelOption}
            linkedinConfigured={linkedinConfigured}
            instagramConfigured={instagramConfigured}
            telegramConfigured={telegramConfigured}
            whatsappConfigured={whatsappConfigured}
            lastDeliverySummary={lastDeliverySummary}
          />
          {queueContent}
        </div>
      </div>

      {queueHook.selectedRowForReview && (
        <ReviewWorkspace
          row={queueHook.selectedRowForReview} 
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
