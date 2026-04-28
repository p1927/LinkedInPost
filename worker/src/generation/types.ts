import type { DimensionWeights } from '../engine/types';

export type ManagedSheetName = 'Topics' | 'Draft' | 'Post';

export interface SheetRow {
  rowIndex: number;
  sourceSheet: ManagedSheetName;
  topicRowIndex?: number;
  /** Stable UUID assigned at topic creation time. Used as GCS image path prefix, routes, and D1 primary key. */
  topicId: string;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  imageLink1: string;
  imageLink2: string;
  imageLink3: string;
  imageLink4: string;
  selectedText: string;
  selectedImageId: string;
  /** Column T — JSON array of all selected image URLs when more than one; empty when single image (legacy: column M only). */
  selectedImageUrlsJson?: string;
  postTime: string;
  emailTo?: string;
  emailCc?: string;
  emailBcc?: string;
  emailSubject?: string;
  /** Column S — when non-empty, replaces workspace global generation rules for this topic. */
  topicGenerationRules?: string;
  /** Column U — optional PostTemplates sheet row id; used when column S is empty. */
  generationTemplateId?: string;
  /** Set when status is Published (D1); ISO timestamp. */
  publishedAt?: string;
  /** Column W — optional delivery channel override (linkedin, telegram, …); empty uses workspace default. */
  topicDeliveryChannel?: string;
  /**
   * Column X — optional generation model override. Plain model id (Gemini) or JSON `{"provider":"grok"|"gemini","model":"..."}` when multi-provider.
   */
  topicGenerationModel?: string;
  /** Content review fingerprint (hash of inputs). Empty when not yet reviewed. */
  contentReviewFingerprint?: string;
  /** ISO timestamp of last content review run. */
  contentReviewAt?: string;
  /** JSON blob: full content review report. */
  contentReviewJson?: string;
  /** Generation run ID from the generation worker. */
  generationRunId?: string;
  /** Primary pattern ID selected by the generation worker. */
  patternId?: string;
  /** Human-readable pattern name. */
  patternName?: string;
  /** Rationale for pattern selection. */
  patternRationale?: string;
}

export interface PostTemplate {
  id: string;
  name: string;
  rules: string;
}

export type GenerationScope = 'selection' | 'whole-post';

export interface TextSelectionRange {
  start: number;
  end: number;
  text: string;
}

export interface ResearchArticleRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

export interface GenerationRequestPayload {
  row: SheetRow;
  editorText: string;
  scope?: GenerationScope;
  selection?: TextSelectionRange | null;
  instruction?: string;
  googleModel?: string;
  /** Optional override; used when multi-provider LLM is enabled. */
  llm?: { provider?: string; model?: string };
  /** Optional news context from researcher (snippets + URLs). */
  researchArticles?: ResearchArticleRef[];
  /** Quality dimension weights (0–100 per dimension). */
  dimensionWeights?: DimensionWeights;
  /** Post type workflow ID. */
  postType?: string;
  /** Controls how much the AI rewrites the existing draft. Defaults to 'balanced'. */
  rewriteIntensity?: string;
}

export interface QuickChangePreviewResult {
  scope: GenerationScope;
  model: string;
  /** Provider used for this preview (default gemini). */
  llmProvider?: 'gemini' | 'grok' | 'openrouter' | 'minimax';
  selection: TextSelectionRange | null;
  replacementText: string;
  fullText: string;
}

export interface VariantPreviewResult {
  id: string;
  label: string;
  replacementText: string;
  fullText: string;
}

export interface VariantsPreviewResponse {
  scope: GenerationScope;
  model: string;
  llmProvider?: 'gemini' | 'grok' | 'openrouter' | 'minimax';
  selection: TextSelectionRange | null;
  variants: VariantPreviewResult[];
}

export interface GeminiModelsResponse {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}
