// frontend/src/features/generation/builtInWorkflowCards.ts

export interface BuiltInWorkflowCard {
  id: string;
  name: string;
  description: string;
  /** 3 short trait strings shown as pills on the card */
  traits: [string, string, string];
  /** Tailwind color key for card accent */
  colorKey: 'violet' | 'amber' | 'emerald' | 'blue' | 'rose' | 'slate';
}

export const BUILT_IN_WORKFLOW_CARDS: BuiltInWorkflowCard[] = [
  {
    id: 'viral-story',
    name: 'Viral Story',
    description: 'Make people feel something and share it',
    traits: ['High emotion', 'Authentic voice', 'Narrative arc'],
    colorKey: 'rose',
  },
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Establish expert authority with evidence',
    traits: ['Research-heavy', 'Structured arc', 'Authority vocab'],
    colorKey: 'blue',
  },
  {
    id: 'engagement-trap',
    name: 'Engagement Driver',
    description: 'Drive comments and discussion in the first hour',
    traits: ['Aggressive hook', 'Strong CTA', 'Controversy'],
    colorKey: 'amber',
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Teach something clearly, step by step',
    traits: ['Strict structure', 'Data-backed', 'Clarity-first'],
    colorKey: 'emerald',
  },
  {
    id: 'personal-brand',
    name: 'Personal Brand',
    description: 'Raw creator voice, identity-defining content',
    traits: ['Max authenticity', 'Emotional depth', 'Personal lens'],
    colorKey: 'violet',
  },
  {
    id: 'personal-story',
    name: 'Personal Story',
    description: 'A single story that teaches a professional lesson',
    traits: ['Story-led', 'One clear lesson', 'Relatable'],
    colorKey: 'rose',
  },
  {
    id: 'informational-news',
    name: 'News & Insights',
    description: 'Timely take on industry news',
    traits: ['News hook', 'Your angle', 'Timely'],
    colorKey: 'blue',
  },
  {
    id: 'trend-commentary',
    name: 'Trend Commentary',
    description: 'Your perspective on a shifting industry trend',
    traits: ['Contrarian ok', 'Trend-aware', 'Expert take'],
    colorKey: 'blue',
  },
  {
    id: 'week-in-review',
    name: 'Week in Review',
    description: 'Weekly roundup with key takeaways',
    traits: ['List format', 'Curated', 'Consistent voice'],
    colorKey: 'slate',
  },
  {
    id: 'event-insight',
    name: 'Event Insight',
    description: 'Lessons and observations from an event',
    traits: ['Experiential', 'Specific detail', 'Transferable'],
    colorKey: 'emerald',
  },
  {
    id: 'satirical',
    name: 'Satirical',
    description: 'Sharp, funny take on an industry absurdity',
    traits: ['Humour-led', 'Punchy', 'Brave'],
    colorKey: 'amber',
  },
  {
    id: 'appreciation',
    name: 'Appreciation',
    description: 'Recognise someone or something with impact',
    traits: ['Specific praise', 'Warm tone', 'Story-backed'],
    colorKey: 'violet',
  },
  {
    id: 'base',
    name: 'Balanced',
    description: 'All dimensions at moderate — good default',
    traits: ['Balanced', 'Versatile', 'Reliable'],
    colorKey: 'slate',
  },
];

/** Cards shown first in the picker — reorder freely */
export const FEATURED_WORKFLOW_IDS = [
  'viral-story',
  'thought-leadership',
  'engagement-trap',
  'educational',
  'personal-brand',
];
