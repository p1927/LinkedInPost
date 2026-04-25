/**
 * Visual tokens for the Fresh calendar — single source of truth.
 *
 * Surface palette is the lavender Fresh system from `variant-fresh.jsx`.
 * Status/channel colors live in their own files (statusStyles, channelStyles)
 * because they're shared with adapters and modals.
 */
export const CSC_TOKENS = {
  bg:           '#F8F5FF',
  surface:      '#FFFFFF',
  tint:         '#F3EEFC',
  tintWarm:     '#F6F1FA',
  todayTint:    '#EEE5FE',
  line:         '#E8E1F4',
  lineSoft:     '#EFEAF7',
  lineStrong:   '#D8CEEB',
  ink:          '#111113',
  ink2:         '#1C1C1E',
  muted:        '#6E6E73',
  mutedSoft:    '#A1A1A6',
  accent:       '#6B46E5',
  accentSoft:   '#EFE8FE',
  pastHatch:    'repeating-linear-gradient(45deg, #F4F0FA 0 6px, #FAFAFB 6px 12px)',
} as const;

export type CscTokens = typeof CSC_TOKENS;
