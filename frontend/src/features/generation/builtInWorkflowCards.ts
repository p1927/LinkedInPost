// frontend/src/features/generation/builtInWorkflowCards.ts

export type DimensionKey =
  | 'emotions'
  | 'psychology'
  | 'persuasion'
  | 'copywriting'
  | 'storytelling'
  | 'typography'
  | 'vocabulary';

export const DIMENSION_KEYS: DimensionKey[] = [
  'emotions',
  'psychology',
  'persuasion',
  'copywriting',
  'storytelling',
  'typography',
  'vocabulary',
];

export interface BuiltInWorkflowCard {
  id: string;
  name: string;
  description: string;
  traits: [string, string, string];
  colorKey: 'violet' | 'amber' | 'emerald' | 'blue' | 'rose' | 'slate';
  dimensionWeights: Record<DimensionKey, number>;
}

export const BUILT_IN_WORKFLOW_CARDS: BuiltInWorkflowCard[] = [
  {
    id: 'viral-story',
    name: 'Viral Story',
    description: 'Narrative-driven posts with emotional pull designed to spread.',
    traits: ['Narrative', 'Emotional', 'Engaging'],
    colorKey: 'violet',
    dimensionWeights: { emotions: 80, psychology: 60, persuasion: 65, copywriting: 70, storytelling: 90, typography: 50, vocabulary: 55 },
  },
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Analytical takes that position you as a credible industry voice.',
    traits: ['Analytical', 'Authoritative', 'Insightful'],
    colorKey: 'blue',
    dimensionWeights: { emotions: 30, psychology: 80, persuasion: 70, copywriting: 65, storytelling: 50, typography: 60, vocabulary: 85 },
  },
  {
    id: 'engagement-trap',
    name: 'Engagement Driver',
    description: 'Hook-first posts engineered for comments and shares.',
    traits: ['Hook', 'Provocative', 'Interactive'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 70, psychology: 85, persuasion: 90, copywriting: 80, storytelling: 55, typography: 60, vocabulary: 60 },
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Clear, structured posts that teach something concrete.',
    traits: ['Clear', 'Structured', 'Informative'],
    colorKey: 'emerald',
    dimensionWeights: { emotions: 25, psychology: 55, persuasion: 50, copywriting: 80, storytelling: 45, typography: 70, vocabulary: 85 },
  },
  {
    id: 'personal-brand',
    name: 'Personal Brand',
    description: 'Consistent voice that reinforces your professional identity.',
    traits: ['Authentic', 'Consistent', 'Professional'],
    colorKey: 'violet',
    dimensionWeights: { emotions: 50, psychology: 65, persuasion: 60, copywriting: 70, storytelling: 60, typography: 65, vocabulary: 75 },
  },
  {
    id: 'personal-story',
    name: 'Personal Story',
    description: 'Vulnerable, first-person narratives that build connection.',
    traits: ['Vulnerable', 'Relatable', 'Human'],
    colorKey: 'rose',
    dimensionWeights: { emotions: 90, psychology: 50, persuasion: 35, copywriting: 55, storytelling: 85, typography: 45, vocabulary: 50 },
  },
  {
    id: 'informational-news',
    name: 'News & Insights',
    description: 'Timely, factual posts that surface important developments.',
    traits: ['Factual', 'Timely', 'Objective'],
    colorKey: 'slate',
    dimensionWeights: { emotions: 20, psychology: 45, persuasion: 40, copywriting: 75, storytelling: 40, typography: 70, vocabulary: 80 },
  },
  {
    id: 'trend-commentary',
    name: 'Trend Commentary',
    description: 'Opinionated takes on what is happening in your industry.',
    traits: ['Timely', 'Analytical', 'Opinionated'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 55, psychology: 80, persuasion: 75, copywriting: 70, storytelling: 50, typography: 55, vocabulary: 70 },
  },
  {
    id: 'week-in-review',
    name: 'Week in Review',
    description: 'Structured digest of key events or learnings from the week.',
    traits: ['Structured', 'Comprehensive', 'Digestible'],
    colorKey: 'blue',
    dimensionWeights: { emotions: 30, psychology: 50, persuasion: 45, copywriting: 75, storytelling: 55, typography: 85, vocabulary: 70 },
  },
  {
    id: 'event-insight',
    name: 'Event Insight',
    description: 'Experiential posts sharing observations from events you attended.',
    traits: ['Experiential', 'Observational', 'Contextual'],
    colorKey: 'emerald',
    dimensionWeights: { emotions: 65, psychology: 55, persuasion: 50, copywriting: 60, storytelling: 75, typography: 55, vocabulary: 60 },
  },
  {
    id: 'satirical',
    name: 'Satirical',
    description: 'Sharp, witty posts that entertain while making a point.',
    traits: ['Humorous', 'Sharp', 'Witty'],
    colorKey: 'rose',
    dimensionWeights: { emotions: 75, psychology: 70, persuasion: 55, copywriting: 80, storytelling: 65, typography: 50, vocabulary: 70 },
  },
  {
    id: 'appreciation',
    name: 'Appreciation',
    description: 'Warm posts celebrating people, milestones, or communities.',
    traits: ['Warm', 'Grateful', 'Connecting'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 90, psychology: 45, persuasion: 40, copywriting: 55, storytelling: 70, typography: 50, vocabulary: 55 },
  },
  {
    id: 'base',
    name: 'Balanced',
    description: 'A neutral baseline with equal weight across all dimensions.',
    traits: ['Balanced', 'Neutral', 'Versatile'],
    colorKey: 'slate',
    dimensionWeights: { emotions: 50, psychology: 50, persuasion: 50, copywriting: 50, storytelling: 50, typography: 50, vocabulary: 50 },
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
