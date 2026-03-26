import { useState } from 'react';
import { ChevronRight, PanelLeftOpen, RefreshCw, Settings } from 'lucide-react';
import { type AppSession, type BackendApi, type TelegramChatVerificationResult } from '../../services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '../../services/configService';
import { getNormalizedRowStatus } from './utils';
import { type QueueFilter, type DashboardTab, type DeliverySummary } from './types';
import { useDashboardSettings } from './hooks/useDashboardSettings';
import { useDashboardChannels } from './hooks/useDashboardChannels';
import { useDashboardQueue } from './hooks/useDashboardQueue';
import { DashboardNavigation } from './components/DashboardNavigation';
import { dashboardTabs } from './constants';
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
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('overview');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastDeliverySummary, setLastDeliverySummary] = useState<DeliverySummary | null>(null);

  const channelsHook = useDashboardChannels({
    idToken,
    api,
    session,
    onAuthExpired,
    onSaveConfig,
    telegramBotTokenInput: '', // Temporary placeholder, actual logic is inside useDashboardSettings
  });

  const settingsHook = useDashboardSettings({
    idToken,
    api,
    session,
    onSaveConfig,
    onAuthExpired,
    loadData: async () => {
      // Temporary placeholder, logic handled below
    },
    selectedChannel: channelsHook.selectedChannel,
    telegramRecipientsInput: channelsHook.telegramRecipientsInput,
    whatsappRecipientsInput: channelsHook.whatsappRecipientsInput,
  });

  const [telegramVerification, setTelegramVerification] = useState<{ kind: 'success' | 'error'; message: string; result?: TelegramChatVerificationResult; } | null>(null);

  const handleVerifyTelegramChat = async () => {
    // Override the function locally or update hook to receive dynamic token
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
  const activeRecipientOptions = session.config.telegramRecipients.map(r => ({ label: r.label, value: r.chatId })); // Simplify for active recipients mapping
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
  
  const activeDashboardTabMeta = dashboardTabs.find((tab) => tab.value === activeDashboardTab) || dashboardTabs[0];
  
  const navigationCounts: Record<DashboardTab, number> = {
    overview: queueHook.rows.length,
    queue: filteredRows.length,
    delivery: selectedChannelOption.requiresRecipient ? activeRecipientOptions.length : 1,
  };

  const deliveryTargetSummary = selectedChannelOption.requiresRecipient
    ? (selectedRecipientLabel || resolvedRecipientId || 'Choose a recipient')
    : channelsHook.selectedChannel === 'instagram'
      ? (session.config.instagramUsername ? `@${session.config.instagramUsername}` : 'Connected Instagram account')
      : 'Connected LinkedIn account';

  if (!session.config.spreadsheetId && !session.isAdmin) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/50 text-left max-w-xl mx-auto mt-8 p-8 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-deep-indigo font-heading">Workspace setup pending</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You are signed in as <strong>{session.email}</strong>, but an admin still needs to finish the shared spreadsheet, draft workflow, Instagram publishing, LinkedIn publishing, plus Telegram and WhatsApp delivery settings in the backend.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full px-4 pb-16">
      <section className="rounded-[28px] border border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-5 py-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <span>Workspace</span>
              <ChevronRight className="h-4 w-4" />
              <span>Dashboard</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-700">{activeDashboardTabMeta.label}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-deep-indigo font-heading">{activeDashboardTabMeta.label}</h2>
            <p className="mt-1 text-sm text-slate-600">{activeDashboardTabMeta.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNavigationOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
            >
              <PanelLeftOpen className="h-4 w-4" />
              Navigation
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={queueHook.loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${queueHook.loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {session.isAdmin ? (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-4 overflow-hidden rounded-[28px] border border-white/50 bg-white/90 shadow-xl backdrop-blur-md">
            <DashboardNavigation
              activeDashboardTab={activeDashboardTab}
              setActiveDashboardTab={setActiveDashboardTab}
              setNavigationOpen={setNavigationOpen}
              navigationCounts={navigationCounts}
              setStatusFilter={setStatusFilter}
              queueCounts={queueCounts}
              session={session}
              setSettingsOpen={setSettingsOpen}
            />
          </div>
        </aside>

        <div className="space-y-6">
          {activeDashboardTab === 'overview' && (
            <DashboardOverview
              setActiveDashboardTab={setActiveDashboardTab}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
              queueCounts={queueCounts}
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
          )}

          {activeDashboardTab === 'queue' && (
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
          )}

          {activeDashboardTab === 'delivery' && (
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
              session={session}
              setSettingsOpen={setSettingsOpen}
              lastDeliverySummary={lastDeliverySummary}
            />
          )}
        </div>
      </div>

      {session.isAdmin && settingsOpen && (
        <DashboardSettingsDrawer
          session={session}
          setSettingsOpen={setSettingsOpen}
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
          parsedTelegramRecipients={[]} // Simplified
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
      )}

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
      
      {navigationOpen ? (
        <div className="fixed inset-0 z-40 flex justify-start bg-slate-900/45 backdrop-blur-sm lg:hidden">
          <div className="flex h-full w-full max-w-[320px] flex-col overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Navigation</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Compact workspace drawer</p>
              </div>
              <button
                type="button"
                onClick={() => setNavigationOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-700"
                aria-label="Close navigation"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <DashboardNavigation
              activeDashboardTab={activeDashboardTab}
              setActiveDashboardTab={setActiveDashboardTab}
              setNavigationOpen={setNavigationOpen}
              navigationCounts={navigationCounts}
              setStatusFilter={setStatusFilter}
              queueCounts={queueCounts}
              session={session}
              setSettingsOpen={setSettingsOpen}
            />
          </div>
          <button type="button" className="flex-1" aria-label="Close navigation overlay" onClick={() => setNavigationOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
