import { type BadgeVariant } from '@/components/ui/badge';
import { type SheetRow } from '../../services/sheets';
import { type ChannelId } from '../../integrations/channels';
import { type BotConfig } from '../../services/configService';
import { parseTelegramRecipientsInput, type TelegramRecipient } from '../../integrations/telegram';
import { type PopupProvider, type OAuthPopupMessage, type RecipientOption } from './types';
import { type OAuthStartResult } from '../../services/backendApi';

export function buildRowActionKey(action: 'draft' | 'publish', row: SheetRow): string {
  return `${action}:${(row.topic || '').trim()}::${(row.date || '').trim()}`;
}

export function getNormalizedRowStatus(status?: string): string {
  return (status || '').trim().toLowerCase() || 'pending';
}

export function queueStatusToBadgeVariant(status?: string): BadgeVariant {
  switch (getNormalizedRowStatus(status)) {
    case 'pending':
      return 'pending';
    case 'drafted':
      return 'drafted';
    case 'approved':
      return 'approved';
    case 'published':
      return 'published';
    default:
      return 'neutral';
  }
}

export function canPreviewPublishedContent(row: SheetRow): boolean {
  const status = getNormalizedRowStatus(row.status);
  return status === 'approved' || status === 'published';
}

export function isSameTopicDate(left: SheetRow, right: SheetRow): boolean {
  return (left.topic || '').trim() === (right.topic || '').trim() && (left.date || '').trim() === (right.date || '').trim();
}

/** After createDraftFromPublished, pick the newest matching draft row (highest draft sheet index). */
export function findDraftRowAfterCreateFromPublished(
  rows: SheetRow[],
  sourcePublishedRow: SheetRow,
  selectedText: string,
): SheetRow | null {
  const topic = (sourcePublishedRow.topic || '').trim();
  const msg = selectedText.trim();
  if (!topic || !msg) return null;

  const candidates = rows.filter(
    (r) =>
      (r.topic || '').trim() === topic
      && getNormalizedRowStatus(r.status) === 'drafted'
      && (r.selectedText || '').trim() === msg
      && typeof r.draftRowIndex === 'number',
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) => ((r.draftRowIndex ?? 0) > (best.draftRowIndex ?? 0) ? r : best));
}

/** Single-line queue date for compact list rows (ISO yyyy-mm-dd or parseable string). */
export function formatQueueDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '—';

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return t;
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
        || (value as OAuthPopupMessage).provider === 'whatsapp'
        || (value as OAuthPopupMessage).provider === 'gmail')
  );
}

const OAUTH_POPUP_ABANDON_MS = 15 * 60 * 1000;

function tryReadPopupClosed(popup: Window): boolean | null {
  try {
    return popup.closed;
  } catch {
    // Google (and others) may use COOP so the opener cannot read popup state; rely on postMessage + timeout.
    return null;
  }
}

function tryClosePopup(popup: Window): void {
  try {
    popup.close();
  } catch {
    // COOP can block parent-driven close; the callback page already calls window.close().
  }
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
    let popupPoll = 0;
    let abandonTimer = 0;

    const handleMessage = (event: MessageEvent) => {
      if (settled) return;
      if (event.origin !== expectedOrigin || !isOAuthPopupMessage(event.data)) {
        return;
      }

      if (event.data.provider !== provider) {
        return;
      }

      cleanup();
      tryClosePopup(popup);
      resolve(event.data);
    };

    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(popupPoll);
      window.clearTimeout(abandonTimer);
      window.removeEventListener('message', handleMessage);
    };

    abandonTimer = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error('The connection timed out. Close any stuck popup and try again.'));
    }, OAUTH_POPUP_ABANDON_MS);

    popupPoll = window.setInterval(() => {
      if (settled) return;
      const closed = tryReadPopupClosed(popup);
      if (closed === true) {
        cleanup();
        reject(new Error('The connection popup was closed before the channel finished connecting.'));
      }
    }, 300);

    window.addEventListener('message', handleMessage);
  });
}
