import { useState, useCallback } from 'react';
import { type AppSession, type BackendApi, type OAuthProvider, type TelegramChatVerificationResult, type WhatsAppPhoneOption, isAuthErrorMessage } from '../../../services/backendApi';
import { type BotConfig, type BotConfigUpdate } from '../../../services/configService';
import { type ChannelId } from '../../../integrations/channels';
import { formatTelegramRecipientsInput, normalizeTelegramChatId, parseTelegramRecipientsInput, type TelegramRecipient } from '../../../integrations/telegram';
import { formatRecipientsInput } from '../../../integrations/whatsapp';
import { type PopupProvider } from '../types';
import { getDefaultRecipientMode, getDefaultRecipientValue, openOAuthPopup } from '../utils';
import { useAlert } from '../../AlertProvider';

export function useDashboardChannels({
  idToken,
  api,
  session,
  onAuthExpired,
  onSaveConfig,
  telegramBotTokenInput,
}: {
  idToken: string;
  api: BackendApi;
  session: AppSession;
  onAuthExpired: () => void;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  telegramBotTokenInput: string;
}) {
  const { showAlert, showConfirm } = useAlert();
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>(session.config.defaultChannel);
  const [recipientMode, setRecipientMode] = useState<'saved' | 'manual'>(getDefaultRecipientMode(session.config.defaultChannel, session.config));
  const [selectedRecipientId, setSelectedRecipientId] = useState(getDefaultRecipientValue(session.config.defaultChannel, session.config));
  const [manualRecipientId, setManualRecipientId] = useState('');

  const [telegramRecipientsInput, setTelegramRecipientsInput] = useState(formatTelegramRecipientsInput(session.config.telegramRecipients));
  const [telegramDraftLabel, setTelegramDraftLabel] = useState('');
  const [telegramDraftChatId, setTelegramDraftChatId] = useState('');
  const [verifyingTelegramChat, setVerifyingTelegramChat] = useState(false);
  const [telegramVerification, setTelegramVerification] = useState<{ kind: 'success' | 'error'; message: string; result?: TelegramChatVerificationResult; } | null>(null);

  const [whatsappRecipientsInput, setWhatsappRecipientsInput] = useState(formatRecipientsInput(session.config.whatsappRecipients));
  const [connectingChannel, setConnectingChannel] = useState<PopupProvider | null>(null);
  const [disconnectingChannel, setDisconnectingChannel] = useState<PopupProvider | null>(null);
  const [pendingWhatsAppConnectionId, setPendingWhatsAppConnectionId] = useState('');
  const [pendingWhatsAppOptions, setPendingWhatsAppOptions] = useState<WhatsAppPhoneOption[]>([]);
  const [selectedWhatsAppPhoneId, setSelectedWhatsAppPhoneId] = useState('');

  const handleFailure = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);
    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }
    void showAlert({ title: 'Notice', description: message || fallbackMessage });
  }, [onAuthExpired, showAlert]);

  const handleAddTelegramRecipient = () => {
    const label = telegramDraftLabel.trim();
    const chatId = normalizeTelegramChatId(telegramDraftChatId);

    if (!label || !chatId) {
      void showAlert({ title: 'Notice', description: 'Enter a label and a valid Telegram target. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.' });
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
      void showAlert({ title: 'Notice', description: 'That Telegram chat is already saved.' });
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
      void showAlert({ title: 'Notice', description: 'Enter a valid Telegram target first. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.' });
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
      setTelegramVerification({ kind: 'error', message: 'Enter a valid Telegram target before verifying. Use @channelusername only for public channels or a numeric chat ID for people, private groups, and private channels.' });
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
        message: result.title ? `Verified ${result.title}${result.type ? ` (${result.type})` : ''}.` : result.username ? `Verified @${result.username}${result.type ? ` (${result.type})` : ''}.` : 'Telegram chat verified successfully.',
        result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to verify the Telegram chat.';
      if (isAuthErrorMessage(message)) {
        onAuthExpired();
        return;
      }
      setTelegramVerification({ kind: 'error', message });
    } finally {
      setVerifyingTelegramChat(false);
    }
  };

  const handleLinkedInConnection = async () => {
    if (!session.isAdmin) return;
    setConnectingChannel('linkedin');
    try {
      const message = await openOAuthPopup(() => api.startLinkedInAuth(idToken), 'linkedin');
      if (!message.ok) throw new Error(message.error || 'LinkedIn connection failed.');
      await onSaveConfig({});
      void showAlert({ title: 'Success', description: 'LinkedIn publishing is now connected through the Worker.' });
    } catch (error) {
      handleFailure(error, 'Failed to connect LinkedIn.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const handleInstagramConnection = async () => {
    if (!session.isAdmin) return;
    setConnectingChannel('instagram');
    try {
      const message = await openOAuthPopup(() => api.startInstagramAuth(idToken), 'instagram');
      if (!message.ok) throw new Error(message.error || 'Instagram connection failed.');
      await onSaveConfig({});
      void showAlert({ title: 'Success', description: 'Instagram publishing is now connected through the Worker.' });
    } catch (error) {
      handleFailure(error, 'Failed to connect Instagram.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const handleWhatsAppConnection = async () => {
    if (!session.isAdmin) return;
    setConnectingChannel('whatsapp');
    try {
      const message = await openOAuthPopup(() => api.startWhatsAppAuth(idToken), 'whatsapp');
      if (!message.ok) throw new Error(message.error || 'WhatsApp connection failed.');
      const nextOptions = message.payload?.options ?? [];
      const connectionId = message.payload?.connectionId || '';
      if (connectionId && nextOptions.length > 0) {
        setPendingWhatsAppConnectionId(connectionId);
        setPendingWhatsAppOptions(nextOptions);
        setSelectedWhatsAppPhoneId(nextOptions[0]?.phoneNumberId || '');
        return;
      }
      await onSaveConfig({});
      void showAlert({ title: 'Success', description: 'WhatsApp delivery is now connected through Meta and the Worker.' });
    } catch (error) {
      handleFailure(error, 'Failed to connect WhatsApp.');
    } finally {
      setConnectingChannel(null);
    }
  };

  const handleDisconnectChannel = async (provider: OAuthProvider) => {
    if (!session.isAdmin) return;
    const channelLabel = provider === 'linkedin' ? 'LinkedIn' : provider === 'instagram' ? 'Instagram' : 'WhatsApp';
    if (!await showConfirm({ title: 'Confirm', description: `Disconnect ${channelLabel}? This clears the stored connection in the Worker and requires OAuth approval the next time you connect it.` })) return;

    setDisconnectingChannel(provider);
    try {
      await api.disconnectChannelAuth(idToken, provider);
      if (provider === 'whatsapp') {
        setPendingWhatsAppConnectionId('');
        setPendingWhatsAppOptions([]);
        setSelectedWhatsAppPhoneId('');
      }
      await onSaveConfig({});
      void showAlert({ title: 'Success', description: `${channelLabel} was disconnected. OAuth approval is required before it can be used again.` });
    } catch (error) {
      handleFailure(error, `Failed to disconnect ${channelLabel}.`);
    } finally {
      setDisconnectingChannel(null);
    }
  };

  const completeWhatsAppPhoneSelection = async () => {
    if (!pendingWhatsAppConnectionId || !selectedWhatsAppPhoneId) {
      void showAlert({ title: 'Notice', description: 'Choose a WhatsApp phone number before saving this connection.' });
      return;
    }
    setConnectingChannel('whatsapp');
    try {
      await api.completeWhatsAppConnection(idToken, pendingWhatsAppConnectionId, selectedWhatsAppPhoneId);
      setPendingWhatsAppConnectionId('');
      setPendingWhatsAppOptions([]);
      setSelectedWhatsAppPhoneId('');
      await onSaveConfig({});
      void showAlert({ title: 'Success', description: 'WhatsApp delivery is now connected through Meta and the Worker.' });
    } catch (error) {
      handleFailure(error, 'Failed to finish the WhatsApp connection.');
    } finally {
      setConnectingChannel(null);
    }
  };

  return {
    selectedChannel,
    setSelectedChannel,
    recipientMode,
    setRecipientMode,
    selectedRecipientId,
    setSelectedRecipientId,
    manualRecipientId,
    setManualRecipientId,
    telegramRecipientsInput,
    setTelegramRecipientsInput,
    telegramDraftLabel,
    setTelegramDraftLabel,
    telegramDraftChatId,
    setTelegramDraftChatId,
    verifyingTelegramChat,
    telegramVerification,
    whatsappRecipientsInput,
    setWhatsappRecipientsInput,
    connectingChannel,
    disconnectingChannel,
    pendingWhatsAppConnectionId,
    pendingWhatsAppOptions,
    selectedWhatsAppPhoneId,
    setSelectedWhatsAppPhoneId,
    handleAddTelegramRecipient,
    handleRemoveTelegramRecipient,
    handleUseManualTelegramChat,
    handleVerifyTelegramChat,
    handleLinkedInConnection,
    handleInstagramConnection,
    handleWhatsAppConnection,
    handleDisconnectChannel,
    completeWhatsAppPhoneSelection,
  };
}
