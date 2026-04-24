export type ChannelId = 'instagram' | 'linkedin' | 'telegram' | 'whatsapp' | 'gmail' | 'youtube';

export interface ChannelOption {
  value: ChannelId;
  label: string;
  description: string;
  requiresRecipient: boolean;
  publishVerb: string;
}

export const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    value: 'instagram',
    label: 'Instagram',
    description: 'Publish approved image posts directly through the Worker using Instagram Login',
    requiresRecipient: false,
    publishVerb: 'Publish to Instagram',
  },
  {
    value: 'linkedin',
    label: 'LinkedIn',
    description: 'Publish approved content directly through the Worker',
    requiresRecipient: false,
    publishVerb: 'Publish to LinkedIn',
  },
  {
    value: 'telegram',
    label: 'Telegram',
    description: 'Send approved posts directly to a Telegram chat through the Worker',
    requiresRecipient: true,
    publishVerb: 'Send via Telegram',
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    description: 'Send non-template WhatsApp messages through Meta Cloud API',
    requiresRecipient: true,
    publishVerb: 'Send via WhatsApp',
  },
  {
    value: 'gmail',
    label: 'Gmail',
    description: 'Send emails via Gmail API with custom To, CC, BCC, and Subject',
    requiresRecipient: false, // We'll manage recipients per-post
    publishVerb: 'Send via Gmail',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    description: 'Automate YouTube comment polling and auto-replies',
    requiresRecipient: false,
    publishVerb: 'YouTube Automations',
  },
];

export function getChannelLabel(channel: ChannelId): string {
  return CHANNEL_OPTIONS.find((option) => option.value === channel)?.label || channel;
}

export function getChannelOption(channel: ChannelId): ChannelOption {
  return CHANNEL_OPTIONS.find((option) => option.value === channel) || CHANNEL_OPTIONS[0];
}