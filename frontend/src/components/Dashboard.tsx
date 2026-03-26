import { useEffect, useState } from 'react';
import { Bot, ChevronRight, Eye, LayoutDashboard, ListTodo, MessageCircle, PanelLeftOpen, Phone, Plus, RefreshCw, Send, Settings, Target, Trash2, X } from 'lucide-react';
import {
  BackendApi,
  isAuthErrorMessage,
  type AppSession,
  type GenerationRequest,
  type OAuthProvider,
  type OAuthStartResult,
  type QuickChangePreviewResult,
  type TelegramChatVerificationResult,
  type VariantsPreviewResponse,
  type WhatsAppPhoneOption,
} from '../services/backendApi';
import { CHANNEL_OPTIONS, getChannelLabel, getChannelOption, type ChannelId } from '../integrations/channels';
import { getInstagramDeliveryDescription, getInstagramDeliveryHint } from '../integrations/instagram';
import { getLinkedInDeliveryDescription, getLinkedInDeliveryHint } from '../integrations/linkedin';
import {
  formatTelegramRecipientsInput,
  normalizeTelegramChatId,
  parseTelegramRecipientsInput,
  type TelegramRecipient,
} from '../integrations/telegram';
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
import { ReviewWorkspace } from '../features/review/ReviewWorkspace';
import { ApprovedPostPreview } from './ApprovedPostPreview';

function buildRowActionKey(action: 'draft' | 'publish', row: SheetRow): string {
  return `${action}:${row.topic.trim()}::${row.date.trim()}`;
}

function getNormalizedRowStatus(status?: string): string {
  return status?.trim().toLowerCase() || 'pending';
}

function canPreviewPublishedContent(row: SheetRow): boolean {
  const status = getNormalizedRowStatus(row.status);
  return status === 'approved' || status === 'published';
}

function isSameTopicDate(left: SheetRow, right: SheetRow): boolean {
  return left.topic.trim() === right.topic.trim() && left.date.trim() === right.date.trim();
}

interface RecipientOption {
  label: string;
  value: string;
}

function getRecipientOptions(channel: ChannelId, config: BotConfig): RecipientOption[] {
  if (channel === 'telegram') {
    return config.telegramRecipients.map((recipient) => ({
      label: recipient.label,
      value: recipient.chatId,
    }));
  }

  if (channel === 'whatsapp') {
    return config.whatsappRecipients.map((recipient) => ({
      label: recipient.label,
      value: recipient.phoneNumber,
    }));
  }

  return [];
}

function getDefaultRecipientMode(channel: ChannelId, config: BotConfig): 'saved' | 'manual' {
  return getRecipientOptions(channel, config).length > 0 ? 'saved' : 'manual';
}

function getDefaultRecipientValue(channel: ChannelId, config: BotConfig): string {
  return getRecipientOptions(channel, config)[0]?.value || '';
}

function tryParseTelegramRecipients(input: string): TelegramRecipient[] {
  try {
    return parseTelegramRecipientsInput(input);
  } catch {
    return [];
  }
}

type PopupProvider = 'instagram' | 'linkedin' | 'whatsapp';
type QueueFilter = 'all' | 'pending' | 'drafted' | 'approved' | 'published';
type DashboardTab = 'overview' | 'queue' | 'delivery';

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
      && ((value as OAuthPopupMessage).provider === 'instagram'
        || (value as OAuthPopupMessage).provider === 'linkedin'
        || (value as OAuthPopupMessage).provider === 'whatsapp')
  );
}

async function openOAuthPopup(
  loadAuthUrl: () => Promise<OAuthStartResult>,
  provider: PopupProvider,
): Promise<OAuthPopupMessage> {
  const { authorizationUrl, callbackOrigin } = await loadAuthUrl();
  const expectedOrigin = callbackOrigin;
  const popup = window.open(authorizationUrl, `${provider}-connect`, 'popup=yes,width=620,height=760');
  if (!popup) {
    throw new Error('The browser blocked the connection popup. Allow popups for this site and try again.');
  }

  popup.focus();

  return new Promise<OAuthPopupMessage>((resolve, reject) => {
    let settled = false;
    const popupPoll = window.setInterval(() => {
      if (!popup.closed || settled) {
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

      settled = true;
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
  const [generationRules, setGenerationRules] = useState(session.config.generationRules);
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>(session.config.defaultChannel);
  const [recipientMode, setRecipientMode] = useState<'saved' | 'manual'>(getDefaultRecipientMode(session.config.defaultChannel, session.config));
  const [selectedRecipientId, setSelectedRecipientId] = useState(getDefaultRecipientValue(session.config.defaultChannel, session.config));
  const [manualRecipientId, setManualRecipientId] = useState('');
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState('');
  const [telegramRecipientsInput, setTelegramRecipientsInput] = useState(
    formatTelegramRecipientsInput(session.config.telegramRecipients)
  );
  const [telegramDraftLabel, setTelegramDraftLabel] = useState('');
  const [telegramDraftChatId, setTelegramDraftChatId] = useState('');
  const [verifyingTelegramChat, setVerifyingTelegramChat] = useState(false);
  const [telegramVerification, setTelegramVerification] = useState<{
    kind: 'success' | 'error';
    message: string;
    result?: TelegramChatVerificationResult;
  } | null>(null);
  const [whatsappRecipientsInput, setWhatsappRecipientsInput] = useState(
    formatRecipientsInput(session.config.whatsappRecipients)
  );
  const [connectingChannel, setConnectingChannel] = useState<PopupProvider | null>(null);
  const [disconnectingChannel, setDisconnectingChannel] = useState<PopupProvider | null>(null);
  const [pendingWhatsAppConnectionId, setPendingWhatsAppConnectionId] = useState('');
  const [pendingWhatsAppOptions, setPendingWhatsAppOptions] = useState<WhatsAppPhoneOption[]>([]);
  const [selectedWhatsAppPhoneId, setSelectedWhatsAppPhoneId] = useState('');
  const [availableModels, setAvailableModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  const [selectedRowForReview, setSelectedRowForReview] = useState<SheetRow | null>(null);
  const [selectedApprovedRowPreview, setSelectedApprovedRowPreview] = useState<SheetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<QueueFilter>('all');
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>('overview');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    setGenerationRules(session.config.generationRules);
    setSelectedChannel(session.config.defaultChannel);
    setRecipientMode(getDefaultRecipientMode(session.config.defaultChannel, session.config));
    setSelectedRecipientId(getDefaultRecipientValue(session.config.defaultChannel, session.config));
    setManualRecipientId('');
    setTelegramRecipientsInput(formatTelegramRecipientsInput(session.config.telegramRecipients));
    setTelegramDraftLabel('');
    setTelegramDraftChatId('');
    setTelegramVerification(null);
    setWhatsappRecipientsInput(formatRecipientsInput(session.config.whatsappRecipients));
  }, [
    session.config.defaultChannel,
    session.config.generationRules,
    session.config.githubRepo,
    session.config.googleModel,
    session.config.hasGitHubToken,
    session.config.spreadsheetId,
    session.config.telegramRecipients,
    session.config.whatsappRecipients,
    session.isAdmin,
  ]);

  useEffect(() => {
    if (!getChannelOption(selectedChannel).requiresRecipient) {
      return;
    }

    const options = getRecipientOptions(selectedChannel, session.config);
    if (recipientMode === 'saved') {
      if (options.length === 0) {
        setRecipientMode('manual');
        if (selectedRecipientId) {
          setSelectedRecipientId('');
        }
        return;
      }

      if (!options.some((recipient) => recipient.value === selectedRecipientId)) {
        setSelectedRecipientId(options[0]?.value || '');
      }
      return;
    }

    if (!selectedRecipientId && options.length > 0) {
      setSelectedRecipientId(options[0].value);
    }
  }, [
    recipientMode,
    selectedChannel,
    selectedRecipientId,
    session.config.telegramRecipients,
    session.config.whatsappRecipients,
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

  const selectedChannelOption = getChannelOption(selectedChannel);
  const activeRecipientOptions = getRecipientOptions(selectedChannel, session.config);
  const parsedTelegramRecipients = tryParseTelegramRecipients(telegramRecipientsInput);
  const resolvedRecipientId = recipientMode === 'saved'
    ? selectedRecipientId
    : selectedChannel === 'telegram'
      ? normalizeTelegramChatId(manualRecipientId)
      : normalizePhoneNumber(manualRecipientId);
  const selectedRecipientLabel = activeRecipientOptions.find((recipient) => recipient.value === selectedRecipientId)?.label || '';
  const whatsappConfigured = Boolean(session.config.whatsappPhoneNumberId && session.config.hasWhatsAppAccessToken);
  const instagramConfigured = Boolean(session.config.instagramUserId && session.config.hasInstagramAccessToken);
  const linkedinConfigured = Boolean(session.config.linkedinPersonUrn && session.config.hasLinkedInAccessToken);
  const channelActionBusy = connectingChannel !== null || disconnectingChannel !== null;
  const telegramConfigured = Boolean(session.config.hasTelegramBotToken);
  const queueCounts = rows.reduce<Record<QueueFilter, number>>((accumulator, row) => {
    const status = getNormalizedRowStatus(row.status) as Exclude<QueueFilter, 'all'>;
    accumulator.all += 1;
    if (status in accumulator) {
      accumulator[status] += 1;
    }
    return accumulator;
  }, {
    all: 0,
    pending: 0,
    drafted: 0,
    approved: 0,
    published: 0,
  });
  const filteredRows = rows.filter((row) => statusFilter === 'all' || getNormalizedRowStatus(row.status) === statusFilter);
  const filterOptions: Array<{ value: QueueFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'drafted', label: 'Drafted' },
    { value: 'approved', label: 'Approved' },
    { value: 'published', label: 'Published' },
  ];
  const dashboardTabs: Array<{ value: DashboardTab; label: string; description: string; icon: typeof LayoutDashboard }> = [
    { value: 'overview', label: 'Overview', description: 'Snapshot of queue and delivery state.', icon: LayoutDashboard },
    { value: 'queue', label: 'Queue', description: 'Add topics and work rows by status.', icon: ListTodo },
    { value: 'delivery', label: 'Delivery', description: 'Set the active publishing destination.', icon: Target },
  ];
  const activeDashboardTabMeta = dashboardTabs.find((tab) => tab.value === activeDashboardTab) || dashboardTabs[0];
  const queueSpotlightRows = filteredRows.slice(0, 3);
  const navigationCounts: Record<DashboardTab, number> = {
    overview: rows.length,
    queue: filteredRows.length,
    delivery: selectedChannelOption.requiresRecipient ? activeRecipientOptions.length : 1,
  };
  const deliveryTargetSummary = selectedChannelOption.requiresRecipient
    ? (selectedRecipientLabel || resolvedRecipientId || 'Choose a recipient')
    : selectedChannel === 'instagram'
      ? (session.config.instagramUsername ? `@${session.config.instagramUsername}` : 'Connected Instagram account')
      : 'Connected LinkedIn account';

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
        alert('Complete the GitHub settings in the workspace drawer first.');
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

  const handleGenerateQuickChange = async (request: GenerationRequest): Promise<QuickChangePreviewResult> => {
    try {
      return await api.generateQuickChange(idToken, request);
    } catch (error) {
      handleFailure(error, 'Failed to generate the quick-change preview.');
      throw error;
    }
  };

  const handleGenerateVariantsPreview = async (request: GenerationRequest): Promise<VariantsPreviewResponse> => {
    try {
      return await api.generateVariantsPreview(idToken, request);
    } catch (error) {
      handleFailure(error, 'Failed to generate preview variants.');
      throw error;
    }
  };

  const handleSaveDraftVariants = async (row: SheetRow, variants: string[]): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveDraftVariants(idToken, row, variants);
      setRows((current) => current.map((entry) => (isSameTopicDate(entry, updatedRow) ? updatedRow : entry)));
      setSelectedRowForReview((current) => (current && isSameTopicDate(current, updatedRow) ? updatedRow : current));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save preview variants to Sheets.');
      throw error;
    }
  };

  const handleFetchReviewImages = async () => {
    if (!selectedRowForReview) {
      return [];
    }

    const result = await api.fetchDraftImages(idToken, selectedRowForReview.topic, 4);
    return result.imageUrls;
  };

  const handleUploadReviewImage = async (file: File) => {
    if (!selectedRowForReview) {
      throw new Error('Open a draft review before uploading an image.');
    }

    const result = await api.uploadDraftImage(idToken, selectedRowForReview.topic, file);
    return result.imageUrl;
  };

  const handleDownloadReviewImage = async (imageUrl: string, fileName: string) => {
    const blob = await api.downloadDraftImage(idToken, imageUrl, fileName);
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const saveSettings = async () => {
    if (!session.isAdmin) return;

    setSavingConfig(true);
    try {
      await onSaveConfig({
        spreadsheetId: sheetIdInput.trim(),
        githubRepo: githubRepo.trim(),
        googleModel,
        generationRules: generationRules.trim(),
        githubToken: githubTokenInput.trim() || undefined,
        defaultChannel: selectedChannel,
        telegramBotToken: telegramBotTokenInput.trim() || undefined,
        telegramRecipients: parseTelegramRecipientsInput(telegramRecipientsInput),
        whatsappRecipients: parseRecipientsInput(whatsappRecipientsInput),
      });
      setGithubTokenInput('');
      setTelegramBotTokenInput('');
      if (sheetIdInput.trim()) {
        await loadData(true);
      }
    } catch (error) {
      handleFailure(error, 'Failed to save shared configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddTelegramRecipient = () => {
    const label = telegramDraftLabel.trim();
    const chatId = normalizeTelegramChatId(telegramDraftChatId);

    if (!label || !chatId) {
      alert('Enter a label and a valid Telegram target. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.');
      return;
    }

    let existingRecipients: TelegramRecipient[];
    try {
      existingRecipients = parseTelegramRecipientsInput(telegramRecipientsInput);
    } catch (error) {
      handleFailure(error, 'Fix the saved Telegram chats list before adding another chat.');
      return;
    }

    if (existingRecipients.some((recipient) => recipient.chatId === chatId)) {
      alert('That Telegram chat is already saved.');
      return;
    }

    const nextRecipients = [...existingRecipients, { label, chatId }];
    setTelegramRecipientsInput(formatTelegramRecipientsInput(nextRecipients));
    setTelegramDraftLabel('');
    setTelegramDraftChatId('');
    setTelegramVerification(null);

    if (selectedChannel === 'telegram') {
      setRecipientMode('saved');
      setSelectedRecipientId(chatId);
    }
  };

  const handleRemoveTelegramRecipient = (chatId: string) => {
    let existingRecipients: TelegramRecipient[];
    try {
      existingRecipients = parseTelegramRecipientsInput(telegramRecipientsInput);
    } catch (error) {
      handleFailure(error, 'Fix the saved Telegram chats list before removing a chat.');
      return;
    }

    const nextRecipients = existingRecipients.filter((recipient) => recipient.chatId !== chatId);
    setTelegramRecipientsInput(formatTelegramRecipientsInput(nextRecipients));

    if (selectedChannel === 'telegram' && selectedRecipientId === chatId) {
      setSelectedRecipientId(nextRecipients[0]?.chatId || '');
      if (nextRecipients.length === 0) {
        setRecipientMode('manual');
      }
    }
  };

  const handleUseManualTelegramChat = () => {
    const chatId = normalizeTelegramChatId(manualRecipientId);
    if (!chatId) {
      alert('Enter a valid Telegram target first. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.');
      return;
    }

    setTelegramDraftChatId(chatId);
    if (!telegramDraftLabel.trim()) {
      setTelegramDraftLabel('New Telegram chat');
    }

    setTelegramVerification(null);
  };

  const handleVerifyTelegramChat = async () => {
    const chatId = normalizeTelegramChatId(telegramDraftChatId);
    if (!chatId) {
      setTelegramVerification({
        kind: 'error',
        message: 'Enter a valid Telegram target before verifying. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.',
      });
      return;
    }

    setVerifyingTelegramChat(true);
    setTelegramVerification(null);
    try {
      const result = await api.verifyTelegramChat(idToken, chatId, telegramBotTokenInput.trim() || undefined);
      setTelegramDraftChatId(result.chatId);
      if (!telegramDraftLabel.trim()) {
        setTelegramDraftLabel(result.title || (result.username ? `@${result.username}` : 'Verified Telegram chat'));
      }
      setTelegramVerification({
        kind: 'success',
        message: result.title
          ? `Verified ${result.title}${result.type ? ` (${result.type})` : ''}.`
          : result.username
            ? `Verified @${result.username}${result.type ? ` (${result.type})` : ''}.`
            : 'Telegram chat verified successfully.',
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify the Telegram chat.';
      if (isAuthErrorMessage(message)) {
        onAuthExpired();
        return;
      }

      setTelegramVerification({
        kind: 'error',
        message,
      });
    } finally {
      setVerifyingTelegramChat(false);
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

  const handleInstagramConnection = async () => {
    if (!session.isAdmin) {
      return;
    }

    setConnectingChannel('instagram');
    try {
      const message = await openOAuthPopup(() => api.startInstagramAuth(idToken), 'instagram');
      if (!message.ok) {
        throw new Error(message.error || 'Instagram connection failed.');
      }

      await onSaveConfig({});
      alert('Instagram publishing is now connected through the Worker.');
    } catch (error) {
      handleFailure(error, 'Failed to connect Instagram.');
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

  const handleDisconnectChannel = async (provider: OAuthProvider) => {
    if (!session.isAdmin) {
      return;
    }

    const channelLabel = provider === 'linkedin'
      ? 'LinkedIn'
      : provider === 'instagram'
        ? 'Instagram'
        : 'WhatsApp';

    const confirmed = window.confirm(
      `Disconnect ${channelLabel}? This clears the stored connection in the Worker and requires OAuth approval the next time you connect it.`,
    );
    if (!confirmed) {
      return;
    }

    setDisconnectingChannel(provider);
    try {
      await api.disconnectChannelAuth(idToken, provider);
      if (provider === 'whatsapp') {
        setPendingWhatsAppConnectionId('');
        setPendingWhatsAppOptions([]);
        setSelectedWhatsAppPhoneId('');
      }
      await onSaveConfig({});
      alert(`${channelLabel} was disconnected. OAuth approval is required before it can be used again.`);
    } catch (error) {
      handleFailure(error, `Failed to disconnect ${channelLabel}.`);
    } finally {
      setDisconnectingChannel(null);
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
    if (actionLoading !== null) {
      return;
    }

    if (selectedChannel === 'telegram' && !telegramConfigured) {
      if (session.isAdmin) {
        alert('Complete the Telegram delivery settings in the workspace drawer first.');
      } else {
        alert('A workspace admin still needs to configure Telegram delivery settings.');
      }
      return;
    }

    if (selectedChannel === 'whatsapp' && !whatsappConfigured) {
      if (session.isAdmin) {
        alert('Complete the WhatsApp settings in the workspace drawer first.');
      } else {
        alert('A workspace admin still needs to configure WhatsApp delivery settings.');
      }
      return;
    }

    if (selectedChannel === 'instagram' && !instagramConfigured) {
      if (session.isAdmin) {
        alert('Complete the Instagram publishing settings in the workspace drawer first.');
      } else {
        alert('A workspace admin still needs to configure Instagram publishing settings.');
      }
      return;
    }

    if (selectedChannel === 'linkedin' && !linkedinConfigured) {
      if (session.isAdmin) {
        alert('Complete the LinkedIn publishing settings in the workspace drawer first.');
      } else {
        alert('A workspace admin still needs to configure LinkedIn publishing settings.');
      }
      return;
    }

    if (selectedChannelOption.requiresRecipient && !resolvedRecipientId) {
      alert(
        selectedChannel === 'telegram'
          ? 'Select a saved Telegram chat or enter a valid chat ID.'
          : 'Select a saved WhatsApp recipient or enter a valid phone number in international format.'
      );
      return;
    }

    const message = (row.selectedText || row.variant1).trim();
    if (!message) {
      alert('This row does not have approved text yet. Review and approve a draft first.');
      return;
    }

    if (selectedChannel === 'instagram' && !row.selectedImageId.trim()) {
      alert('Instagram requires a selected image. Approve the row with an image before publishing.');
      return;
    }

    const actionKey = buildRowActionKey('publish', row);
    setActionLoading(actionKey);
    try {
      const result = await api.publishContent(idToken, {
        row,
        channel: selectedChannel,
        recipientId: selectedChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: row.selectedImageId.trim() || undefined,
      });

      if (result.deliveryMode === 'sent') {
        setLastDeliverySummary({
          topic: row.topic,
          channel: selectedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: selectedChannelOption.requiresRecipient
            ? (selectedRecipientLabel || resolvedRecipientId)
            : selectedChannel === 'instagram'
              ? (session.config.instagramUsername || 'connected account')
              : 'LinkedIn audience',
        });
        await loadData(true);
        alert(
          selectedChannelOption.requiresRecipient
            ? `Sent "${row.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.`
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

  const republishRowToSelectedChannel = async (row: SheetRow) => {
    const confirmed = window.confirm(
      `Publish "${row.topic}" again to ${getChannelLabel(selectedChannel)}? This will send the currently approved text and selected media one more time.`
    );

    if (!confirmed) {
      return;
    }

    await publishRowToSelectedChannel(row);
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
    switch (getNormalizedRowStatus(status)) {
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
          You are signed in as <strong>{session.email}</strong>, but an admin still needs to finish the shared spreadsheet, draft workflow, Instagram publishing, LinkedIn publishing, plus Telegram and WhatsApp delivery settings in the backend.
        </p>
      </div>
    );
  }

  const navigationContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace navigation</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">Keep the shell compact. Open one workspace at a time.</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {dashboardTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeDashboardTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveDashboardTab(tab.value);
                  setNavigationOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${selected ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className={`block truncate text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{tab.description}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {navigationCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick status</p>
          <div className="mt-3 space-y-2">
            {filterOptions.slice(1).map((option) => (
              <button
                key={`nav-filter-${option.value}`}
                type="button"
                onClick={() => {
                  setStatusFilter(option.value);
                  setActiveDashboardTab('queue');
                  setNavigationOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-white"
              >
                <span>{option.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{queueCounts[option.value]}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-slate-200/80 px-4 py-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admin surface</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Configuration and channel setup stay outside the main dashboard canvas.</p>
          {session.isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                setNavigationOpen(false);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" />
              Open settings drawer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

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
              onClick={() => void loadData(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
            {navigationContent}
          </div>
        </aside>

        <div className="space-y-6">

      {activeDashboardTab === 'overview' ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queue snapshot</p>
                  <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">See what needs attention first</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab('queue')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Open queue tab
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.value);
                      setActiveDashboardTab('queue');
                    }}
                    className={`rounded-[24px] border px-4 py-4 text-left transition-all ${statusFilter === option.value ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${statusFilter === option.value ? 'text-slate-300' : 'text-slate-400'}`}>{option.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{queueCounts[option.value]}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/50 bg-white/85 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="border-b border-slate-200/80 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Focused rows</p>
                    <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Current working set</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Filter: {filterOptions.find((option) => option.value === statusFilter)?.label}
                  </span>
                </div>
              </div>
              <div className="space-y-0">
                {queueSpotlightRows.length === 0 ? (
                  <div className="px-6 py-14 text-center text-slate-500">
                    <p className="text-lg font-semibold text-slate-700">No rows match the current filter.</p>
                    <p className="mt-1 text-sm text-slate-500">Switch filters or open the queue tab for the full list.</p>
                  </div>
                ) : (
                  queueSpotlightRows.map((row) => (
                    <div key={`spotlight-${row.sourceSheet}-${row.rowIndex}`} className="border-t border-slate-100 first:border-t-0 px-6 py-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-semibold text-slate-900">{row.topic}</h4>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${getStatusColor(row.status)}`}>
                              {row.status || 'Pending'}
                            </span>
                            <span className="text-sm text-slate-500">{row.date}</span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{(row.selectedText || row.variant1 || 'No draft content yet.').trim()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDashboardTab('queue');
                            setStatusFilter(getNormalizedRowStatus(row.status) as QueueFilter);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          Open in queue
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active delivery target</p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-deep-indigo font-heading">{getChannelLabel(selectedChannel)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Approved posts will use this destination until you change it.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab('delivery')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Edit delivery
                </button>
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current destination</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{deliveryTargetSummary}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{selectedChannelOption.description}</p>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publishing health</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'LinkedIn', ready: linkedinConfigured },
                  { label: 'Instagram', ready: instagramConfigured },
                  { label: 'Telegram', ready: telegramConfigured },
                  { label: 'WhatsApp', ready: whatsappConfigured },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {item.ready ? 'Connected' : 'Needs setup'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {lastDeliverySummary ? (
              <section className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Last delivery</p>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                    {getChannelLabel(lastDeliverySummary.channel)}
                  </span>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                    {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {lastDeliverySummary.channel === 'whatsapp' || lastDeliverySummary.channel === 'telegram'
                    ? `Delivered to ${lastDeliverySummary.recipientLabel}.`
                    : lastDeliverySummary.channel === 'instagram'
                      ? lastDeliverySummary.recipientLabel === 'connected account'
                        ? 'Published to Instagram using the connected professional account.'
                        : `Published to Instagram as @${lastDeliverySummary.recipientLabel}.`
                      : 'Delivered to LinkedIn using the currently approved text and selected media.'}
                </p>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeDashboardTab === 'queue' ? (
        <>
          <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Add to queue</p>
                <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Capture the next topic</h3>
              </div>
              <form onSubmit={handleAddTopic} className="flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add a new topic for research..."
                  className="flex-1 rounded-2xl border border-slate-200/60 bg-white/90 px-6 py-4 text-lg text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !newTopic.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-sm transition-all duration-300 hover:bg-indigo-600 hover:shadow-md disabled:opacity-50"
                >
                  <Plus className="h-6 w-6" /> <span className="hidden sm:inline">Add topic</span><span className="sm:hidden">Add</span>
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/50 bg-white/85 shadow-xl backdrop-blur-md overflow-hidden">
            <div className="border-b border-slate-200/80 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queue</p>
                  <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Focus on the next action, not the whole system</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Every row surfaces one primary next step based on status. Filter the queue when you want a narrower working set.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={`chip-${option.value}`}
                      type="button"
                      onClick={() => setStatusFilter(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${statusFilter === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {option.label} ({queueCounts[option.value]})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-0">
              {filteredRows.length === 0 ? (
                <div className="px-6 py-16 text-center text-slate-500">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                    <Bot className="h-8 w-8 text-indigo-300" />
                  </div>
                  <p className="text-lg font-semibold text-slate-700">
                    {rows.length === 0 ? 'No topics found' : `No ${statusFilter === 'all' ? '' : statusFilter} items right now`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {rows.length === 0 ? 'Add one above to get started with research.' : 'Try another filter or refresh the queue.'}
                  </p>
                </div>
              ) : (
                filteredRows.map((row) => {
                  const normalizedStatus = getNormalizedRowStatus(row.status);
                  const previewText = (row.selectedText || row.variant1 || 'No draft content yet.').trim();
                  return (
                    <div key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`} className="border-t border-slate-100 first:border-t-0 px-6 py-5">
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] xl:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-semibold text-slate-900">{row.topic}</h4>
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${getStatusColor(row.status)}`}>
                              {row.status || 'Pending'}
                            </span>
                            <span className="text-sm text-slate-500">{row.date}</span>
                          </div>
                          <p className="mt-3 max-w-3xl line-clamp-2 text-sm leading-6 text-slate-600">
                            {previewText}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                          {normalizedStatus === 'pending' ? (
                            <button
                              onClick={() => void triggerRowGithubAction(row, 'draft')}
                              disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
                              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                            >
                              {actionLoading === buildRowActionKey('draft', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                              Generate draft
                            </button>
                          ) : null}

                          {normalizedStatus === 'drafted' ? (
                            <button
                              onClick={() => setSelectedRowForReview(row)}
                              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                            >
                              Review draft
                            </button>
                          ) : null}

                          {normalizedStatus === 'approved' ? (
                            <button
                              onClick={() => void publishRowToSelectedChannel(row)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Publish approved post
                            </button>
                          ) : null}

                          {normalizedStatus === 'published' ? (
                            <button
                              onClick={() => void republishRowToSelectedChannel(row)}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {actionLoading === buildRowActionKey('publish', row) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Publish again
                            </button>
                          ) : null}

                          {canPreviewPublishedContent(row) ? (
                            <button
                              onClick={() => setSelectedApprovedRowPreview(row)}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleDeleteTopic(row)}
                            disabled={deletingRowIndex === row.rowIndex}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeDashboardTab === 'delivery' ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active delivery target</p>
                <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">{getChannelLabel(selectedChannel)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Approved posts will use this destination until you change it.</p>
              </div>
              <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Channel</span>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
                  className="w-full bg-transparent text-base font-semibold text-deep-indigo outline-none"
                >
                  {CHANNEL_OPTIONS.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current destination</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{deliveryTargetSummary}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{selectedChannelOption.description}</p>

              {selectedChannelOption.requiresRecipient ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRecipientMode('saved')}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${recipientMode === 'saved' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                      {selectedChannel === 'telegram' ? 'Saved chat' : 'Saved recipient'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientMode('manual')}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${recipientMode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                      {selectedChannel === 'telegram' ? 'Manual chat ID' : 'Manual number'}
                    </button>
                  </div>

                  {recipientMode === 'saved' ? (
                    <label className="mt-3 block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <MessageCircle className="h-4 w-4" /> {selectedChannel === 'telegram' ? 'Chat' : 'Recipient'}
                      </span>
                      <select
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        disabled={activeRecipientOptions.length === 0}
                      >
                        {activeRecipientOptions.length === 0 ? (
                          <option value="">No saved {selectedChannel === 'telegram' ? 'chats' : 'recipients'} configured yet</option>
                        ) : (
                          activeRecipientOptions.map((recipient) => (
                            <option key={`${recipient.label}-${recipient.value}`} value={recipient.value}>
                              {recipient.label} ({recipient.value})
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                  ) : (
                    <label className="mt-3 block">
                      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {selectedChannel === 'telegram' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />} {selectedChannel === 'telegram' ? 'Chat ID' : 'Phone number'}
                      </span>
                      <input
                        type="text"
                        value={manualRecipientId}
                        onChange={(e) => setManualRecipientId(e.target.value)}
                        placeholder={selectedChannel === 'telegram' ? '@my_channel or -1001234567890' : '+14155550101'}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                    </label>
                  )}
                </>
              ) : selectedChannel === 'instagram' ? (
                <>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{getInstagramDeliveryDescription()}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{getInstagramDeliveryHint()}</p>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm leading-6 text-slate-700">{getLinkedInDeliveryDescription()}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{getLinkedInDeliveryHint()}</p>
                </>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Setup access</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Channel auth and shared publishing configuration stay in the workspace drawer so this tab can stay focused on the active destination.
              </p>
              {session.isAdmin ? (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Settings className="h-4 w-4" />
                  Open workspace drawer
                </button>
              ) : null}
            </section>

            {lastDeliverySummary ? (
              <section className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Last delivery</p>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                    {getChannelLabel(lastDeliverySummary.channel)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Last confirmed destination: {lastDeliverySummary.recipientLabel}.
                </p>
              </section>
            ) : null}
          </div>
        </section>
      ) : null}

        </div>
      </div>

      {navigationOpen ? (
        <div className="fixed inset-0 z-40 flex bg-slate-900/45 backdrop-blur-sm lg:hidden">
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
                <X className="h-4 w-4" />
              </button>
            </div>
            {navigationContent}
          </div>
          <button type="button" className="flex-1" aria-label="Close navigation overlay" onClick={() => setNavigationOpen(false)} />
        </div>
      ) : null}

      {session.isAdmin && settingsOpen ? (
        <div className="fixed inset-0 z-40 flex justify-start bg-slate-900/45 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[760px] flex-col border-l border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace drawer</p>
                <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Settings and channel setup</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Configuration lives here now so the dashboard tabs can stay focused on publishing work.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-700"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="flex flex-col gap-3">
                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden" open>
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    Workspace core
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Google Spreadsheet ID</label>
                        <input
                          type="text"
                          value={sheetIdInput}
                          onChange={(e) => setSheetIdInput(e.target.value)}
                          placeholder="e.g. 1BxiMVs0XRYFgwnV_v..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">Found in the URL of your Google Sheet.</p>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Default Channel</label>
                        <select
                          value={selectedChannel}
                          onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {CHANNEL_OPTIONS.map((channel) => (
                            <option key={channel.value} value={channel.value}>
                              {channel.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-slate-500">Used as the default destination in the delivery panel.</p>
                      </div>
                    </div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    GitHub Actions
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <p className="mt-2 text-xs leading-5 text-slate-500">GitHub is still used for full draft jobs. Preview generation inside review uses the Worker model and shared rules below.</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">GitHub Repository</label>
                        <input
                          type="text"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          placeholder="e.g. username/repo-name"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Google Model</label>
                        <select
                          value={googleModel}
                          onChange={(e) => setGoogleModel(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {availableModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Shared Generation Rules</label>
                        <textarea
                          value={generationRules}
                          onChange={(e) => setGenerationRules(e.target.value)}
                          placeholder="Examples: keep the tone crisp, avoid emoji, stay under 180 words, always end with one clear takeaway."
                          className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">Applied by the Worker to Quick Change and 4-variant preview runs.</p>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Replace GitHub Personal Access Token</label>
                        <input
                          type="password"
                          value={githubTokenInput}
                          onChange={(e) => setGithubTokenInput(e.target.value)}
                          placeholder={session.config.hasGitHubToken ? 'Leave blank to keep the current token' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">
                          {session.config.hasGitHubToken
                            ? 'A token is already stored. Enter a new one only when you want to rotate it.'
                            : 'Required once so the backend can dispatch the GitHub workflows.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    Instagram Publishing
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <p className="mt-2 text-xs leading-5 text-slate-500">Approved Instagram posts are published directly from the Worker using Instagram Login for professional accounts.</p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasInstagramAccessToken && session.config.instagramUserId ? 'bg-[#E1306C]' : 'bg-slate-300'}`}></div>
                          <p className="text-sm font-medium text-slate-700">
                            {session.config.hasInstagramAccessToken && session.config.instagramUserId
                              ? `Connected as ${session.config.instagramUsername ? `@${session.config.instagramUsername}` : session.config.instagramUserId}.`
                              : session.config.instagramAuthAvailable
                                ? 'No Instagram professional account connected yet.'
                                : 'Instagram app credentials are still missing from the Worker environment.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void handleInstagramConnection()}
                          disabled={channelActionBusy || !session.config.instagramAuthAvailable}
                          className="w-full rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {connectingChannel === 'instagram'
                            ? 'Opening Instagram approval...'
                            : session.config.hasInstagramAccessToken
                              ? 'Reconnect Instagram'
                              : 'Connect Instagram'}
                        </button>
                        {session.config.hasInstagramAccessToken ? (
                          <button
                            type="button"
                            onClick={() => void handleDisconnectChannel('instagram')}
                            disabled={channelActionBusy}
                            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {disconnectingChannel === 'instagram' ? 'Disconnecting Instagram...' : 'Disconnect Instagram'}
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        {session.config.instagramAuthAvailable
                          ? 'The Worker opens Instagram approval in a popup, exchanges the code server-side, and stores the long-lived token securely.'
                          : 'Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in the Worker before this button can be used.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    LinkedIn Publishing
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <p className="mt-2 text-xs leading-5 text-slate-500">Approved LinkedIn posts are published directly from the Worker, without going through GitHub Actions.</p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasLinkedInAccessToken ? 'bg-[#0A66C2]' : 'bg-slate-300'}`}></div>
                          <p className="text-sm font-medium text-slate-700">
                            {session.config.hasLinkedInAccessToken
                              ? `Connected as ${session.config.linkedinPersonUrn || 'a LinkedIn member account'}.`
                              : session.config.linkedinAuthAvailable
                                ? 'No LinkedIn account connected yet.'
                                : 'LinkedIn OAuth app credentials are still missing from the Worker environment.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void handleLinkedInConnection()}
                          disabled={channelActionBusy || !session.config.linkedinAuthAvailable}
                          className="w-full rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#004182] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {connectingChannel === 'linkedin'
                            ? 'Opening LinkedIn approval...'
                            : session.config.hasLinkedInAccessToken
                              ? 'Reconnect LinkedIn'
                              : 'Connect LinkedIn'}
                        </button>
                        {session.config.hasLinkedInAccessToken ? (
                          <button
                            type="button"
                            onClick={() => void handleDisconnectChannel('linkedin')}
                            disabled={channelActionBusy}
                            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {disconnectingChannel === 'linkedin' ? 'Disconnecting LinkedIn...' : 'Disconnect LinkedIn'}
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        {session.config.linkedinAuthAvailable
                          ? 'The Worker opens LinkedIn approval in a popup, exchanges the code server-side, and stores the token securely.'
                          : 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the Worker before this button can be used.'}
                      </p>
                    </div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    Telegram Delivery
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <p className="mt-2 text-xs leading-5 text-slate-500">This path sends approved content directly through the Telegram Bot API.</p>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasTelegramBotToken ? 'bg-[#0088cc]' : 'bg-slate-300'}`}></div>
                            <p className="text-sm font-medium text-slate-700">
                              {session.config.hasTelegramBotToken
                                ? 'Telegram bot token is stored in the Worker.'
                                : 'No Telegram bot token stored yet.'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold text-slate-700">Replace Telegram Bot Token</label>
                          <input
                            type="password"
                            value={telegramBotTokenInput}
                            onChange={(e) => setTelegramBotTokenInput(e.target.value)}
                            placeholder={session.config.hasTelegramBotToken ? 'Leave blank to keep the current bot token' : '123456789:AA...'}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <p className="mt-1.5 text-xs text-slate-500">
                            {session.config.hasTelegramBotToken
                              ? 'A bot token is already stored. Enter a new one only when you want to rotate it.'
                              : 'Create a bot with BotFather, then paste the token here once so the Worker can deliver messages.'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Saved Chats</label>
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick add</p>
                          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                            <input
                              type="text"
                              value={telegramDraftLabel}
                              onChange={(e) => {
                                setTelegramDraftLabel(e.target.value);
                                setTelegramVerification(null);
                              }}
                              placeholder="Team channel"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <input
                              type="text"
                              value={telegramDraftChatId}
                              onChange={(e) => {
                                setTelegramDraftChatId(e.target.value);
                                setTelegramVerification(null);
                              }}
                              placeholder="@my_channel or 123456789 / -1001234567890"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                              <button
                                type="button"
                                onClick={() => void handleVerifyTelegramChat()}
                                disabled={verifyingTelegramChat}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <RefreshCw className={`h-4 w-4 ${verifyingTelegramChat ? 'animate-spin' : ''}`} />
                                {verifyingTelegramChat ? 'Verifying...' : 'Verify chat'}
                              </button>
                              <button
                                type="button"
                                onClick={handleAddTelegramRecipient}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800"
                              >
                                <Plus className="h-4 w-4" /> Add chat
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Use @channelusername only for public channels or public supergroups. For people, private groups, and private channels, start or add the bot first and use the numeric chat ID instead.</p>
                          {telegramVerification ? (
                            <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${telegramVerification.kind === 'success' ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800' : 'border-rose-200 bg-rose-50/80 text-rose-700'}`}>
                              <p className="font-semibold">{telegramVerification.message}</p>
                              {telegramVerification.kind === 'success' && telegramVerification.result ? (
                                <p className="mt-1 text-xs opacity-80">
                                  Saved target will use {telegramVerification.result.chatId}
                                  {telegramVerification.result.username ? ` as @${telegramVerification.result.username}` : ''}.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {selectedChannel === 'telegram' && recipientMode === 'manual' ? (
                            <button
                              type="button"
                              onClick={handleUseManualTelegramChat}
                              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-indigo-600"
                            >
                              <MessageCircle className="h-4 w-4" /> Use the manual chat ID from the delivery panel
                            </button>
                          ) : null}
                        </div>

                        {parsedTelegramRecipients.length > 0 ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Saved now</p>
                            <div className="mt-3 space-y-2">
                              {parsedTelegramRecipients.map((recipient) => (
                                <div
                                  key={`${recipient.label}-${recipient.chatId}`}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">{recipient.label}</p>
                                    <p className="text-xs text-slate-500">{recipient.chatId}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTelegramRecipient(recipient.chatId)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" /> Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <textarea
                          className="mt-3 min-h-[176px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          value={telegramRecipientsInput}
                          onChange={(e) => setTelegramRecipientsInput(e.target.value)}
                          placeholder={['Channel | @my_channel', 'Founders group | -1001234567890'].join('\n')}
                        />
                        <p className="mt-1.5 text-xs text-slate-500">Bulk editor. One chat per line using the format "Label | @channelusername" or "Label | -1001234567890".</p>
                      </div>
                    </div>
                  </div>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                    WhatsApp Delivery
                    <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-slate-100 p-4 pt-0">
                    <p className="mt-2 text-xs leading-5 text-slate-500">This path sends non-template WhatsApp messages directly through Meta Cloud API.</p>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                          <div className="flex items-center gap-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId ? 'bg-[#25D366]' : 'bg-slate-300'}`}></div>
                            <p className="text-sm font-medium text-slate-700">
                              {session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId
                                ? `Connected to WhatsApp phone ${session.config.whatsappPhoneNumberId}.`
                                : session.config.whatsappAuthAvailable
                                  ? 'No WhatsApp Business phone connected yet.'
                                  : 'Meta OAuth app credentials are still missing from the Worker environment.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void handleWhatsAppConnection()}
                            disabled={channelActionBusy || !session.config.whatsappAuthAvailable}
                            className="w-full rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#128C7E] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {connectingChannel === 'whatsapp'
                              ? 'Opening Meta approval...'
                              : session.config.hasWhatsAppAccessToken
                                ? 'Reconnect WhatsApp'
                                : 'Connect WhatsApp Business'}
                          </button>
                          {session.config.hasWhatsAppAccessToken ? (
                            <button
                              type="button"
                              onClick={() => void handleDisconnectChannel('whatsapp')}
                              disabled={channelActionBusy}
                              className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {disconnectingChannel === 'whatsapp' ? 'Disconnecting WhatsApp...' : 'Disconnect WhatsApp'}
                            </button>
                          ) : null}
                        </div>
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
                              className="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
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
                              disabled={channelActionBusy || !selectedWhatsAppPhoneId}
                              className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save selected phone
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Saved Recipients</label>
                        <textarea
                          value={whatsappRecipientsInput}
                          onChange={(e) => setWhatsappRecipientsInput(e.target.value)}
                          placeholder={['Founders group | +14155550101', 'Ops lead | +919876543210'].join('\n')}
                          className="min-h-[176px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">One recipient per line using the format "Label | +15551234567".</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secrets stay in the backend. The browser no longer talks to Google Sheets, Instagram, LinkedIn, Telegram, or Meta directly.
              </p>
              <button
                onClick={saveSettings}
                disabled={savingConfig}
                className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-50"
              >
                {savingConfig ? 'Saving shared configuration...' : 'Save settings'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedRowForReview && (
        <ReviewWorkspace
          row={selectedRowForReview} 
          sharedRules={session.config.generationRules}
          googleModel={googleModel}
          onApprove={handleApproveVariant}
          onGenerateQuickChange={handleGenerateQuickChange}
          onGenerateVariants={handleGenerateVariantsPreview}
          onSaveVariants={handleSaveDraftVariants}
          onFetchMoreImages={handleFetchReviewImages}
          onUploadImage={handleUploadReviewImage}
          onDownloadImage={handleDownloadReviewImage}
          onCancel={() => setSelectedRowForReview(null)}
        />
      )}

      {selectedApprovedRowPreview && (
        <ApprovedPostPreview
          row={selectedApprovedRowPreview}
          onClose={() => setSelectedApprovedRowPreview(null)}
        />
      )}
    </div>
  );

}
