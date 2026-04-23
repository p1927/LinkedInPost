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
  avoidWords: string[];
  registerLevel: string;
  toneWords: string[];
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
