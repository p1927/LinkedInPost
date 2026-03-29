/**
 * Approximate platform UI colors / patterns for mock previews.
 * Sources: public brand guidelines (LinkedIn #0A66C2), Instagram iOS-style neutrals (#262626),
 * WhatsApp light chat (#ECE5DD, outgoing #DCF8C6), Telegram brand (#229ED9) + common default
 * light-theme bubble tones (Telegram Desktop theme keys: msgOutBg-style blues).
 */

export const LI = {
  feedBg: '#F3F2EF',
  card: '#FFFFFF',
  border: '#E0DFDC',
  text: '#000000',
  textMuted: '#666666',
  textSoft: '#595959',
  link: '#0A66C2',
  reactionLike: '#378FE9',
} as const;

export const IG = {
  bg: '#FFFFFF',
  text: '#262626',
  textMuted: '#8E8E8E',
  border: '#DBDBDB',
  icon: '#262626',
  separator: '#EFEFEF',
} as const;

export const TG = {
  brand: '#229ED9',
  /** Default-style outgoing bubble (light blue, not brand blue). */
  bubbleOut: '#E4F2F5',
  bubbleBorder: '#B8D8E8',
  wallpaperTop: '#9ECBE3',
  wallpaperBottom: '#7FB4D3',
  readCheck: '#4FAEED',
  text: '#000000',
} as const;

export const WA = {
  chatBg: '#ECE5DD',
  bubbleOut: '#DCF8C6',
  bubbleBorder: 'rgba(0,0,0,0.06)',
  text: '#303030',
  meta: '#667781',
  tickRead: '#53BDEB',
} as const;

/** Gmail web compose–adjacent neutrals (not an official palette). */
export const GM = {
  shell: '#f6f8fc',
  card: '#ffffff',
  border: '#dadce0',
  text: '#202124',
  muted: '#5f6368',
  blue: '#1a73e8',
  red: '#ea4335',
} as const;
