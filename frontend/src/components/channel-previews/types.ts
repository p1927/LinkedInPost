import type { ChannelId } from '../../integrations/channels';

/** Props for every channel-specific post preview implementation. */
export interface ChannelPreviewProps {
  optionNumber: number;
  text: string;
  imageUrl?: string;
  /** When set (2+ typical), previews show multi-image layouts for the channel. */
  imageUrls?: string[];
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
  mode?: 'hero' | 'carousel';
  previewChannel: ChannelId;
  layout?: 'default' | 'sidebar';
  className?: string;
  forceExpanded?: boolean;
  pickMode?: boolean;
  previewAuthorName?: string;
  onOpenMedia?: () => void;
  /** Gmail compose-style header: To line (may include multiple addresses). */
  gmailTo?: string;
  /** Gmail compose-style header: subject line. */
  gmailSubject?: string;
  /** When true, hides the "Draft N / LinkedIn-style preview / Selected" header row (used in panel preview context where that info is already in the header). */
  hideVariantHeader?: boolean;
}
