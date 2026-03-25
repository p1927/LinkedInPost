export interface TelegramRecipient {
  label: string;
  chatId: string;
}

export function normalizeTelegramChatId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('@')) {
    return /^@[A-Za-z0-9_]{4,}$/.test(trimmed) ? trimmed : '';
  }

  const compact = trimmed.replace(/\s+/g, '');
  return /^-?\d+$/.test(compact) ? compact : '';
}

export function normalizeTelegramRecipients(recipients: unknown): TelegramRecipient[] {
  if (!Array.isArray(recipients)) {
    return [];
  }

  return recipients
    .filter((entry) => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      label: String((entry as TelegramRecipient).label || '').trim(),
      chatId: normalizeTelegramChatId(String((entry as TelegramRecipient).chatId || '')),
    }))
    .filter((entry) => entry.label && entry.chatId);
}

export function parseTelegramRecipientsInput(input: string): TelegramRecipient[] {
  const parsed = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawChatId] = line.split('|').map((part) => part.trim());
      const chatId = normalizeTelegramChatId(rawChatId || '');

      if (!rawLabel || !chatId) {
        throw new Error('Saved Telegram chats must use the format "Label | @channelusername" or "Label | -1001234567890".');
      }

      return {
        label: rawLabel,
        chatId,
      } satisfies TelegramRecipient;
    });

  return normalizeTelegramRecipients(parsed);
}

export function formatTelegramRecipientsInput(recipients: TelegramRecipient[]): string {
  return recipients.map((recipient) => `${recipient.label} | ${recipient.chatId}`).join('\n');
}

export function getTelegramDeliveryDescription(): string {
  return 'Sends the approved row directly to a Telegram chat through the Worker using a stored bot token.';
}

export function getTelegramDeliveryHint(): string {
  return 'Use a numeric chat ID for private groups or @channelusername for public channels that your bot can access.';
}