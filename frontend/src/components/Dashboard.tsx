import { useEffect, useState } from 'react';
import { Bot, MessageCircle, Phone, Plus, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import {
  BackendApi,
  isAuthErrorMessage,
  type AppSession,
  type OAuthStartResult,
  type WhatsAppPhoneOption,
} from '../services/backendApi';
import { CHANNEL_OPTIONS, getChannelLabel, getChannelOption, type ChannelId } from '../integrations/channels';
import { getLinkedInDeliveryDescription, getLinkedInDeliveryHint } from '../integrations/linkedin';
import { formatRecipientsInput, normalizePhoneNumber, parseRecipientsInput } from '../integrations/whatsapp';
import {
  AVAILABLE_GOOGLE_MODELS,
  DEFAULT_GOOGLE_MODEL,
  loadAvailableGoogleModels,
  normalizeGoogleModelOptions,
  type BotConfig,
  type BotConfigUpdate,
  type GoogleModelOption,
} from '../services/configService';
import { type SheetRow } from '../services/sheets';
import { VariantSelection } from './VariantSelection';

function buildRowActionKey(action: 'draft' | 'publish', row: SheetRow): string {
  return `${action}:${row.topic.trim()}::${row.date.trim()}`;
}

type PopupProvider = 'linkedin' | 'whatsapp';

interface OAuthPopupMessage {
  source: 'channel-bot-oauth';
  provider: PopupProvider;
  ok: boolean;
  error?: string;
  payload?: {
    connectionId?: string;
    options?: WhatsAppPhoneOption[];
  };
}

function isOAuthPopupMessage(value: unknown): value is OAuthPopupMessage {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as OAuthPopupMessage).source === 'channel-bot-oauth'
      && ((value as OAuthPopupMessage).provider === 'linkedin' || (value as OAuthPopupMessage).provider === 'whatsapp')
  );
}

async function openOAuthPopup(
  loadAuthUrl: () => Promise<OAuthStartResult>,
  provider: PopupProvider,
): Promise<OAuthPopupMessage> {
  const { authorizationUrl } = await loadAuthUrl();
  const expectedOrigin = new URL(authorizationUrl).origin;
  const popup = window.open(authorizationUrl, `${provider}-connect`, 'popup=yes,width=620,height=760');
  if (!popup) {
    throw new Error('The browser blocked the connection popup. Allow popups for this site and try again.');
  }

  popup.focus();

  return new Promise<OAuthPopupMessage>((resolve, reject) => {
    const popupPoll = window.setInterval(() => {
      if (!popup.closed) {
        return;
      }

      cleanup();
      reject(new Error('The connection popup was closed before the channel finished connecting.'));
    }, 300);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin || !isOAuthPopupMessage(event.data)) {
        return;
      }

      if (event.data.provider !== provider) {
        return;
      }

      cleanup();
      popup.close();
      resolve(event.data);
    };

    const cleanup = () => {
      window.clearInterval(popupPoll);
      window.removeEventListener('message', handleMessage);
    };

    window.addEventListener('message', handleMessage);
  });
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
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState(session.config.spreadsheetId);
  const [githubRepo, setGithubRepo] = useState(session.config.githubRepo);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [googleModel, setGoogleModel] = useState(session.config.googleModel);
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>(session.config.defaultChannel);
  const [recipientMode, setRecipientMode] = useState<'saved' | 'manual'>(
    session.config.whatsappRecipients.length > 0 ? 'saved' : 'manual'
  );
  const [selectedRecipientPhone, setSelectedRecipientPhone] = useState(session.config.whatsappRecipients[0]?.phoneNumber || '');
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');
  const [whatsappRecipientsInput, setWhatsappRecipientsInput] = useState(
    formatRecipientsInput(session.config.whatsappRecipients)
  );
  const [connectingChannel, setConnectingChannel] = useState<PopupProvider | null>(null);
  const [pendingWhatsAppConnectionId, setPendingWhatsAppConnectionId] = useState('');
  const [pendingWhatsAppOptions, setPendingWhatsAppOptions] = useState<WhatsAppPhoneOption[]>([]);
  const [selectedWhatsAppPhoneId, setSelectedWhatsAppPhoneId] = useState('');
  const [availableModels, setAvailableModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  const [showSettings, setShowSettings] = useState(
    session.isAdmin
      && (
        !session.config.spreadsheetId
        || !session.config.githubRepo
        || !session.config.hasGitHubToken
        || !session.config.linkedinPersonUrn
        || !session.config.hasLinkedInAccessToken
        || !session.config.whatsappPhoneNumberId
        || !session.config.hasWhatsAppAccessToken
      )
  );
  const [selectedRowForReview, setSelectedRowForReview] = useState<SheetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [lastDeliverySummary, setLastDeliverySummary] = useState<{
    topic: string;
    channel: ChannelId;
    mediaMode: 'image' | 'text';
    recipientLabel: string;
  } | null>(null);

  useEffect(() => {
    setSheetIdInput(session.config.spreadsheetId);
    setGithubRepo(session.config.githubRepo);
    setGoogleModel(session.config.googleModel);
    setSelectedChannel(session.config.defaultChannel);
    setRecipientMode(session.config.whatsappRecipients.length > 0 ? 'saved' : 'manual');
    setSelectedRecipientPhone(session.config.whatsappRecipients[0]?.phoneNumber || '');
    setWhatsappRecipientsInput(formatRecipientsInput(session.config.whatsappRecipients));
    setShowSettings(
      session.isAdmin
        && (
          !session.config.spreadsheetId
          || !session.config.githubRepo
          || !session.config.hasGitHubToken
          || !session.config.linkedinPersonUrn
          || !session.config.hasLinkedInAccessToken
          || !session.config.whatsappPhoneNumberId
          || !session.config.hasWhatsAppAccessToken
        )
    );
  }, [
    session.config.defaultChannel,
    session.config.githubRepo,
    session.config.googleModel,
    session.config.hasGitHubToken,
    session.config.hasLinkedInAccessToken,
    session.config.hasWhatsAppAccessToken,
    session.config.spreadsheetId,
    session.config.whatsappRecipients,
    session.isAdmin,
  ]);

  useEffect(() => {
    let cancelled = false;

    const syncModels = async () => {
      try {
        const models = normalizeGoogleModelOptions(await api.getGoogleModels(idToken), session.config.googleModel);
        if (!cancelled) {
          setAvailableModels(models);
        }
        return;
      } catch {
        const fallbackModels = await loadAvailableGoogleModels(session.config.googleModel);
        if (!cancelled) {
          setAvailableModels(fallbackModels);
        }
      }
    };

    void syncModels();

    return () => {
      cancelled = true;
    };
  }, [api, idToken, session.config.googleModel]);

  useEffect(() => {
    if (availableModels.length === 0) {
      return;
    }

    if (availableModels.some((model) => model.value === googleModel)) {
      return;
    }

    const fallbackModel = availableModels.find((model) => model.value === session.config.googleModel)?.value
      || availableModels[0]?.value
      || DEFAULT_GOOGLE_MODEL;

    if (fallbackModel !== googleModel) {
      setGoogleModel(fallbackModel);
    }
  }, [availableModels, googleModel, session.config.googleModel]);

  useEffect(() => {
    if (!session.config.spreadsheetId) {
      setRows([]);
      return;
    }

    void loadData(true);
  }, [idToken, session.config.spreadsheetId]);

  const handleFailure = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);

    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }

    alert(message || fallbackMessage);
  };

  const savedRecipients = session.config.whatsappRecipients;
  const selectedChannelOption = getChannelOption(selectedChannel);
  const resolvedRecipientPhoneNumber = recipientMode === 'saved'
    ? selectedRecipientPhone
    : normalizePhoneNumber(manualPhoneNumber);
  const selectedRecipientLabel = savedRecipients.find((recipient) => recipient.phoneNumber === selectedRecipientPhone)?.label || '';
  const whatsappConfigured = Boolean(session.config.whatsappPhoneNumberId && session.config.hasWhatsAppAccessToken);
  const linkedinConfigured = Boolean(session.config.linkedinPersonUrn && session.config.hasLinkedInAccessToken);

  const loadData = async (quiet = false) => {
    if (!session.config.spreadsheetId) return;

    setLoading(true);
    try {
      const data = await api.getRows(idToken);
      setRows(data.reverse());
    } catch (error) {
      if (!quiet) {
        handleFailure(error, 'Failed to load data. Verify the backend deployment and spreadsheet configuration.');
      } else if (error instanceof Error && isAuthErrorMessage(error.message)) {
        onAuthExpired();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !session.config.spreadsheetId) return;
    
    setLoading(true);
    try {
      await api.addTopic(idToken, newTopic.trim());
      setNewTopic('');
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVariant = async (selectedText: string, selectedImageId: string, postTime: string) => {
    if (!selectedRowForReview) return;
    
    try {
      await api.updateRowStatus(
        idToken,
        selectedRowForReview,
        'Approved', 
        selectedText, 
        selectedImageId, 
        postTime
      );
      setSelectedRowForReview(null);
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to approve variant.');
    }
  };

  const dispatchGithubAction = async (
    action: 'draft' | 'publish' | 'refine',
    eventType: 'trigger-draft' | 'trigger-publish',
    payload: Record<string, unknown>,
    successMessage: string,
    loadingKey: string = action,
  ) => {
    if (!session.config.githubRepo || !session.config.hasGitHubToken) {
      if (session.isAdmin) {
        alert('Complete the GitHub settings first.');
        setShowSettings(true);
      } else {
        alert('A workspace admin still needs to configure GitHub dispatch settings.');
      }
      return;
    }

    setActionLoading(loadingKey);
    try {
      await api.triggerGithubAction(idToken, action, eventType, {
        google_model: googleModel,
        ...payload,
      });
      alert(successMessage);
    } catch (error) {
      handleFailure(error, 'Failed to trigger the GitHub Action.');
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefineVariant = async (baseText: string, instructions: string) => {
    if (!selectedRowForReview) return;

    await dispatchGithubAction(
      'refine',
      'trigger-draft',
      {
        draft_mode: 'refine',
        refine_topic: selectedRowForReview.topic,
        refine_date: selectedRowForReview.date,
        refine_base_text: baseText,
        refine_instructions: instructions,
      },
      `Requested 4 refined variants for "${selectedRowForReview.topic}" using ${googleModel}. Refresh the dashboard in a minute to review the updated drafts.`
    );

    setSelectedRowForReview(null);
  };

  const saveSettings = async () => {
    if (!session.isAdmin) return;

    setSavingConfig(true);
    try {
      await onSaveConfig({
        spreadsheetId: sheetIdInput.trim(),
        githubRepo: githubRepo.trim(),
        googleModel,
        githubToken: githubTokenInput.trim() || undefined,
        defaultChannel: selectedChannel,
        whatsappRecipients: parseRecipientsInput(whatsappRecipientsInput),
      });
      setGithubTokenInput('');
      setShowSettings(false);
      if (sheetIdInput.trim()) {
        await loadData(true);
      }
    } catch (error) {
      handleFailure(error, 'Failed to save shared configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLinkedInConnection = async () => {
    if (!session.isAdmin) {
      return;
    }

    setConnectingChannel('linkedin');
    try {
      const message = await openOAuthPopup(() => api.startLinkedInAuth(idToken), 'linkedin');
      if (!message.ok) {
        throw new Error(message.error || 'LinkedIn connection failed.');
      }

      await onSaveConfig({});
      alert('LinkedIn publishing is now connected through the Worker.');
    } catch (error) {
      handleFailure(error, 'Failed to connect LinkedIn.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const handleWhatsAppConnection = async () => {
    if (!session.isAdmin) {
      return;
    }

    setConnectingChannel('whatsapp');
    try {
      const message = await openOAuthPopup(() => api.startWhatsAppAuth(idToken), 'whatsapp');
      if (!message.ok) {
        throw new Error(message.error || 'WhatsApp connection failed.');
      }

      const nextOptions = message.payload?.options ?? [];
      const connectionId = message.payload?.connectionId || '';
      if (connectionId && nextOptions.length > 0) {
        setPendingWhatsAppConnectionId(connectionId);
        setPendingWhatsAppOptions(nextOptions);
        setSelectedWhatsAppPhoneId(nextOptions[0]?.phoneNumberId || '');
        return;
      }

      await onSaveConfig({});
      alert('WhatsApp delivery is now connected through Meta and the Worker.');
    } catch (error) {
      handleFailure(error, 'Failed to connect WhatsApp.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const completeWhatsAppPhoneSelection = async () => {
    if (!pendingWhatsAppConnectionId || !selectedWhatsAppPhoneId) {
      alert('Choose a WhatsApp phone number before saving this connection.');
      return;
    }

    setConnectingChannel('whatsapp');
    try {
      await api.completeWhatsAppConnection(idToken, pendingWhatsAppConnectionId, selectedWhatsAppPhoneId);
      setPendingWhatsAppConnectionId('');
      setPendingWhatsAppOptions([]);
      setSelectedWhatsAppPhoneId('');
      await onSaveConfig({});
      alert('WhatsApp delivery is now connected through Meta and the Worker.');
    } catch (error) {
      handleFailure(error, 'Failed to finish the WhatsApp connection.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const triggerRowGithubAction = async (row: SheetRow, action: 'draft' | 'publish') => {
    const actionKey = buildRowActionKey(action, row);
    await dispatchGithubAction(
      action,
      action === 'draft' ? 'trigger-draft' : 'trigger-publish',
      {
        target_topic: row.topic,
        target_date: row.date,
      },
      action === 'draft'
        ? `Requested post generation for "${row.topic}" using ${googleModel}. Refresh the dashboard in a minute to review the new draft.`
        : `Requested publishing for "${row.topic}". Refresh the dashboard in a minute to confirm the updated status.`,
      actionKey,
    );
  };

  const publishRowToSelectedChannel = async (row: SheetRow) => {
    if (selectedChannel === 'whatsapp' && !whatsappConfigured) {
      if (session.isAdmin) {
        alert('Complete the WhatsApp settings first.');
        setShowSettings(true);
      } else {
        alert('A workspace admin still needs to configure WhatsApp delivery settings.');
      }
      return;
    }

    if (selectedChannel === 'linkedin' && !linkedinConfigured) {
      if (session.isAdmin) {
        alert('Complete the LinkedIn publishing settings first.');
        setShowSettings(true);
      } else {
        alert('A workspace admin still needs to configure LinkedIn publishing settings.');
      }
      return;
    }

    if (selectedChannelOption.requiresRecipient && !resolvedRecipientPhoneNumber) {
      alert('Select a saved WhatsApp recipient or enter a valid phone number in international format.');
      return;
    }

    const message = (row.selectedText || row.variant1).trim();
    if (!message) {
      alert('This row does not have approved text yet. Review and approve a draft first.');
      return;
    }

    const actionKey = buildRowActionKey('publish', row);
    setActionLoading(actionKey);
    try {
      const result = await api.publishContent(idToken, {
        row,
        channel: selectedChannel,
        recipientPhoneNumber: selectedChannel === 'whatsapp' ? resolvedRecipientPhoneNumber : undefined,
        message,
        imageUrl: row.selectedImageId.trim() || undefined,
      });

      if (result.deliveryMode === 'sent') {
        setLastDeliverySummary({
          topic: row.topic,
          channel: selectedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: selectedChannel === 'whatsapp'
            ? (selectedRecipientLabel || resolvedRecipientPhoneNumber)
            : 'LinkedIn audience',
        });
        await loadData(true);
        alert(
          selectedChannel === 'whatsapp'
            ? `Sent "${row.topic}" to ${selectedRecipientLabel || resolvedRecipientPhoneNumber} on ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.`
            : `Published "${row.topic}" to ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.`
        );
      } else {
        alert(
          `Queued "${row.topic}" for ${getChannelLabel(selectedChannel)} publishing. Refresh the dashboard in a minute to confirm the updated status.`
        );
      }
    } catch (error) {
      handleFailure(error, `Failed to send the approved message to ${getChannelLabel(selectedChannel)}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTopic = async (row: SheetRow) => {
    const confirmed = window.confirm(`Delete "${row.topic}" from the content calendar?`);
    if (!confirmed) return;

    setDeletingRowIndex(row.rowIndex);
    try {
      await api.deleteRow(idToken, row);
      if (selectedRowForReview?.rowIndex === row.rowIndex) {
        setSelectedRowForReview(null);
      }
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to delete topic entry. Please try again.');
    } finally {
      setDeletingRowIndex(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'drafted': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'approved': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'published': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  if (!session.config.spreadsheetId && !session.isAdmin) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/50 text-left max-w-xl mx-auto mt-8 p-8 rounded-2xl shadow-xl">
        <h2 className="text-xl font-bold text-deep-indigo font-heading">Workspace setup pending</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You are signed in as <strong>{session.email}</strong>, but an admin still needs to finish the shared spreadsheet, draft workflow, LinkedIn publishing, and WhatsApp delivery settings in the backend.
        </p>
      </div>
    );
  }

  if (showSettings && session.isAdmin) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-xl text-left max-w-5xl mx-auto mt-8">
        <h2 className="text-2xl font-bold text-deep-indigo font-heading mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Settings
        </h2>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,248,252,0.98)_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">General</p>
            <h3 className="mt-2 text-lg font-bold text-deep-indigo font-heading">Workspace core</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Google Spreadsheet ID</label>

            {lastDeliverySummary ? (
              <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Last delivery</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{lastDeliverySummary.topic}</h3>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                    {getChannelLabel(lastDeliverySummary.channel)}
                  </span>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                    {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {lastDeliverySummary.channel === 'whatsapp'
                    ? `Delivered to ${lastDeliverySummary.recipientLabel}.`
                    : 'Delivered to LinkedIn using the currently approved text and selected media.'}
                </p>
              </div>
            ) : null}
                <input
                  type="text"
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRYFgwnV_v..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200"
                />
                <p className="text-xs text-slate-500 mt-1.5">Found in the URL of your Google Sheet.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Default Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">Used as the default destination in the delivery panel.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,248,252,0.98)_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Draft Workflow</p>
            <h3 className="mt-2 text-lg font-bold text-deep-indigo font-heading">GitHub Actions</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">These values are only used for draft generation and refinement jobs.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">GitHub Repository</label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="e.g. username/repo-name"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Google Model</label>
                <select
                  value={googleModel}
                  onChange={(e) => setGoogleModel(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200 cursor-pointer"
                >
                  {availableModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Replace GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={githubTokenInput}
                  onChange={(e) => setGithubTokenInput(e.target.value)}
                  placeholder={session.config.hasGitHubToken ? 'Leave blank to keep the current token' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {session.config.hasGitHubToken
                    ? 'A token is already stored. Enter a new one only when you want to rotate it.'
                    : 'Required once so the backend can dispatch the GitHub workflows.'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,248,252,0.98)_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Channel</p>
            <h3 className="mt-2 text-lg font-bold text-deep-indigo font-heading">LinkedIn Publishing</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">Approved LinkedIn posts are published directly from the Worker, without going through GitHub Actions.</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {session.config.hasLinkedInAccessToken
                    ? `Connected as ${session.config.linkedinPersonUrn || 'a LinkedIn member account'}.`
                    : session.config.linkedinAuthAvailable
                      ? 'No LinkedIn account connected yet.'
                      : 'LinkedIn OAuth app credentials are still missing from the Worker environment.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleLinkedInConnection()}
                disabled={connectingChannel !== null || !session.config.linkedinAuthAvailable}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connectingChannel === 'linkedin'
                  ? 'Opening LinkedIn approval...'
                  : session.config.hasLinkedInAccessToken
                    ? 'Reconnect LinkedIn'
                    : 'Connect LinkedIn'}
              </button>
              <p className="text-xs text-slate-500">
                {session.config.linkedinAuthAvailable
                  ? 'The Worker opens LinkedIn approval in a popup, exchanges the code server-side, and stores the token securely.'
                  : 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the Worker before this button can be used.'}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(246,248,252,0.98)_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] xl:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Channel</p>
            <h3 className="mt-2 text-lg font-bold text-deep-indigo font-heading">WhatsApp Delivery</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">This path sends non-template WhatsApp messages directly through Meta Cloud API.</p>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId
                      ? `Connected to WhatsApp phone ${session.config.whatsappPhoneNumberId}.`
                      : session.config.whatsappAuthAvailable
                        ? 'No WhatsApp Business phone connected yet.'
                        : 'Meta OAuth app credentials are still missing from the Worker environment.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleWhatsAppConnection()}
                  disabled={connectingChannel !== null || !session.config.whatsappAuthAvailable}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connectingChannel === 'whatsapp'
                    ? 'Opening Meta approval...'
                    : session.config.hasWhatsAppAccessToken
                      ? 'Reconnect WhatsApp'
                      : 'Connect WhatsApp Business'}
                </button>
                <p className="text-xs text-slate-500">
                  {session.config.whatsappAuthAvailable
                    ? 'The Worker opens Meta approval in a popup, exchanges the code server-side, and discovers your available WhatsApp Business phone numbers.'
                    : 'Set META_APP_ID and META_APP_SECRET in the Worker before this button can be used.'}
                </p>

                {pendingWhatsAppOptions.length > 0 ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/80">Choose a phone</p>
                    <select
                      value={selectedWhatsAppPhoneId}
                      onChange={(e) => setSelectedWhatsAppPhoneId(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-emerald-400/50"
                    >
                      {pendingWhatsAppOptions.map((option) => (
                        <option key={option.phoneNumberId} value={option.phoneNumberId}>
                          {option.displayPhoneNumber || option.phoneNumberId} - {option.verifiedName || option.businessAccountName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void completeWhatsAppPhoneSelection()}
                      disabled={connectingChannel !== null || !selectedWhatsAppPhoneId}
                      className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save selected phone
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Saved Recipients</label>
                <textarea
                  value={whatsappRecipientsInput}
                  onChange={(e) => setWhatsappRecipientsInput(e.target.value)}
                  placeholder={['Founders group | +14155550101', 'Ops lead | +919876543210'].join('\n')}
                  className="min-h-[176px] w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-white focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200"
                />
                <p className="text-xs text-slate-500 mt-1.5">One recipient per line using the format "Label | +15551234567".</p>
              </div>
            </div>
          </section>

          <p className="text-xs text-slate-400 mt-5 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Secrets stay in the backend. The browser no longer talks to Google Sheets, LinkedIn, or Meta directly.
          </p>
          <button
            onClick={saveSettings}
            disabled={savingConfig}
            className="bg-primary text-white font-medium px-4 py-3 rounded-xl hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 w-full mt-4 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {savingConfig ? 'Saving shared configuration...' : 'Save Settings'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white/80 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl p-6">
        <div>
          <h2 className="text-3xl font-bold text-deep-indigo font-heading tracking-tight">Content Pipeline</h2>
          <p className="mt-1 text-sm text-slate-500">Workspace managed by <span className="font-medium text-slate-700">{session.email}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/50 cursor-pointer">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-slate-500">Model</span>
            <select
              value={googleModel}
              onChange={(e) => setGoogleModel(e.target.value)}
              className="bg-transparent font-medium text-deep-indigo outline-none cursor-pointer"
            >
              {availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          {session.isAdmin && (
            <>
              <div className="w-px h-8 bg-slate-200 mx-1"></div>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={() => void loadData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-deep-indigo transition-all duration-200 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/50 bg-white/80 p-5 shadow-xl lg:grid-cols-[240px_minmax(0,1fr)] mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery</p>
          <h3 className="mt-2 text-xl font-bold text-deep-indigo font-heading">Choose channel</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">Approved rows publish through the channel selected here.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/50 cursor-pointer">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Channel</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
              className="w-full bg-transparent text-base font-semibold text-deep-indigo outline-none cursor-pointer"
            >
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{selectedChannelOption.description}</span>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
            {selectedChannel === 'whatsapp' ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('saved')}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      recipientMode === 'saved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Saved recipient
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('manual')}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      recipientMode === 'manual'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Manual number
                  </button>
                </div>

                {recipientMode === 'saved' ? (
                  <label className="mt-3 block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <MessageCircle className="h-4 w-4" /> Recipient
                    </span>
                    <select
                      value={selectedRecipientPhone}
                      onChange={(e) => setSelectedRecipientPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      disabled={savedRecipients.length === 0}
                    >
                      {savedRecipients.length === 0 ? (
                        <option value="">No saved recipients configured yet</option>
                      ) : (
                        savedRecipients.map((recipient) => (
                          <option key={`${recipient.label}-${recipient.phoneNumber}`} value={recipient.phoneNumber}>
                            {recipient.label} ({recipient.phoneNumber})
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                ) : (
                  <label className="mt-3 block">
                    <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <Phone className="h-4 w-4" /> Phone number
                    </span>
                    <input
                      type="text"
                      value={manualPhoneNumber}
                      onChange={(e) => setManualPhoneNumber(e.target.value)}
                      placeholder="+14155550101"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    />
                  </label>
                )}

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Sending uses Meta&apos;s WhatsApp Cloud API directly from the Worker. Free-form text usually requires an active customer conversation window.
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-4">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">LinkedIn flow</span>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {getLinkedInDeliveryDescription()}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {getLinkedInDeliveryHint()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleAddTopic} className="flex gap-3">
        <input 
          type="text" 
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Add a new topic for research..."
          className="flex-1 border border-white/40 shadow-sm rounded-xl px-5 py-4 text-slate-900 bg-white/70 backdrop-blur-sm focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all duration-200 text-lg"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !newTopic.trim()}
          className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:bg-indigo-600 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 font-semibold text-lg"
        >
          <Plus className="w-6 h-6" /> Add Topic
        </button>
      </form>

      <div className="bg-white/80 backdrop-blur-md border border-white/50 shadow-xl rounded-2xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider font-heading">Topic</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider font-heading">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider font-heading">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider font-heading">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 bg-white/30">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                      <Bot className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700">No topics found</p>
                    <p className="text-sm">Add one above to get started with research.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`} className="hover:bg-white/60 transition-colors duration-150 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                    {row.topic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${getStatusColor(row.status)}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {row.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-wrap items-center gap-4 opacity-80 group-hover:opacity-100 transition-opacity duration-200">
                      {row.status?.toLowerCase() === 'pending' && (
                        <button
                          onClick={() => void triggerRowGithubAction(row, 'draft')}
                          disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                          className="inline-flex items-center gap-1.5 text-primary hover:text-indigo-800 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 font-medium"
                        >
                          {actionLoading === buildRowActionKey('draft', row) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          )}
                          Draft
                        </button>
                      )}
                      {row.status?.toLowerCase() === 'drafted' && (
                        <button 
                          onClick={() => setSelectedRowForReview(row)}
                          className="text-primary hover:text-indigo-800 hover:-translate-y-0.5 transition-all duration-200 font-semibold inline-flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                          Review
                        </button>
                      )}
                      {row.status?.toLowerCase() === 'approved' && (
                        <button
                          onClick={() => void publishRowToSelectedChannel(row)}
                          disabled={
                            actionLoading !== null
                            || (selectedChannel === 'whatsapp' && (!resolvedRecipientPhoneNumber || !whatsappConfigured))
                            || (selectedChannel === 'linkedin' && !linkedinConfigured)
                          }
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 font-medium"
                        >
                          {actionLoading === buildRowActionKey('publish', row) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-red-600 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 ml-auto"
                        title="Delete topic"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRowForReview && (
        <VariantSelection 
          row={selectedRowForReview} 
          onApprove={handleApproveVariant}
          onRefine={handleRefineVariant}
          onCancel={() => setSelectedRowForReview(null)}
        />
      )}
    </div>
  );
}