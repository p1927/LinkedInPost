import type { WorkspacePublishingHealth } from '../../workspace/WorkspaceChromeContext';

const ALL_SETTINGS_SECTIONS = [
  { id: 'settings-workspace-core', label: 'Workspace core' },
  { id: 'settings-llm', label: 'AI / LLM' },
  { id: 'settings-enrichment', label: 'Enrichment' },
  { id: 'settings-generate-posts', label: 'Generate Posts' },
  { id: 'settings-github-actions', label: 'GitHub Actions' },
  { id: 'settings-instagram', label: 'Instagram' },
  { id: 'settings-linkedin', label: 'LinkedIn' },
  { id: 'settings-telegram', label: 'Telegram' },
  { id: 'settings-whatsapp', label: 'WhatsApp' },
  { id: 'settings-gmail', label: 'Gmail' },
  { id: 'settings-news', label: 'News' },
  { id: 'settings-content-review', label: 'Content review' },
] as const;

export type SettingsSectionId = (typeof ALL_SETTINGS_SECTIONS)[number]['id'];

export type DashboardSettingsDrawerHandle = {
  scrollToSection: (id: SettingsSectionId) => void;
};

/** Maps Connections card rows to settings section ids (Jump to nav / scroll targets). */
export const PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID: Record<
  keyof WorkspacePublishingHealth,
  SettingsSectionId
> = {
  linkedin: 'settings-linkedin',
  instagram: 'settings-instagram',
  telegram: 'settings-telegram',
  whatsapp: 'settings-whatsapp',
  gmail: 'settings-gmail',
};

export { ALL_SETTINGS_SECTIONS };
