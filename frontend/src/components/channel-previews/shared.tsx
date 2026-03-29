import type { ReactNode } from 'react';
import type { ChannelId } from '../../integrations/channels';
import { cn } from '../../lib/cn';

/** Responsive max-width for the LinkedIn feed card (wider on desktop). */
export function linkedInFeedCardWidthClass(sidebar: boolean, carousel: boolean, pickCarousel = false): string {
  if (sidebar) return 'w-full max-w-full';
  if (carousel && pickCarousel) return 'mx-auto w-full max-w-[min(100%,35rem)] sm:max-w-[37rem]';
  if (carousel) return 'w-full max-w-none';
  return cn(
    'mx-auto w-full max-w-[min(100%,44rem)]',
    'sm:max-w-[min(100%,48rem)]',
    'md:max-w-[min(100%,52rem)]',
    'lg:max-w-[56rem]',
  );
}

/** ~Phone-width Instagram mock; stays narrow on desktop. */
export function instagramPhoneCardWidthClass(sidebar: boolean, carousel: boolean): string {
  if (sidebar) return 'mx-auto w-full max-w-[260px]';
  if (carousel) return 'mx-auto w-full max-w-[min(100%,18rem)] sm:max-w-[17.5rem]';
  return cn(
    'mx-auto w-full max-w-[min(100%,20rem)]',
    'sm:max-w-[19rem]',
    'md:max-w-[17.5rem]',
    'lg:max-w-[18rem]',
  );
}

/** Chat bubble row: phone-ish width on all breakpoints. */
export function messagingBubbleMaxClass(sidebar: boolean): string {
  if (sidebar) return 'max-w-[min(100%,240px)]';
  return cn(
    'w-full max-w-[min(100%,17.5rem)]',
    'sm:max-w-[18rem]',
    'md:max-w-[16.5rem]',
    'lg:max-w-[17rem]',
  );
}

/** Full chat panel behind bubbles: narrow column on desktop like a phone screen. */
export function messagingChatPanelWidthClass(sidebar: boolean): string {
  if (sidebar) return 'w-full';
  return cn('mx-auto w-full', 'max-w-[min(100%,21rem)]', 'sm:max-w-[20rem]', 'md:max-w-[19rem]');
}

export const TAG_CLASS_BY_CHANNEL: Record<ChannelId, string> = {
  linkedin: 'font-medium text-[#0a66c2]',
  instagram: 'font-medium text-[#d62976]',
  telegram: 'font-medium text-[#229ED9]',
  whatsapp: 'font-medium text-[#128C7E]',
  gmail: 'font-medium text-[#EA4335]',
};

export function previewAuthorInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
  }
  const one = parts[0] ?? '?';
  return one.slice(0, 2).toUpperCase();
}

export function renderTaggedText(text: string, channel: ChannelId): ReactNode[] {
  const tagClass = TAG_CLASS_BY_CHANNEL[channel];
  return text.split('\n').flatMap((line, lineIndex) => {
    const segments = line.split(/([#@][\w-]+)/g);
    const nodes = segments.map((segment, segmentIndex) => {
      const isTag = /^([#@])[\w-]+$/.test(segment);
      if (!segment) return null;
      return isTag ? (
        <span key={`segment-${lineIndex}-${segmentIndex}`} className={tagClass}>
          {segment}
        </span>
      ) : (
        <span key={`segment-${lineIndex}-${segmentIndex}`}>{segment}</span>
      );
    });
    if (lineIndex === 0) return nodes;
    return [<br key={`break-${lineIndex}`} />, ...nodes];
  });
}
