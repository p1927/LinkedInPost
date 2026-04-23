import { z } from 'zod';

// -- Env --------------------------------------------------------------------
export interface Env {
  GEN_DB: D1Database;
  GEMINI_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  WORKER_SHARED_SECRET?: string;
  NEWSAPI_KEY?: string;
  GNEWS_API_KEY?: string;
  NEWSDATA_API_KEY?: string;
  SERPAPI_API_KEY?: string;
  PIXAZO_API_KEY?: string;
  SEEDANCE_API_KEY?: string;
  RESEARCHER_RSS_FEEDS?: string;
}

// -- Pattern pack -----------------------------------------------------------
export const PatternTagsSchema = z.object({
  channels: z.array(z.string()).default([]),
  audience: z.array(z.string()).default([]),
  tone: z.array(z.string()).default([]),
  jtbd: z.array(z.string()).default([]),
  factual: z.boolean().default(false),
});

export const PatternSchema = z.object({
  id: z.string().min(1),
  version: z.string().default('1.0.0'),
  name: z.string().min(1),
  tags: PatternTagsSchema,
  whenToUse: z.string().min(10, 'whenToUse must be descriptive (>=10 chars)'),
  outline: z.string().min(10),
  writerSnippet: z.string().min(5),
  fewShotLines: z.array(z.string()).default([]),
  maxPostChars: z.number().int().positive().optional(),
  imageHints: z.object({
    mood: z.string().default(''),
    searchKeywords: z.array(z.string()).default([]),
  }).optional(),
});

export const PatternPackSchema = z.object({
  packId: z.string().min(1),
  version: z.string().default('1.0.0'),
  description: z.string().default(''),
  patterns: z.array(PatternSchema).min(1),
});

export type PatternTags = z.infer<typeof PatternTagsSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type PatternPack = z.infer<typeof PatternPackSchema>;

// -- RequirementReport ------------------------------------------------------
export const RequirementReportSchema = z.object({
  channel: z.string().min(1),
  audience: z.string().default(''),
  tone: z.string().default(''),
  jtbd: z.string().default(''),
  factual: z.boolean().default(false),
  mustInclude: z.array(z.string()).default([]),
  mustAvoid: z.array(z.string()).default([]),
  cta: z.string().default(''),
  topic: z.string().default(''),
  contentSummary: z.string().default(''),
  optionalUrl: z.string().optional(),
  constraints: z.string().default(''),
});

export type RequirementReport = z.infer<typeof RequirementReportSchema>;

// -- ComposableAssets -------------------------------------------------------
export const ComposableAssetsSchema = z.object({
  brandContext: z.string().default(''),
  globalRules: z.string().default(''),
  fewShotExamples: z.string().default(''),
  reviewChecklist: z.array(z.string()).default([]),
  authorProfile: z.string().default(''),
});

export type ComposableAssets = z.infer<typeof ComposableAssetsSchema>;

// -- Generation request/response --------------------------------------------
export const GenerateRequestSchema = z.object({
  spreadsheetId: z.string().default(''),
  topic: z.string().min(1),
  channel: z.string().default('linkedin'),
  audience: z.string().default(''),
  tone: z.string().default(''),
  jtbd: z.string().default(''),
  factual: z.boolean().default(false),
  mustInclude: z.array(z.string()).default([]),
  mustAvoid: z.array(z.string()).default([]),
  cta: z.string().default(''),
  optionalUrl: z.string().optional(),
  constraints: z.string().default(''),
  newsWindowStart: z.string().optional(),
  newsWindowEnd: z.string().optional(),
  newsResearchConfig: z.any().optional(),
  composableAssets: ComposableAssetsSchema.optional(),
  preferPatternId: z.string().optional(),
  /** Optional override; otherwise first model from provider catalog (same as dashboard listLlmModels). */
  llm: z
    .object({
      provider: z.enum(['gemini', 'grok', 'openrouter', 'minimax']),
      model: z.string().min(1),
    })
    .optional(),
  skipImages: z.boolean().optional(),
  personaId: z.string().optional(),
  imageGen: z.object({
    provider: z.enum(['pixazo', 'gemini', 'seedance']).default('pixazo'),
    model: z.string().optional(),
  }).optional(),
  enrichmentSkills: z.array(z.object({
    id: z.string(),
    enabled: z.boolean().optional(),
  })).optional(),
  contextDocuments: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })).optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export type ImageGenProvider = 'pixazo' | 'gemini' | 'seedance';

export interface TextVariant {
  index: number;
  label: string;
  text: string;
}

export interface ImageCandidate {
  id: string;
  url?: string;
  searchQuery?: string;
  generationPrompt?: string;
  visualBrief: string;
  score: number;
  variantIndex?: number;
}

export interface PerVariantImageCandidates {
  variantIndex: number;
  candidates: ImageCandidate[];
}

export interface ReviewResult {
  passed: boolean;
  verdict: 'pass' | 'flag' | 'block';
  issues: string[];
  summary: string;
}

export interface NodeRunRecord {
  nodeId: string;
  inputJson: string;
  outputJson: string;
  model: string;
  durationMs: number;
  status: 'completed' | 'failed';
  error?: string;
}

export interface GenerateResponse {
  runId: string;
  requirementReport: RequirementReport;
  primaryPatternId: string;
  runnerUpPatternId: string;
  patternRationale: string;
  variants: TextVariant[];
  imageCandidates: ImageCandidate[];
  perVariantImageCandidates: PerVariantImageCandidates[];
  review: ReviewResult;
  trace: Record<string, unknown>;
  nodeRuns: NodeRunRecord[];
}

// -- Feedback ---------------------------------------------------------------
export const FeedbackRequestSchema = z.object({
  runId: z.string().min(1),
  selectedVariantIndex: z.number().int().min(0).optional(),
  finalText: z.string().default(''),
  selectedImageId: z.string().default(''),
  notes: z.string().default(''),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

// -- SuggestPattern ---------------------------------------------------------
export const SuggestPatternRequestSchema = z.object({
  topic: z.string().min(1),
  channel: z.string().default('linkedin'),
  audience: z.string().default(''),
  tone: z.string().default(''),
  jtbd: z.string().default(''),
  factual: z.boolean().default(false),
  contentSummary: z.string().default(''),
});

export type SuggestPatternRequest = z.infer<typeof SuggestPatternRequestSchema>;
