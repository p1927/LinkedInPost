export interface WhatsAppRecipient {
  label: string;
  phoneNumber: string;
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return `${hasPlusPrefix ? '+' : ''}${digits}`;
}

export function normalizeWhatsAppRecipients(recipients: unknown): WhatsAppRecipient[] {
  if (!Array.isArray(recipients)) {
    return [];
  }

  return recipients
    .filter((entry) => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      label: String((entry as WhatsAppRecipient).label || '').trim(),
      phoneNumber: normalizePhoneNumber(String((entry as WhatsAppRecipient).phoneNumber || '')),
    }))
    .filter((entry) => entry.label && entry.phoneNumber);
}

export function parseRecipientsInput(input: string): WhatsAppRecipient[] {
  const parsed = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawPhoneNumber] = line.split('|').map((part) => part.trim());
      const phoneNumber = normalizePhoneNumber(rawPhoneNumber || '');

      if (!rawLabel || !phoneNumber) {
        throw new Error('Saved WhatsApp recipients must use the format "Label | +15551234567".');
      }

      return {
        label: rawLabel,
        phoneNumber,
      } satisfies WhatsAppRecipient;
    });

  return normalizeWhatsAppRecipients(parsed);
}

export function formatRecipientsInput(recipients: WhatsAppRecipient[]): string {
  return recipients.map((recipient) => `${recipient.label} | ${recipient.phoneNumber}`).join('\n');
}