import type { NewsletterConfigInput } from '../../schema/newsletterTypes';

export const NEWSLETTER_TEMPLATES = [
  { id: 'personal-story', name: 'Personal Story', description: 'Craft items into a first-person narrative' },
  { id: 'curated-digest', name: 'Curated Digest', description: 'Top picks with brief editorial commentary' },
  { id: 'theme-weekly', name: 'Theme of the Week', description: 'Weave items into a unified theme' },
  { id: 'expert-commentary', name: 'Expert Commentary', description: 'Present as expert analysis' },
] as const;

export const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

export const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'gmail', label: 'Email' },
] as const;

export const PREVIEW_CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
] as const;

export const EMOTION_OPTIONS = [
  { value: 'optimistic', label: 'Optimistic' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'provocative', label: 'Provocative' },
  { value: 'calm', label: 'Calm' },
] as const;

export const COLOR_OPTIONS = [
  { value: 'warm', label: 'Warm (reds, oranges)' },
  { value: 'cool', label: 'Cool (blues, greens)' },
  { value: 'neutral', label: 'Neutral (grays, whites)' },
  { value: 'vibrant', label: 'Vibrant (bold colors)' },
  { value: 'muted', label: 'Muted (pastels)' },
] as const;

export const STORY_OPTIONS = [
  { value: 'narrative', label: 'Narrative arc' },
  { value: 'listicle', label: 'Listicle style' },
  { value: 'commentary', label: 'Expert commentary' },
  { value: 'interview', label: 'Interview/Q&A' },
  { value: 'open-ended', label: 'Open-ended question' },
] as const;

export function emptyNewsletterConfig(): NewsletterConfigInput {
  return {
    rssEnabled: true,
    newsApiEnabled: false,
    customRssFeeds: [],
    itemCount: 5,
    scheduleDays: [],
    scheduleTimes: ['09:00'],
    scheduleFrequency: 'weekly',
    emailRecipients: [],
    subjectTemplate: 'Weekly Newsletter',
    channelTargets: [],
    processingTemplate: 'curated-digest',
    processingNote: '',
    emotionTarget: '',
    colorEmotionTarget: '',
    storyFramework: '',
    previewChannel: 'email',
    adminEmail: '',
  };
}
