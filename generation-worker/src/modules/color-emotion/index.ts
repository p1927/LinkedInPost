import type { ColorSignal, EmotionSignal } from '../_shared/types';

// ---------------------------------------------------------------------------
// Emotion → Color Mapping
// ---------------------------------------------------------------------------

interface EmotionColorEntry {
  primary: string;
  secondary: string;
  palette: string[];
  mood: string;
}

const EMOTION_COLOR_MAP: Record<string, EmotionColorEntry> = {
  curiosity: {
    primary: '#FDD835',
    secondary: '#8E24AA',
    palette: ['#FDD835', '#8E24AA', '#FFF9C4', '#EDE7F6'],
    mood: 'inquisitive',
  },
  urgency: {
    primary: '#E53935',
    secondary: '#FB8C00',
    palette: ['#E53935', '#FB8C00', '#FFCDD2', '#FFE0B2'],
    mood: 'urgent',
  },
  awe: {
    primary: '#8E24AA',
    secondary: '#1E88E5',
    palette: ['#8E24AA', '#1E88E5', '#F3E5F5', '#E3F2FD'],
    mood: 'wondrous',
  },
  inspiration: {
    primary: '#8E24AA',
    secondary: '#FB8C00',
    palette: ['#8E24AA', '#FB8C00', '#F3E5F5', '#FFF3E0'],
    mood: 'uplifting',
  },
  frustration: {
    primary: '#E53935',
    secondary: '#212121',
    palette: ['#E53935', '#212121', '#FFCDD2', '#424242'],
    mood: 'tense',
  },
  anger: {
    primary: '#E53935',
    secondary: '#212121',
    palette: ['#E53935', '#212121', '#B71C1C', '#616161'],
    mood: 'intense',
  },
  fear: {
    primary: '#E53935',
    secondary: '#1E88E5',
    palette: ['#E53935', '#1E88E5', '#FFCDD2', '#E3F2FD'],
    mood: 'anxious',
  },
  hope: {
    primary: '#1E88E5',
    secondary: '#43A047',
    palette: ['#1E88E5', '#43A047', '#E3F2FD', '#E8F5E9'],
    mood: 'hopeful',
  },
  optimism: {
    primary: '#43A047',
    secondary: '#FDD835',
    palette: ['#43A047', '#FDD835', '#E8F5E9', '#FFFDE7'],
    mood: 'positive',
  },
  pride: {
    primary: '#8E24AA',
    secondary: '#212121',
    palette: ['#8E24AA', '#212121', '#F3E5F5', '#424242'],
    mood: 'confident',
  },
  surprise: {
    primary: '#FDD835',
    secondary: '#FB8C00',
    palette: ['#FDD835', '#FB8C00', '#FFFDE7', '#FFF3E0'],
    mood: 'excited',
  },
  empathy: {
    primary: '#1E88E5',
    secondary: '#43A047',
    palette: ['#1E88E5', '#43A047', '#E3F2FD', '#E8F5E9'],
    mood: 'warm',
  },
  fomo: {
    primary: '#FB8C00',
    secondary: '#E53935',
    palette: ['#FB8C00', '#E53935', '#FFF3E0', '#FFCDD2'],
    mood: 'eager',
  },
};

const DEFAULT_EMOTION_COLOR: EmotionColorEntry = {
  primary: '#1E88E5',
  secondary: '#43A047',
  palette: ['#1E88E5', '#43A047', '#E3F2FD', '#E8F5E9'],
  mood: 'neutral',
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function intensityToContrast(intensity: number): 'high' | 'medium' | 'subtle' {
  if (intensity >= 7) return 'high';
  if (intensity >= 4) return 'medium';
  return 'subtle';
}

function intensityToPaletteStrategy(intensity: number): string {
  if (intensity >= 7) return 'complementary';
  if (intensity >= 4) return 'analogous';
  return 'monochromatic';
}

// ---------------------------------------------------------------------------
// Primary Export
// ---------------------------------------------------------------------------

export function buildColorSignal(emotion: EmotionSignal): ColorSignal {
  const entry = EMOTION_COLOR_MAP[emotion.primaryEmotion] ?? DEFAULT_EMOTION_COLOR;
  const contrastLevel = intensityToContrast(emotion.intensity);
  const paletteStrategy = intensityToPaletteStrategy(emotion.intensity);

  return {
    primaryColor: entry.primary,
    secondaryColor: entry.secondary,
    palette: entry.palette,
    paletteStrategy,
    mood: entry.mood,
    contrastLevel,
  };
}
