import { type SheetRow } from '../../services/sheets';
import { type ChannelId } from '../../integrations/channels';
import { type BotConfig } from '../../services/configService';
import { parseTelegramRecipientsInput, type TelegramRecipient } from '../../integrations/telegram';
import { type PopupProvider, type OAuthPopupMessage, type RecipientOption } from './types';
import { type OAuthStartResult } from '../../services/backendApi';

export function buildRowActionKey(action: 'draft' | 'publish', row: SheetRow): string {
  return `${action}:${row.topic.trim()}::${row.date.trim()}`;
}

export function getNormalizedRowStatus(status?: string): string {
  return status?.trim().toLowerCase() || 'pending';
}

export function canPreviewPublishedContent(row: SheetRow): boolean {
  const status = getNormalizedRowStatus(row.status);
  return status === 'approved' || status === 'published';
}

export function isSameTopicDate(left: SheetRow, right: SheetRow): boolean {
  return left.topic.trim() === right.topic.trim() && left.date.trim() === right.date.trim();
}

export function getRecipientOptions(channel: ChannelId, config: BotConfig): RecipientOption[] {
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

export function getDefaultRecipientMode(channel: ChannelId, config: BotConfig): 'saved' | 'manual' {
  return getRecipientOptions(channel, config).length > 0 ? 'saved' : 'manual';
}

export function getDefaultRecipientValue(channel: ChannelId, config: BotConfig): string {
  return getRecipientOptions(channel, config)[0]?.value || '';
}

export function tryParseTelegramRecipients(input: string): TelegramRecipient[] {
  try {
    return parseTelegramRecipientsInput(input);
  } catch {
    return [];
  }
}

export function isOAuthPopupMessage(value: unknown): value is OAuthPopupMessage {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as OAuthPopupMessage).source === 'channel-bot-oauth'
      && ((value as OAuthPopupMessage).provider === 'instagram'
        || (value as OAuthPopupMessage).provider === 'linkedin'
        || (value as OAuthPopupMessage).provider === 'whatsapp')
  );
}

export async function openOAuthPopup(
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
