import type { ChannelId } from '../../integrations/channels';

/** Props for every channel-specific post preview implementation. */
export interface ChannelPreviewProps {
  optionNumber: number;
  text: string;
  imageUrl?: string;
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
}
