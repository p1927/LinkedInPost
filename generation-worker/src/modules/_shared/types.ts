import type { LlmRef } from '../../llmFromWorker';
import type { Env, Pattern, RequirementReport, TextVariant } from '../../types';

// ---------------------------------------------------------------------------
// Local Document — user-uploaded context document passed to enrichment modules
// ---------------------------------------------------------------------------
export interface LocalDocument {
  name: string;
  content: string;
  mimeType?: string;
}

// ---------------------------------------------------------------------------
// Module Context — passed to every module's enrich() function
// ---------------------------------------------------------------------------
export interface ModuleContext {
  report: RequirementReport;
  persona: PersonaSignal | null;
  pattern: Pattern;
  channel: string;
  topic: string;
  env: Env;
  llmRef: LlmRef;
  localDocuments?: LocalDocument[];
}

// ---------------------------------------------------------------------------
// Module Interface — every module exports this shape
// ---------------------------------------------------------------------------
export interface EnrichmentModule<T> {
  name: string;
  enrich(ctx: ModuleContext): Promise<T>;
}

// ---------------------------------------------------------------------------
// Signal Types
// ---------------------------------------------------------------------------
export interface PersonaSignal {
  id: string;
  name: string;
  concerns: string[];
  ambitions: string[];
  currentFocus: string;
  habits: string[];
  language: string;
  decisionDrivers: string[];
  painPoints: string[];
}

export interface EmotionSignal {
  primaryEmotion: string;
  secondaryEmotion: string;
  intensity: number;
  arc: string;
  emotionalHook: string;
}

export interface PsychologySignal {
  maslowLevel: string;
  primaryBias: string;
  secondaryBias: string;
  motivationType: string;
  behavioralTrigger: string;
  psychologicalFrame: string;
}

export interface PersuasionSignal {
  framework: string;
  frameworkSteps: string[];
  principles: string[];
  objectionPreempt: string;
  proofType: string;
}

export interface CopySignal {
  hookType: string;
  hookExample: string;
  powerWords: string[];
  ctaStyle: string;
  ctaPhrase: string;
  readabilityTarget: string;
  sentenceRhythm: string;
}

export interface StorySignal {
  structure: string;
  protagonist: string;
  devices: string[];
  tensionPoint: string;
  resolution: string;
}

export interface TypographySignal {
  lineBreakStrategy: string;
  whitespaceRatio: string;
  emojiUsage: string;
  formattingElements: string[];
  maxLineLength: number;
  fontWeight: string;
}

export interface ColorSignal {
  primaryColor: string;
  secondaryColor: string;
  palette: string[];
  paletteStrategy: string;
  mood: string;
  contrastLevel: string;
}

export interface ImageStrategySignal {
  visualStyle: string;
  composition: string;
  subjectMatter: string;
  searchQueries: string[];
  generationPrompt: string;
  textOverlayZone: string;
}

export interface ViralPatternSignal {
  matchedPatterns: string[];
  engagementPredictors: string[];
  shareabilityScore: number;
  commentBaitScore: number;
  platformAlgoFit: number;
}

export interface StickinessSignal {
  simpleScore: number;
  unexpectedScore: number;
  concreteScore: number;
  credibleScore: number;
  emotionalScore: number;
  storyScore: number;
  totalScore: number;
  weakestDimension: string;
  improvementHint: string;
}

export interface ChannelFormattedOutput {
  formattedText: string;
  hashtags: string[];
  characterCount: number;
  truncationApplied: boolean;
  platformNotes: string[];
}

export interface VocabularySignal {
  industryTerms: string[];
  powerPhrases: string[];
  /** Alias for powerPhrases — matches VocabularySelection.powerWords in worker engine. */
  powerWords: string[];
  avoidWords: string[];
  registerLevel: string;
  toneWords: string[];
  /** Alias for toneWords — matches VocabularySelection.toneMarkers in worker engine. */
  toneMarkers: string[];
  /** Phrases from the author's past writing to mirror for voice consistency. */
  signaturePhrases: string[];
  jargonBudget: number;
}

export interface TrendingSignal {
  trendingTopics: string[];
  buzzwords: string[];
  genZSlang: string[];
  culturalReferences: string[];
  timelySuggestion: string;
  trendConfidence: number;
}

// ---------------------------------------------------------------------------
// Enrichment Bundle — merged output of all enrichment modules
// ---------------------------------------------------------------------------
export interface EnrichmentBundle {
  persona: PersonaSignal;
  emotion: EmotionSignal;
  psychology: PsychologySignal;
  persuasion: PersuasionSignal;
  copy: CopySignal;
  story: StorySignal;
  typography: TypographySignal;
  color: ColorSignal;
  imageStrategy: ImageStrategySignal;
  vocabulary: VocabularySignal;
  trending: TrendingSignal;
}

// ---------------------------------------------------------------------------
// Enriched Variant Types — output of Creator + Selector
// ---------------------------------------------------------------------------
export interface EnrichedTextVariant extends TextVariant {
  emphasisGroup: string;
  signalWeights: Record<string, number>;
  hookType: string;
  persuasionFramework: string;
  emotionalArc: string;
}

export interface VariantScores {
  stickiness: number;
  viralPotential: number;
  personaFit: number;
  emotionalImpact: number;
  weightedTotal: number;
  rationale: string;
}

export interface ScoredVariant extends EnrichedTextVariant {
  scores: VariantScores;
}

// ---------------------------------------------------------------------------
// Hashtag Extraction — top 5 hashtags derived from variant content
// ---------------------------------------------------------------------------
export interface HashtagExtractionResult {
  /** All hashtags found across variants with occurrence counts */
  allHashtags: Array<{ tag: string; count: number }>;
  /** Top 5 hashtags by frequency (excluding stop words) */
  topHashtags: string[];
}

/**
 * Extract top 5 hashtags from text variants using keyword frequency analysis.
 * Excludes common English stop words.
 */
export function extractHashtagsFromVariants(
  variants: TextVariant[],
  topN: number = 5,
): HashtagExtractionResult {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
    'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
    'there', 'then', 'once', 'if', 'because', 'until', 'while', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'any', 'new', 'get', 'make', 'go', 'know', 'take', 'see',
    'come', 'think', 'look', 'want', 'give', 'use', 'find', 'tell', 'ask',
  ]);

  const wordCounts = new Map<string, number>();

  for (const variant of variants) {
    // Extract words from text, removing punctuation and splitting
    const words = variant.text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      // Capitalize for hashtag format
      const hashtag = word.charAt(0).toUpperCase() + word.slice(1);
      wordCounts.set(hashtag, (wordCounts.get(hashtag) ?? 0) + 1);
    }

    // Also count suggested hashtags from variant if present
    if (variant.suggestedHashtags) {
      for (const tag of variant.suggestedHashtags) {
        const normalized = tag.replace(/^#/, '').trim();
        if (normalized.length > 0) {
          wordCounts.set(normalized, (wordCounts.get(normalized) ?? 0) + 1);
        }
      }
    }
  }

  // Sort by count descending, then alphabetically
  const sorted = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const allHashtags = sorted.map(([tag, count]) => ({ tag, count }));
  const topHashtags = sorted.slice(0, topN).map(([tag]) => tag);

  return { allHashtags, topHashtags };
}
