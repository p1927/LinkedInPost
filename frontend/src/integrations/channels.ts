export type ChannelId = 'linkedin' | 'whatsapp';

export interface ChannelOption {
  value: ChannelId;
  label: string;
  description: string;
  requiresRecipient: boolean;
  publishVerb: string;
}

export const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn',
    description: 'Publish approved content directly through the Worker',
    requiresRecipient: false,
    publishVerb: 'Publish to LinkedIn',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Send non-template WhatsApp messages through Meta Cloud API',
    requiresRecipient: true,
    publishVerb: 'Send via WhatsApp',
  },
];

export function getChannelLabel(channel: ChannelId): string {
  return CHANNEL_OPTIONS.find((option) => option.value === channel)?.label || channel;
}

export function getChannelOption(channel: ChannelId): ChannelOption {
  return CHANNEL_OPTIONS.find((option) => option.value === channel) || CHANNEL_OPTIONS[0];
}