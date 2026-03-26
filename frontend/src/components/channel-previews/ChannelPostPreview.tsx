import type { ChannelId } from '../../integrations/channels';
import { InstagramChannelPreview } from './InstagramChannelPreview';
import { LinkedInChannelPreview } from './LinkedInChannelPreview';
import { TelegramChannelPreview } from './TelegramChannelPreview';
import type { ChannelPreviewProps } from './types';
import { WhatsAppChannelPreview } from './WhatsAppChannelPreview';

export type ChannelPostPreviewInputProps = Omit<ChannelPreviewProps, 'previewChannel'> & {
  previewChannel?: ChannelId;
};

export function ChannelPostPreview({ previewChannel = 'linkedin', ...rest }: ChannelPostPreviewInputProps) {
  const channel = previewChannel ?? 'linkedin';
  const props: ChannelPreviewProps = { ...rest, previewChannel: channel };

  switch (channel) {
    case 'instagram':
      return <InstagramChannelPreview {...props} />;
    case 'telegram':
      return <TelegramChannelPreview {...props} />;
    case 'whatsapp':
      return <WhatsAppChannelPreview {...props} />;
    case 'linkedin':
    default:
      return <LinkedInChannelPreview {...props} />;
  }
}
