/**
 * engine/types.ts
 *
 * Single source of truth for all engine types.
 * Nothing in the engine imports types from elsewhere — all shared contracts live here.
 */

import type { LlmRef } from '@repo/llm-core';
import type { D1Database } from '@cloudflare/workers-types';

// ─────────────────────────────────────────────────────────────
// IMPORTANCE LEVELS  (solves the numeric-weight ambiguity problem)
// ─────────────────────────────────────────────────────────────

/**
 * Named importance levels replace ambiguous numeric weights (e.g. 0.7 vs 0.8).
 * Each level has a fixed, well-understood role in the generation brief:
 *
 *  critical   → node output becomes a primary directive; generator optimises for it
 *  important  → included with clear emphasis
 *  supporting → background context, not a primary directive
 *  background → one-line mention only
 *  off        → node is skipped entirely
 */
export type ImportanceLevel =
  | 'critical'
  | 'important'
  | 'supporting'
  | 'background'
  | 'off';

/** Numeric factor used when assembling the generation brief. */
export const IMPORTANCE_WEIGHT: Record<ImportanceLevel, number> = {
  critical:   1.0,
  important:  0.7,
  supporting: 0.4,
  background: 0.15,
  off:        0.0,
} as const;

// ─────────────────────────────────────────────────────────────
// DIMENSION WEIGHTS  (7 quality dimensions, each 0–100)
// ─────────────────────────────────────────────────────────────

export type DimensionName =
  | 'emotions'
  | 'psychology'
  | 'persuasion'
  | 'copywriting'
  | 'storytelling'
  | 'typography'
  | 'vocabulary';

/**
 * Per-dimension intensity sliders (0–100).
 * Missing keys mean "use the workflow default".
 * Values are converted to ImportanceLevel overrides in WorkflowRunner.
 */
export interface DimensionWeights {
  emotions?: number;
  psychology?: number;
  persuasion?: number;
  copywriting?: number;
  storytelling?: number;
  typography?: number;
  vocabulary?: number;
}

/**
 * Maps a slider value (0–100) to an ImportanceLevel.
 */
export function dimensionValueToImportance(value: number): ImportanceLevel {
  if (value <= 10) return 'off';
  if (value <= 30) return 'background';
  if (value <= 50) return 'supporting';
  if (value <= 80) return 'important';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────
// DELIVERY CHANNELS
// ─────────────────────────────────────────────────────────────

export type DeliveryChannel =
  | 'linkedin'
  | 'instagram'
  | 'telegram'
  | 'whatsapp'
  | 'gmail';

export interface ChannelConstraints {
  channel: DeliveryChannel;
  targetWordRange: { min: number; max: number };
  maxImages: number;
  linksAllowedInBody: boolean;
  supportsCarousel: boolean;
  formatNotes: string;
  /** The emotional contract this platform has with its audience. */
  platformContract: string;
}

export const CHANNEL_CONSTRAINTS_MAP: Record<DeliveryChannel, ChannelConstraints> = {
  linkedin: {
    channel: 'linkedin',
    targetWordRange: { min: 150, max: 250 },
    maxImages: 4,
    linksAllowedInBody: false,
    supportsCarousel: true,
    formatNotes:
      'No external links in body (put in first comment). PDF carousels achieve 6.6% engagement. Hook + Story + Lesson formula. Substantive questions as CTA.',
    platformContract:
      'peer-authority, professional aspiration, expertise validation, career growth',
  },
  instagram: {
    channel: 'instagram',
    targetWordRange: { min: 80, max: 150 },
    maxImages: 10,
    linksAllowedInBody: false,
    supportsCarousel: true,
    formatNotes:
      'No clickable links in caption. Carousel drives saves (strongest signal). First frame must stop the scroll.',
    platformContract:
      'inspiration, identity expression, aesthetic resonance, aspiration',
  },
  telegram: {
    channel: 'telegram',
    targetWordRange: { min: 200, max: 400 },
    maxImages: 10,
    linksAllowedInBody: true,
    supportsCarousel: false,
    formatNotes:
      'Links fully supported. Community and insider feel. Can go deeper than LinkedIn.',
    platformContract:
      'trust, insider knowledge, community belonging, intellectual depth',
  },
  whatsapp: {
    channel: 'whatsapp',
    targetWordRange: { min: 50, max: 100 },
    maxImages: 1,
    linksAllowedInBody: true,
    supportsCarousel: false,
    formatNotes:
      'Brief, direct, personal. No lists. Reads like a message from a trusted friend.',
    platformContract:
      'intimacy, direct utility, friend-level trust, immediate value',
  },
  gmail: {
    channel: 'gmail',
    targetWordRange: { min: 200, max: 800 },
    maxImages: 5,
    linksAllowedInBody: true,
    supportsCarousel: false,
    formatNotes:
      'Subject line is the hook. Deep reads welcome. Use subheadings for long content.',
    platformContract:
      'dedicated attention, depth, personal relationship, authority',
  },
};

// ─────────────────────────────────────────────────────────────
// NODE OUTPUT PAYLOAD TYPES
// ─────────────────────────────────────────────────────────────

export type PsychTriggerType =
  | 'fomo'
  | 'authority'
  | 'social_proof'
  | 'reciprocity'
  | 'curiosity'
  | 'identity'
  | 'urgency'
  | 'validation'
  | 'aspiration';

export interface PsychTrigger {
  type: PsychTriggerType;
  rationale: string;
  /** Concrete hint for how to apply this trigger in copy. */
  applicationHint: string;
}

export interface PsychologyAnalysis {
  audienceDescription: string;
  audienceAwarenessLevel:
    | 'problem_unaware'
    | 'problem_aware'
    | 'solution_aware'
    | 'product_aware';
  painPoints: string[];
  aspirations: string[];
  triggers: PsychTrigger[];
  dominantEmotion: string;
}

export interface ResearchFindings {
  keyFacts: string[];
  statistics: string[];
  trends: string[];
  credibilityHooks: string[];
  recencySignals: string[];
}

export interface VocabularySelection {
  powerWords: string[];
  avoidWords: string[];
  industryTerms: string[];
  toneMarkers: string[];
  /** Phrases from the author's past writing to mirror for voice consistency. */
  signaturePhrases: string[];
}

export type HookType =
  | 'contrarian'
  | 'data_point'
  | 'personal_story'
  | 'bold_question'
  | 'bold_claim';

export interface Hook {
  type: HookType;
  text: string;
  rationale: string;
  estimatedStopRate: 'low' | 'medium' | 'high';
}

export interface HookOptions {
  hooks: Hook[];
  /** Index into hooks[] that the node recommends. */
  recommendedIndex: number;
}

export type NarrativeArcType =
  | 'hook_story_lesson'
  | 'problem_agitate_solve'
  | 'before_after'
  | 'step_by_step'
  | 'contrarian_case';

export interface NarrativeSection {
  name: string;
  purpose: string;
  guidanceForWriter: string;
}

export interface NarrativeBlueprint {
  selectedHook: Hook;
  arc: NarrativeArcType;
  sections: NarrativeSection[];
  ctaType: 'question' | 'call_to_action' | 'reflection' | 'share_prompt';
  ctaText: string;
  targetWordCount: number;
}

export interface DraftVariant {
  /** 0-based index. */
  index: number;
  text: string;
  hookType: HookType;
  arcType: NarrativeArcType;
  wordCount: number;
  /** 1-2 sentence explanation of key creative choices made in this variant. */
  variant_rationale?: string;
}

export interface VariantValidation {
  index: number;
  wordCount: number;
  withinWordRange: boolean;
  issues: string[];
  /** Populated when the validator auto-corrected the variant. */
  adjustedText: string | null;
}

export interface ValidationReport {
  variants: VariantValidation[];
  allPassed: boolean;
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW CONTEXT  (the shared accumulator all nodes read/write)
// ─────────────────────────────────────────────────────────────

export interface ResearchArticleRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

/** The static inputs provided before any node runs. */
export interface WorkflowInput {
  runId: string;
  workflowId: string;
  topic: string;
  topicId: string;
  channel: DeliveryChannel;
  /** Free-text author profile used to calibrate voice. */
  authorProfile: string;
  /** Merged rules from topic → template → global hierarchy. */
  generationRules: string;
  researchArticles?: ResearchArticleRef[];
  /** Optional quality dimension weights (0–100 per dimension). Applied as importance overrides. */
  dimensionWeights?: DimensionWeights;
  /** Optional post type workflow ID (e.g., 'informational-news', 'personal-story'). */
  postType?: string;
  /** Whether this topic came from the author's own writing or external research. */
  sourceType?: 'author_note' | 'research' | 'news';
}

/** Typed slots for every node output. Null until the node runs. */
export interface WorkflowNodeOutputs {
  psychologyAnalysis: PsychologyAnalysis | null;
  researchFindings: ResearchFindings | null;
  vocabularySelection: VocabularySelection | null;
  hookOptions: HookOptions | null;
  narrativeBlueprint: NarrativeBlueprint | null;
  draftVariants: DraftVariant[] | null;
  calibratedVariants: DraftVariant[] | null;
  validationReport: ValidationReport | null;
}

export interface NodeRunRecord {
  nodeId: string;
  status: 'completed' | 'skipped' | 'failed';
  startedAt: number;
  durationMs: number;
  importance: ImportanceLevel;
  error?: string;
}

export interface NodeErrorRecord {
  nodeId: string;
  error: string;
  timestamp: number;
}

export interface WorkflowContext extends WorkflowInput {
  resolvedWorkflowId: string;
  channelConstraints: ChannelConstraints;
  /** nodeId → importance level for this workflow run. */
  importanceMap: Record<string, ImportanceLevel>;
  /** High-level directive from the resolved workflow, appended verbatim to the generation brief. */
  generationInstruction: string;
  nodeRunLog: NodeRunRecord[];
  errors: NodeErrorRecord[];
  outputs: WorkflowNodeOutputs;
}

/** Convenience initialiser — all output slots start null. */
export function createEmptyOutputs(): WorkflowNodeOutputs {
  return {
    psychologyAnalysis: null,
    researchFindings: null,
    vocabularySelection: null,
    hookOptions: null,
    narrativeBlueprint: null,
    draftVariants: null,
    calibratedVariants: null,
    validationReport: null,
  };
}

// ─────────────────────────────────────────────────────────────
// NODE SYSTEM
// ─────────────────────────────────────────────────────────────

/** Subset of WorkerEnv that engine nodes need for LLM calls. */
export type EngineEnv = {
  GEMINI_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MINIMAX_API_KEY?: string;
};

/** Context passed to LLM calls so usage is logged to llm_usage_log. Structurally compatible with GatewayUsageCtx. */
export interface EngineUsageCtx {
  db: D1Database;
  spreadsheetId: string;
  userId: string;
  settingKey: string;
}

export interface NodeRunEnvironment {
  env: EngineEnv;
  llmRef: LlmRef;
  fallbackLlmRef?: LlmRef;
  usageCtx?: EngineUsageCtx;
}

export interface NodeDefinition {
  /** Unique identifier in kebab-case. */
  id: string;
  name: string;
  description: string;
  /**
   * Documents which output slots this node reads — informational only, not enforced at runtime.
   * Execution ordering is controlled exclusively by dependsOn in workflow configs.
   */
  reads: ReadonlyArray<keyof WorkflowNodeOutputs>;
  /** The single output key this node writes. */
  writes: keyof WorkflowNodeOutputs;
  /**
   * Preferred model tier — informational only.
   * The runner currently passes a single llmRef to all nodes; tier-based routing is future work.
   */
  preferredModelTier: 'fast' | 'balanced' | 'powerful';
  run: (
    context: Readonly<WorkflowContext>,
    nodeEnv: NodeRunEnvironment,
    params: Record<string, unknown>,
  ) => Promise<Partial<WorkflowNodeOutputs>>;
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW SYSTEM
// ─────────────────────────────────────────────────────────────

export interface NodeWorkflowConfig {
  /** Must match a registered NodeDefinition.id. */
  nodeId: string;
  importance: ImportanceLevel;
  /** Node IDs that must complete before this one starts. */
  dependsOn: string[];
  /** Arbitrary params forwarded to NodeDefinition.run. */
  params?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  /** Creator goal this workflow optimises for (shown in UI). */
  optimizationTarget: string;
  /** Parent workflow ID — inherits all node configs; child configs override selectively. */
  extendsWorkflowId?: string;
  nodeConfigs: NodeWorkflowConfig[];
  /** Nodes to explicitly skip even if inherited from parent. */
  skipNodeIds?: string[];
  /** High-level directive appended verbatim to every generation brief. */
  generationInstruction: string;
}

/** Fully-resolved workflow after inheritance is applied. */
export interface ResolvedWorkflow {
  id: string;
  name: string;
  description: string;
  optimizationTarget: string;
  nodeConfigs: NodeWorkflowConfig[];
  generationInstruction: string;
  importanceMap: Record<string, ImportanceLevel>;
}

// ─────────────────────────────────────────────────────────────
// EXECUTION PLAN  (output of DagResolver)
// ─────────────────────────────────────────────────────────────

export interface ExecutionPhase {
  /** Sequential index (0 = first to run). */
  phase: number;
  /** Node IDs in this phase that run concurrently. */
  parallelNodeIds: string[];
}

export type ExecutionPlan = ExecutionPhase[];

// ─────────────────────────────────────────────────────────────
// LIFECYCLE EVENTS  (fired at boundaries, not between nodes)
// ─────────────────────────────────────────────────────────────

export type LifecycleEventType =
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:failed'
  | 'node:started'
  | 'node:completed'
  | 'node:skipped'
  | 'node:failed';

export interface WorkflowStartedEvent {
  type: 'workflow:started';
  runId: string;
  workflowId: string;
  resolvedWorkflowId: string;
  timestamp: number;
}

export interface WorkflowCompletedEvent {
  type: 'workflow:completed';
  runId: string;
  workflowId: string;
  context: WorkflowContext;
  durationMs: number;
  timestamp: number;
}

export interface WorkflowFailedEvent {
  type: 'workflow:failed';
  runId: string;
  workflowId: string;
  error: string;
  timestamp: number;
}

export interface NodeStartedEvent {
  type: 'node:started';
  runId: string;
  nodeId: string;
  phase: number;
  timestamp: number;
}

export interface NodeCompletedEvent {
  type: 'node:completed';
  runId: string;
  nodeId: string;
  durationMs: number;
  importance: ImportanceLevel;
  timestamp: number;
}

export interface NodeSkippedEvent {
  type: 'node:skipped';
  runId: string;
  nodeId: string;
  reason: string;
  timestamp: number;
}

export interface NodeFailedEvent {
  type: 'node:failed';
  runId: string;
  nodeId: string;
  error: string;
  timestamp: number;
}

export type LifecycleEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeSkippedEvent
  | NodeFailedEvent;

export type LifecycleEventHandler<T extends LifecycleEvent = LifecycleEvent> = (
  event: T,
) => void | Promise<void>;

// ─────────────────────────────────────────────────────────────
// GENERATION BRIEF  (assembled by GenerationBriefBuilder)
// ─────────────────────────────────────────────────────────────

export interface BriefSection {
  label: string;
  content: string;
  importance: ImportanceLevel;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API TYPES  (used by callers of engine/index.ts)
// ─────────────────────────────────────────────────────────────

export interface RunWorkflowOptions {
  input: WorkflowInput;
  env: EngineEnv;
  llmRef: LlmRef;
  fallbackLlmRef?: LlmRef;
  usageCtx?: EngineUsageCtx;
}

export interface RunWorkflowResult {
  runId: string;
  workflowId: string;
  context: WorkflowContext;
  variants: DraftVariant[];
  durationMs: number;
}
