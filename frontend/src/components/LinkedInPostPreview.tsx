import {
  ChannelPostPreview,
  type ChannelPostPreviewInputProps,
} from './channel-previews/ChannelPostPreview';

export type LinkedInPostPreviewProps = ChannelPostPreviewInputProps;

/**
 * Renders a channel-accurate post mock (LinkedIn feed, Instagram card, Telegram / WhatsApp bubbles).
 * Name is historical; routing is by `previewChannel` (defaults to LinkedIn).
 */
export function LinkedInPostPreview(props: LinkedInPostPreviewProps) {
  return <ChannelPostPreview {...props} />;
}
