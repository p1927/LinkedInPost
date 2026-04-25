/**
 * Channel display palette. Mirrors the colors used by `CscTopicEventCustom`
 * in the previous Schedule-X build so existing legend/badge UI elsewhere
 * stays visually consistent.
 */

export interface ChannelStyle {
  label: string;
  letter: string; // 2-char monogram for chips
  color: string;
}

export const CHANNEL_STYLES: Record<string, ChannelStyle> = {
  linkedin:  { label: 'LinkedIn',  letter: 'in', color: '#0A66C2' },
  instagram: { label: 'Instagram', letter: 'ig', color: '#E1306C' },
  telegram:  { label: 'Telegram',  letter: 'tg', color: '#2CA5E0' },
  whatsapp:  { label: 'WhatsApp',  letter: 'wa', color: '#25D366' },
  gmail:     { label: 'Gmail',     letter: 'gm', color: '#EA4335' },
  youtube:   { label: 'YouTube',   letter: 'yt', color: '#FF0000' },
};

const FALLBACK: ChannelStyle = { label: 'Channel', letter: '··', color: '#94A3B8' };

export function channelStyle(id?: string): ChannelStyle {
  if (!id) return FALLBACK;
  return CHANNEL_STYLES[id.toLowerCase()] ?? FALLBACK;
}
