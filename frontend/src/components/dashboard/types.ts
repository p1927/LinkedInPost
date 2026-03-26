import { type ChannelId } from '../../integrations/channels';
import { type WhatsAppPhoneOption } from '../../services/backendApi';

export type PopupProvider = 'instagram' | 'linkedin' | 'whatsapp';
export type QueueFilter = 'all' | 'pending' | 'drafted' | 'approved' | 'published';
export type DashboardTab = 'overview' | 'queue' | 'delivery';

export interface OAuthPopupMessage {
  source: 'channel-bot-oauth';
  provider: PopupProvider;
  ok: boolean;
  error?: string;
  payload?: {
    connectionId?: string;
    options?: WhatsAppPhoneOption[];
  };
}

export interface RecipientOption {
  label: string;
  value: string;
}

export interface DeliverySummary {
  topic: string;
  channel: ChannelId;
  mediaMode: 'image' | 'text';
  recipientLabel: string;
}
