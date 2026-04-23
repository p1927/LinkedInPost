import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Activity,
  CheckCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { LlmProviderId } from '@repo/llm-core';
import type { GoogleModelOption } from '../services/configService';
import type { AppSession, BackendApi, NodeRunItem } from '../services/backendApi';
import type { SheetRow } from '../services/sheets';
import { cn } from '../lib/cn';

type LlmCatalog = Array<{ id: LlmProviderId; name: string; models: GoogleModelOption[] }>;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  label: string;
  type: 'trigger' | 'llm' | 'output';
  settingKey?: string;
  description: string;
  promptTemplate: string;
  group?: string;
}

interface NodeRun {
  nodeId: string;
  input: string;
  output: string;
  model: string;
  durationMs: number;
  status: 'completed' | 'failed';
  error?: string;
}

interface TopicRun {
  id: string;
  topicId: string;
  topic: string;
  runAt: string;
  status: 'completed';
  /** Populated after fetch */
  nodeRuns?: NodeRun[];
}

interface TopicGroup {
  topicId: string;
  topic: string;
  runs: TopicRun[];
}

// ─── FLOW_NODES ────────────────────────────────────────────────────────────────

const FLOW_NODES: FlowNode[] = [
  {
    id: 'topic_created',
    label: 'Topic Created',
    type: 'trigger',
    description: 'A topic row is added to the Google Sheet. This triggers the enrichment and generation pipeline.',
    promptTemplate: '(No LLM call — this is the input trigger)',
  },
  {
    id: 'enrichment_persona',
    label: 'Persona Enrichment',
    type: 'llm',
    settingKey: 'enrichment_persona',
    group: 'enrichment',
    description: 'Analyzes the topic and injects a persona-aware perspective into the content generation context.',
    promptTemplate: `You are a content strategist specializing in LinkedIn thought leadership.

Given the following topic:
{{topic}}

Define a compelling persona angle that a professional in {{industry}} would find authentic and relatable.
Return a JSON object with: { angle, voiceTone, targetAudience }`,
  },
  {
    id: 'enrichment_emotion',
    label: 'Emotion Enrichment',
    type: 'llm',
    settingKey: 'enrichment_emotion',
    group: 'enrichment',
    description: 'Identifies the core emotional hooks that will make the post resonate with the audience.',
    promptTemplate: `Analyze the emotional landscape of this LinkedIn post topic:
{{topic}}

Identify 2-3 primary emotions that would resonate with the target professional audience.
Return JSON: { primaryEmotion, secondaryEmotions: [], emotionalHook }`,
  },
  {
    id: 'enrichment_psychology',
    label: 'Psychology Enrichment',
    type: 'llm',
    settingKey: 'enrichment_psychology',
    group: 'enrichment',
    description: 'Applies psychological principles (cognitive biases, social proof, etc.) to strengthen post impact.',
    promptTemplate: `Apply behavioral psychology principles to enhance engagement for this topic:
{{topic}}

Identify relevant psychological triggers: social proof, scarcity, authority, reciprocity, commitment.
Return JSON: { primaryTrigger, applicationStrategy, biasesToLeverage: [] }`,
  },
  {
    id: 'enrichment_persuasion',
    label: 'Persuasion Enrichment',
    type: 'llm',
    settingKey: 'enrichment_persuasion',
    group: 'enrichment',
    description: 'Structures the persuasion framework — problem, agitation, solution, call-to-action.',
    promptTemplate: `Create a persuasion framework for this LinkedIn post topic:
{{topic}}

Using the PAS (Problem-Agitation-Solution) or AIDA model, outline the persuasive arc.
Return JSON: { model, problem, agitation, solution, cta }`,
  },
  {
    id: 'enrichment_copywriting',
    label: 'Copywriting Enrichment',
    type: 'llm',
    settingKey: 'enrichment_copywriting',
    group: 'enrichment',
    description: 'Generates high-impact copywriting hooks, headlines, and opening lines.',
    promptTemplate: `Generate copywriting elements for this LinkedIn post topic:
{{topic}}

Create 3 powerful opening hooks and a memorable headline.
Return JSON: { headline, hooks: [], powerWords: [], closingLine }`,
  },
  {
    id: 'enrichment_storytelling',
    label: 'Storytelling Enrichment',
    type: 'llm',
    settingKey: 'enrichment_storytelling',
    group: 'enrichment',
    description: 'Builds a narrative arc with conflict, transformation, and resolution.',
    promptTemplate: `Build a storytelling structure for this LinkedIn post topic:
{{topic}}

Create a story arc with: situation, conflict, turning point, resolution, and lesson learned.
Return JSON: { protagonist, situation, conflict, turningPoint, resolution, lesson }`,
  },
  {
    id: 'enrichment_image_strategy',
    label: 'Image Strategy',
    type: 'llm',
    settingKey: 'enrichment_image_strategy',
    group: 'enrichment',
    description: 'Recommends visual strategy and image generation prompts for the post.',
    promptTemplate: `Create an image strategy for this LinkedIn post topic:
{{topic}}

Recommend the visual approach, composition, color palette, and mood.
Return JSON: { concept, composition, palette, mood, imagePrompt }`,
  },
  {
    id: 'enrichment_vocabulary',
    label: 'Vocabulary Enrichment',
    type: 'llm',
    settingKey: 'enrichment_vocabulary',
    group: 'enrichment',
    description: 'Selects domain-specific vocabulary and power words that elevate professional credibility.',
    promptTemplate: `Enhance vocabulary for this LinkedIn post topic:
{{topic}}

Select industry-specific terms, power words, and phrases that convey expertise without jargon overload.
Return JSON: { powerWords: [], industryTerms: [], phrasesToAvoid: [], suggestedPhrases: [] }`,
  },
  {
    id: 'enrichment_trending',
    label: 'Trending Enrichment',
    type: 'llm',
    settingKey: 'enrichment_trending',
    group: 'enrichment',
    description: 'Identifies current trends, hashtags, and timely angles to maximize reach.',
    promptTemplate: `Identify trending angles for this LinkedIn post topic:
{{topic}}

Find relevant current trends, hashtag opportunities, and timely hooks.
Return JSON: { trendingAngle, relevantHashtags: [], timingOpportunity, trendingReference }`,
  },
  {
    id: 'review_generation',
    label: 'Review Generation',
    type: 'llm',
    settingKey: 'review_generation',
    description: 'Generates the initial post draft by combining all enrichment signals and applying brand rules.',
    promptTemplate: `You are a LinkedIn content creator. Generate a compelling post draft.

Topic: {{topic}}
Enrichment signals: {{enrichment_context}}
Brand rules: {{rules}}

Write a LinkedIn post (150-300 words) that:
- Opens with a powerful hook
- Tells a story or shares insight
- Ends with a clear call to action
- Uses appropriate line breaks for readability

Return the post text only.`,
  },
  {
    id: 'generation_worker',
    label: 'Generation Worker',
    type: 'llm',
    settingKey: 'generation_worker',
    description: 'Processes generation requests from the queue, applies final formatting, and produces post variants.',
    promptTemplate: `Generate {{count}} variations of this LinkedIn post:

Base draft: {{draft}}
Style preferences: {{style}}
Channel: {{channel}}

For each variant, apply different:
- Opening hook styles (question, statement, story, statistic)
- Tone variations (formal, conversational, bold)
- Length variations (short/punchy vs detailed)

Return JSON array of post variants.`,
  },
  {
    id: 'content_review_text',
    label: 'Content Review (Text)',
    type: 'llm',
    settingKey: 'content_review_text',
    description: 'Reviews post content for quality, compliance, brand alignment, and engagement potential.',
    promptTemplate: `Review this LinkedIn post for quality and brand alignment:

Post: {{post_text}}
Brand guidelines: {{guidelines}}
Rules: {{rules}}

Evaluate:
1. Brand voice consistency (1-10)
2. Engagement potential (1-10)
3. Compliance check (flags any issues)
4. Improvement suggestions

Return JSON: { scores, flags: [], suggestions: [], approved: boolean }`,
  },
  {
    id: 'content_review_vision',
    label: 'Content Review (Vision)',
    type: 'llm',
    settingKey: 'content_review_vision',
    description: 'Analyzes post images for brand consistency, quality, and visual appeal.',
    promptTemplate: `Analyze this LinkedIn post image for quality and brand fit:

[Image provided as base64]
Brand guidelines: {{guidelines}}

Evaluate:
1. Visual quality and composition (1-10)
2. Brand consistency (1-10)
3. Text readability if applicable
4. Any compliance concerns

Return JSON: { scores, issues: [], approved: boolean, suggestions: [] }`,
  },
  {
    id: 'post_published',
    label: 'Post Published',
    type: 'output',
    description: 'The approved post is published to the configured channels (LinkedIn, Instagram, Telegram, etc.).',
    promptTemplate: '(No LLM call — this is the final output step)',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getNodeColor(node: FlowNode) {
  if (node.type === 'trigger') return 'bg-violet-100 border-violet-300 text-violet-800';
  if (node.type === 'output') return 'bg-emerald-100 border-emerald-300 text-emerald-800';
  if (node.group === 'enrichment') return 'bg-blue-50 border-blue-200 text-blue-800';
  return 'bg-amber-50 border-amber-200 text-amber-800';
}

function getLlmLabel(settingKey: string | undefined, session: AppSession): string {
  if (!settingKey) return '';
  const llmSettings = session.config.llmSettings as Record<string, { provider: string; model: string }> | undefined;
  const saved = llmSettings?.[settingKey];
  if (!saved) {
    const llm = session.config.llm as { primary?: { provider: string; model: string } } | undefined;
    const primary = llm?.primary;
    if (primary?.provider && primary?.model) return `${primary.provider} / ${primary.model} (primary)`;
    return 'Using primary LLM';
  }
  return `${saved.provider} / ${saved.model}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function mapNodeRunItems(items: NodeRunItem[]): NodeRun[] {
  return items.map(item => ({
    nodeId: item.node_id,
    input: (() => {
      try { return JSON.stringify(JSON.parse(item.input_json), null, 2); } catch { return item.input_json; }
    })(),
    output: (() => {
      try { return JSON.stringify(JSON.parse(item.output_json), null, 2); } catch { return item.output_json; }
    })(),
    model: item.model,
    durationMs: item.duration_ms,
    status: (item.status === 'failed' ? 'failed' : 'completed') as 'completed' | 'failed',
    error: item.error ?? undefined,
  }));
}

// ─── Real data mapping ─────────────────────────────────────────────────────────

function buildTopicGroups(rows: SheetRow[]): TopicGroup[] {
  return rows
    .filter(r => r.variant1?.trim())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(row => ({
      topicId: row.topicId,
      topic: row.topic,
      runs: [{
        id: row.topicId,
        topicId: row.topicId,
        topic: row.topic,
        runAt: row.date,
        status: 'completed' as const,
      }],
    }));
}

// ─── DraggableCanvas ───────────────────────────────────────────────────────────

function DraggableCanvas({ children, resetKey }: { children: React.ReactNode; resetKey: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => { setPos({ x: 0, y: 0 }); }, [resetKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPos(p => ({ x: p.x + dx, y: p.y + dy }));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div
      className="relative flex-1 min-w-0 overflow-hidden rounded-xl border border-border bg-canvas cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Arrow ─────────────────────────────────────────────────────────────────────

function Arrow({ horizontal = false }: { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <div className="flex items-center">
        <div className="h-0.5 w-6 bg-border" />
        <div className="border-y-4 border-l-4 border-y-transparent border-l-border" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-6 bg-border" />
      <div className="border-x-4 border-t-4 border-x-transparent border-t-border" />
    </div>
  );
}

// ─── NodeCard ──────────────────────────────────────────────────────────────────

function NodeCard({ node, isSelected, hasRunData, onClick }: {
  node: FlowNode;
  isSelected: boolean;
  hasRunData: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-center shadow-sm transition-all duration-150 hover:shadow-md cursor-pointer min-w-[140px]',
        getNodeColor(node),
        isSelected && 'ring-2 ring-offset-2 ring-primary shadow-lg scale-105',
      )}
    >
      <span className="text-xs font-semibold leading-snug">{node.label}</span>
      {node.type === 'llm' && (
        <span className="text-[10px] opacity-60 font-medium">LLM call</span>
      )}
      {hasRunData && (
        <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
      )}
    </button>
  );
}

// ─── RunsPanel ─────────────────────────────────────────────────────────────────

function RunsPanel({
  topicGroups,
  selectedRunId,
  onSelectRun,
  isOpen,
  onToggle,
  isEmpty,
  hasPendingOnly,
  loadingTopicId,
}: {
  topicGroups: TopicGroup[];
  selectedRunId: string | null;
  onSelectRun: (run: TopicRun) => void;
  isOpen: boolean;
  onToggle: () => void;
  isEmpty: boolean;
  hasPendingOnly: boolean;
  loadingTopicId: string | null;
}) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    new Set([topicGroups[0]?.topicId]),
  );

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center gap-3 border-r border-border bg-surface px-3 py-4 shrink-0 w-12">
        <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-ink transition-colors" title="Open runs panel">
          <ChevronRight className="h-4 w-4" />
        </button>
        <Activity className="h-4 w-4 text-muted mt-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-border bg-surface shrink-0 w-64">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted" />
          <span className="text-sm font-semibold text-ink">Pipeline Runs</span>
        </div>
        <button type="button" onClick={onToggle} className="rounded-lg p-1 text-muted hover:bg-border/40 hover:text-ink transition-colors" title="Collapse">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isEmpty ? (
          <div className="px-4 py-6 text-center">
            <Activity className="h-8 w-8 text-muted/40 mx-auto mb-2" />
            <p className="text-xs font-medium text-muted">No topics yet</p>
            <p className="text-[10px] text-muted/70 mt-1">Add topics to your Google Sheet to start generating posts.</p>
          </div>
        ) : hasPendingOnly ? (
          <div className="px-4 py-6 text-center">
            <Clock className="h-8 w-8 text-muted/40 mx-auto mb-2" />
            <p className="text-xs font-medium text-muted">No completed runs</p>
            <p className="text-[10px] text-muted/70 mt-1">Topics exist but none have been generated yet.</p>
          </div>
        ) : (
          topicGroups.map((group) => {
            const isExpanded = expandedTopics.has(group.topicId);
            const hasSelected = group.runs.some(r => r.id === selectedRunId);
            const isLoading = loadingTopicId === group.topicId;

            return (
              <div key={group.topicId}>
                <button
                  type="button"
                  onClick={() => {
                    toggleTopic(group.topicId);
                    if (group.runs[0]) onSelectRun(group.runs[0]);
                  }}
                  className={cn(
                    'w-full flex items-start gap-2 px-4 py-2.5 text-left hover:bg-border/30 transition-colors',
                    hasSelected && 'bg-primary/5',
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {isLoading
                      ? <Loader2 className="h-3.5 w-3.5 text-muted animate-spin" />
                      : isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                  </span>
                  <span className="text-xs font-medium text-ink leading-snug line-clamp-2">{group.topic}</span>
                </button>

                {isExpanded && (
                  <div className="pl-8 pb-1">
                    {group.runs.map((run) => (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => onSelectRun(run)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-border/30 mx-1',
                          run.id === selectedRunId && 'bg-primary/10',
                        )}
                      >
                        <CheckCircle className={cn('h-3 w-3 shrink-0', run.id === selectedRunId ? 'text-primary' : 'text-emerald-500')} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-muted shrink-0" />
                            <span className={cn('text-[11px]', run.id === selectedRunId ? 'text-primary font-medium' : 'text-muted')}>
                              {formatDate(run.runAt)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted/70">
                            {run.nodeRuns
                              ? `${run.nodeRuns.length} node${run.nodeRuns.length !== 1 ? 's' : ''} logged`
                              : 'Click to load'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── NodeDetailPanel ───────────────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  nodeRun,
  hasRunSelected,
  isLoadingRuns,
  session,
  isCollapsed,
  onToggleCollapse,
  onClose,
}: {
  node: FlowNode | null;
  nodeRun: NodeRun | null;
  hasRunSelected: boolean;
  isLoadingRuns: boolean;
  session: AppSession;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}) {
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => { setShowTemplate(false); }, [node?.id]);

  if (!node) return null;

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-3 border-l border-border bg-surface px-3 py-4 shrink-0 w-12">
        <button type="button" onClick={onToggleCollapse} className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-ink transition-colors" title="Expand">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <span className="text-[10px] font-semibold text-muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
            {node.label}
          </span>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-ink transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const isNotLogged = hasRunSelected && !nodeRun && !isLoadingRuns && node.type === 'llm';

  return (
    <div className="flex flex-col border-l border-border bg-surface shrink-0 w-96">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-ink truncate">{node.label}</h2>
          {isLoadingRuns && <span className="text-[10px] text-muted">Loading run data…</span>}
          {!isLoadingRuns && nodeRun && <span className="text-[10px] text-emerald-600 font-medium">● Output logged</span>}
          {isNotLogged && <span className="text-[10px] text-amber-600 font-medium">● Output not logged</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onToggleCollapse} className="rounded-lg p-1 text-muted hover:bg-border/40 hover:text-ink transition-colors" title="Collapse panel">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-border/40 hover:text-ink transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs leading-relaxed text-muted">{node.description}</p>

        {node.settingKey && (
          <div className="rounded-xl border border-border bg-canvas px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">LLM Configuration</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {nodeRun ? nodeRun.model : getLlmLabel(node.settingKey, session)}
            </p>
            {nodeRun && nodeRun.durationMs > 0 && (
              <p className="mt-0.5 text-[10px] text-muted">
                {nodeRun.durationMs < 1000 ? `${nodeRun.durationMs}ms` : `${(nodeRun.durationMs / 1000).toFixed(1)}s`} inference time
              </p>
            )}
            {!nodeRun && (
              <p className="mt-0.5 text-[10px] text-muted">Configure in Settings → AI / LLM</p>
            )}
          </div>
        )}

        {isLoadingRuns && node.type === 'llm' && (
          <div className="flex items-center gap-2 text-muted py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="text-xs">Loading run data…</span>
          </div>
        )}

        {nodeRun?.status === 'failed' && (
          <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-800">Node failed</p>
              <p className="text-[11px] text-red-700 mt-0.5 font-mono">{nodeRun.error}</p>
            </div>
          </div>
        )}

        {isNotLogged && (
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800">Output not logged</p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                This node's output was not persisted for this run. Outputs are logged starting from the next generation.
              </p>
            </div>
          </div>
        )}

        {nodeRun && nodeRun.status === 'completed' ? (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Prompt Input</p>
              <pre className="max-h-48 overflow-y-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {nodeRun.input}
              </pre>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Output</p>
              <pre className="max-h-64 overflow-y-auto rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {nodeRun.output}
              </pre>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowTemplate(p => !p)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors"
              >
                <ChevronRight className={cn('h-3 w-3 transition-transform', showTemplate && 'rotate-90')} />
                Prompt Template
              </button>
              {showTemplate && (
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                  {node.promptTemplate}
                </pre>
              )}
            </div>
          </>
        ) : !isLoadingRuns ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Prompt Template</p>
            <pre className="max-h-64 overflow-y-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
              {node.promptTemplate}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── EnrichmentFlowPage ────────────────────────────────────────────────────────

export function EnrichmentFlowPage({
  session,
  idToken,
  api,
  rows = [],
}: {
  session: AppSession;
  idToken: string;
  api: BackendApi;
  llmCatalog?: LlmCatalog | null;
  rows?: SheetRow[];
}) {
  const topicGroups = buildTopicGroups(rows);
  const defaultRun = topicGroups[0]?.runs[0] ?? null;

  const [selectedRunId, setSelectedRunId] = useState<string | null>(defaultRun?.id ?? null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [runsOpen, setRunsOpen] = useState(true);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const [nodeRunsCache, setNodeRunsCache] = useState<Map<string, NodeRun[]>>(new Map());
  const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);

  const allRuns = topicGroups.flatMap(g => g.runs);
  const selectedRun = allRuns.find(r => r.id === selectedRunId) ?? null;

  const fetchNodeRuns = useCallback(async (topicId: string) => {
    if (nodeRunsCache.has(topicId)) return;
    setLoadingTopicId(topicId);
    try {
      const items = await api.getNodeRuns(idToken, topicId);
      setNodeRunsCache(prev => new Map(prev).set(topicId, mapNodeRunItems(items)));
    } catch (e) {
      console.error('[getNodeRuns]', e);
      setNodeRunsCache(prev => new Map(prev).set(topicId, []));
    } finally {
      setLoadingTopicId(null);
    }
  }, [api, idToken, nodeRunsCache]);

  useEffect(() => {
    if (selectedRun?.topicId) {
      void fetchNodeRuns(selectedRun.topicId);
    }
  }, [selectedRun?.topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default selection when rows load
  useEffect(() => {
    if (!selectedRunId && defaultRun) setSelectedRunId(defaultRun.id);
  }, [defaultRun?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadedNodeRuns = selectedRun ? nodeRunsCache.get(selectedRun.topicId) : undefined;
  const isLoadingRuns = loadingTopicId !== null && loadingTopicId === selectedRun?.topicId;

  const getNodeRun = (nodeId: string): NodeRun | null =>
    loadedNodeRuns?.find(nr => nr.nodeId === nodeId) ?? null;

  const handleSelectRun = (run: TopicRun) => {
    setSelectedRunId(run.id);
    setSelectedNode(null);
  };

  const handleNodeClick = (node: FlowNode) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setDetailCollapsed(false);
    }
  };

  const enrichmentNodes = FLOW_NODES.filter(n => n.group === 'enrichment');

  const executedEnrichmentNodeIds = useMemo(() => {
    if (!loadedNodeRuns || loadedNodeRuns.length === 0) return null;
    return loadedNodeRuns
      .map(nr => nr.nodeId)
      .filter(id => {
        const node = FLOW_NODES.find(n => n.id === id);
        return node?.group === 'enrichment';
      });
  }, [loadedNodeRuns]);

  const enrichmentNodesToRender = useMemo(() => {
    if (!executedEnrichmentNodeIds || executedEnrichmentNodeIds.length === 0) {
      return enrichmentNodes;
    }
    return executedEnrichmentNodeIds
      .map(id => FLOW_NODES.find(n => n.id === id))
      .filter((n): n is FlowNode => n !== undefined);
  }, [executedEnrichmentNodeIds, enrichmentNodes]);
  const triggerNode = FLOW_NODES.find(n => n.id === 'topic_created')!;
  const reviewGenNode = FLOW_NODES.find(n => n.id === 'review_generation')!;
  const genWorkerNode = FLOW_NODES.find(n => n.id === 'generation_worker')!;
  const textReviewNode = FLOW_NODES.find(n => n.id === 'content_review_text')!;
  const visionReviewNode = FLOW_NODES.find(n => n.id === 'content_review_vision')!;
  const outputNode = FLOW_NODES.find(n => n.id === 'post_published')!;

  const cardProps = (node: FlowNode) => ({
    node,
    isSelected: selectedNode?.id === node.id,
    hasRunData: !!getNodeRun(node.id),
    onClick: () => handleNodeClick(node),
  });

  const isEmpty = rows.length === 0;
  const hasPendingOnly = !isEmpty && topicGroups.length === 0;

  // Enrich topicGroups with cached nodeRuns for the runs panel
  const enrichedGroups = topicGroups.map(g => ({
    ...g,
    runs: g.runs.map(r => ({
      ...r,
      nodeRuns: nodeRunsCache.get(g.topicId),
    })),
  }));

  return (
    <div className="flex h-full overflow-hidden">
      <RunsPanel
        topicGroups={enrichedGroups}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        isOpen={runsOpen}
        onToggle={() => setRunsOpen(p => !p)}
        isEmpty={isEmpty}
        hasPendingOnly={hasPendingOnly}
        loadingTopicId={loadingTopicId}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-canvas shrink-0">
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold text-ink">Enrichment Flow</h1>
            <p className="text-[11px] text-muted truncate">
              {selectedRun
                ? `Viewing: ${selectedRun.topic.length > 48 ? selectedRun.topic.slice(0, 48) + '…' : selectedRun.topic}`
                : 'Drag to pan · click a node to inspect'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-3">
              {[
                { color: 'border-violet-300 bg-violet-100', label: 'Trigger' },
                { color: 'border-blue-200 bg-blue-50', label: 'Enrichment' },
                { color: 'border-amber-200 bg-amber-50', label: 'Generation' },
                { color: 'border-emerald-300 bg-emerald-100', label: 'Output' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={cn('h-2.5 w-2.5 rounded border-2', color)} />
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-[10px] text-muted">Has output</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCanvasResetKey(k => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset view
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 p-3 gap-3">
          <DraggableCanvas resetKey={canvasResetKey}>
            <div className="flex flex-col items-center gap-0 p-8">
              <NodeCard {...cardProps(triggerNode)} />
              <Arrow />

              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4">
                <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  {executedEnrichmentNodeIds && executedEnrichmentNodeIds.length > 0
                    ? 'Enrichment Modules (execution order)'
                    : 'Enrichment Modules (parallel)'}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {enrichmentNodesToRender.map(node => (
                    <NodeCard key={node.id} {...cardProps(node)} />
                  ))}
                </div>
              </div>
              <Arrow />

              <NodeCard {...cardProps(reviewGenNode)} />
              <Arrow />
              <NodeCard {...cardProps(genWorkerNode)} />
              <Arrow />

              <div className="flex items-center gap-0">
                <NodeCard {...cardProps(textReviewNode)} />
                <Arrow horizontal />
                <NodeCard {...cardProps(visionReviewNode)} />
              </div>
              <Arrow />

              <NodeCard {...cardProps(outputNode)} />
            </div>
          </DraggableCanvas>

          <NodeDetailPanel
            key={selectedNode?.id}
            node={selectedNode}
            nodeRun={selectedNode ? getNodeRun(selectedNode.id) : null}
            hasRunSelected={!!selectedRun}
            isLoadingRuns={isLoadingRuns}
            session={session}
            isCollapsed={detailCollapsed}
            onToggleCollapse={() => setDetailCollapsed(p => !p)}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      </div>
    </div>
  );
}
