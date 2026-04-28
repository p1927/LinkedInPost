import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  Activity,
  CheckCircle,
  RotateCcw,
  Clock,
  AlertTriangle,
  Loader2,
  ZoomIn,
  ZoomOut,
  List,
} from 'lucide-react';
import type { LlmProviderId } from '@repo/llm-core';
import type { GoogleModelOption } from '../services/configService';
import type { AppSession, BackendApi, NodeRunItem } from '../services/backendApi';
import type { SheetRow } from '../services/sheets';
import { cn } from '../lib/cn';
import { BUILT_IN_WORKFLOW_CARDS } from '../features/generation/builtInWorkflowCards';
import { NODE_PROGRESS_LABELS } from '../features/generation/nodeProgressLabels';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { containerVariants, cardItemVariants, spring } from '@/lib/motion';

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

const ENRICHMENT_NODES = FLOW_NODES.filter(n => n.group === 'enrichment');

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

const CANVAS_ZOOM_LEVELS = [0.4, 0.5, 0.65, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_CANVAS_ZOOM_IDX = 4;

function DraggableCanvas({ children, resetKey }: { children: React.ReactNode; resetKey: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_CANVAS_ZOOM_IDX);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const scale = CANVAS_ZOOM_LEVELS[zoomIdx];

  useEffect(() => {
    setPos({ x: 0, y: 0 });
    setZoomIdx(DEFAULT_CANVAS_ZOOM_IDX);
  }, [resetKey]);

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

  // Scroll-to-zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomIdx(i => e.deltaY < 0
        ? Math.min(i + 1, CANVAS_ZOOM_LEVELS.length - 1)
        : Math.max(i - 1, 0));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 overflow-hidden rounded-xl border border-border bg-canvas cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
    >
      {/* Dot-grid background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(124,58,237,0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Canvas content */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging.current ? 'none' : 'transform 0.15s ease',
        }}
      >
        {children}
      </div>

      {/* Zoom controls — floating bottom-right */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 pointer-events-auto z-10">
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-canvas/90 backdrop-blur-sm px-1.5 py-1 shadow-sm">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomIdx(i => Math.max(i - 1, 0)); }}
            disabled={zoomIdx === 0}
            title="Zoom out"
            className="flex items-center justify-center h-6 w-6 rounded-md text-muted hover:text-ink hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomIdx(DEFAULT_CANVAS_ZOOM_IDX); setPos({ x: 0, y: 0 }); }}
            title="Reset zoom and pan"
            className="flex items-center justify-center h-6 px-1.5 rounded-md text-[10px] font-semibold text-muted hover:text-ink hover:bg-secondary/60 transition-all cursor-pointer min-w-[36px]"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomIdx(i => Math.min(i + 1, CANVAS_ZOOM_LEVELS.length - 1)); }}
            disabled={zoomIdx === CANVAS_ZOOM_LEVELS.length - 1}
            title="Zoom in"
            className="flex items-center justify-center h-6 w-6 rounded-md text-muted hover:text-ink hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomIn size={13} />
          </button>
          <span className="w-px h-4 bg-border/60 mx-0.5" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomIdx(DEFAULT_CANVAS_ZOOM_IDX); setPos({ x: 0, y: 0 }); }}
            title="Reset view"
            className="flex items-center justify-center h-6 w-6 rounded-md text-muted hover:text-ink hover:bg-secondary/60 transition-all cursor-pointer"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Pan hint */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-[10px] text-muted/50 select-none">drag to pan · scroll to zoom</span>
      </div>
    </div>
  );
}

// ─── Arrow ─────────────────────────────────────────────────────────────────────

function Arrow({ horizontal = false }: { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <div className="flex items-center">
        <svg width="32" height="8" viewBox="0 0 32 8" fill="none">
          <motion.line
            x1="0" y1="4" x2="28" y2="4"
            stroke="rgb(203 213 225)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          <motion.polygon
            points="28,1 32,4 28,7"
            fill="rgb(203 213 225)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.2 }}
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <svg width="8" height="32" viewBox="0 0 8 32" fill="none">
        <motion.line
          x1="4" y1="0" x2="4" y2="28"
          stroke="rgb(203 213 225)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <motion.polygon
          points="1,28 4,32 7,28"
          fill="rgb(203 213 225)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        />
      </svg>
    </div>
  );
}

// ─── NodeCard ──────────────────────────────────────────────────────────────────

function NodeCard({ node, isSelected, hasRunData, isSkipped, onClick }: {
  node: FlowNode;
  isSelected: boolean;
  hasRunData: boolean;
  isSkipped?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.06, y: -3 }}
      whileTap={{ scale: 0.97 }}
      animate={isSelected ? { scale: 1.05, boxShadow: '0 0 0 3px rgba(124,58,237,0.4), 0 8px 24px rgba(124,58,237,0.2)' } : { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      transition={spring.snappy}
      style={{ willChange: 'transform', opacity: isSkipped ? 0.4 : 1 }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-center shadow-sm cursor-pointer min-w-[140px]',
        getNodeColor(node),
      )}
    >
      <span className="text-xs font-semibold leading-snug">{node.label}</span>
      {node.type === 'llm' && !isSkipped && (
        <span className="text-[10px] opacity-60 font-medium">LLM call</span>
      )}
      {isSkipped && (
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5">skipped</span>
      )}
      <AnimatePresence>
        {hasRunData && (
          <motion.span
            key="run-dot"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={spring.bounce}
            className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── RunSelector ───────────────────────────────────────────────────────────────

function RunSelector({
  topicGroups,
  selectedTopicId,
  selectedRunId,
  onSelectTopic,
  onSelectRun,
}: {
  topicGroups: TopicGroup[];
  selectedTopicId: string | null;
  selectedRunId: string | null;
  onSelectTopic: (topicId: string) => void;
  onSelectRun: (run: TopicRun) => void;
}) {
  const selectedGroup = topicGroups.find(g => g.topicId === selectedTopicId);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedTopicId ?? ''}
        onChange={e => onSelectTopic(e.target.value)}
        className="text-xs rounded-lg border border-border bg-canvas text-ink px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-[220px] cursor-pointer"
      >
        {topicGroups.map(g => (
          <option key={g.topicId} value={g.topicId}>
            {g.topic.length > 40 ? g.topic.slice(0, 40) + '…' : g.topic}
          </option>
        ))}
      </select>
      {selectedGroup && selectedGroup.runs.length > 1 && (
        <select
          value={selectedRunId ?? ''}
          onChange={e => {
            const run = selectedGroup.runs.find(r => r.id === e.target.value);
            if (run) onSelectRun(run);
          }}
          className="text-xs rounded-lg border border-border bg-canvas text-ink px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
        >
          {selectedGroup.runs.map(r => (
            <option key={r.id} value={r.id}>{formatDate(r.runAt)}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── NodeInlineDetail ──────────────────────────────────────────────────────────

function NodeInlineDetail({
  node,
  nodeRun,
  hasRunSelected,
  isLoadingRuns,
  session,
}: {
  node: FlowNode;
  nodeRun: NodeRun | null;
  hasRunSelected: boolean;
  isLoadingRuns: boolean;
  session: AppSession;
}) {
  const [showTemplate, setShowTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');

  useEffect(() => { setShowTemplate(false); }, [node.id]);
  useEffect(() => { setActiveTab('summary'); }, [node.id]);

  const isNotLogged = hasRunSelected && !nodeRun && !isLoadingRuns && node.type === 'llm';

  return (
    <div className="border-t border-border/60 bg-canvas px-4 py-3 space-y-3">
      <p className="text-xs leading-relaxed text-muted">{node.description}</p>

      {node.settingKey && (
        <div className="rounded-xl border border-border bg-white px-3 py-2.5">
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
        <div className="flex items-center gap-2 text-muted py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
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
            <pre className="max-h-40 overflow-y-auto rounded-xl border border-border bg-white p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
              {nodeRun.input}
            </pre>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Output</p>
            <div className="flex gap-1 border-b border-border mb-3">
              {(['summary', 'raw'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
                    activeTab === tab ? 'text-ink border-b-2 border-primary' : 'text-muted hover:text-ink',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'raw' ? (
              <pre className="max-h-48 overflow-y-auto rounded-xl border border-border bg-white p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {nodeRun.output}
              </pre>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-ink/80 leading-relaxed space-y-1.5">
                {NODE_PROGRESS_LABELS[node.id] && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
                    {NODE_PROGRESS_LABELS[node.id].done}
                  </p>
                )}
                {(() => {
                  let parsed: Record<string, unknown> = {};
                  try { parsed = JSON.parse(nodeRun.output) as Record<string, unknown>; } catch { /* ignore */ }
                  if (node.id === 'psychology-analyzer') {
                    const lines: Array<{ label: string; value: string }> = [];
                    if (parsed.dominantEmotion) lines.push({ label: 'Dominant emotion', value: String(parsed.dominantEmotion) });
                    if (parsed.audienceDescription) lines.push({ label: 'Audience', value: String(parsed.audienceDescription) });
                    const triggers = parsed.triggers as Array<{ type: string }> | undefined;
                    if (triggers?.length) lines.push({ label: 'Key triggers', value: triggers.slice(0, 3).map(t => t.type).join(', ') });
                    if (lines.length) return lines.map(l => <p key={l.label}><span className="font-semibold">{l.label}:</span> {l.value}</p>);
                  }
                  if (node.id === 'vocabulary-selector') {
                    const lines: Array<{ label: string; value: string }> = [];
                    const powerWords = parsed.powerWords as string[] | undefined;
                    const avoidWords = parsed.avoidWords as string[] | undefined;
                    if (powerWords?.length) lines.push({ label: 'Power words', value: powerWords.slice(0, 5).join(', ') });
                    if (avoidWords?.length) lines.push({ label: 'Avoided', value: avoidWords.slice(0, 3).join(', ') });
                    if (lines.length) return lines.map(l => <p key={l.label}><span className="font-semibold">{l.label}:</span> {l.value}</p>);
                  }
                  if (node.id === 'narrative-arc') {
                    const lines: Array<{ label: string; value: string }> = [];
                    if (parsed.arc) lines.push({ label: 'Arc', value: String(parsed.arc).replace(/_/g, ' ') });
                    const hook = (parsed as { selectedHook?: { type: string } }).selectedHook;
                    if (hook?.type) lines.push({ label: 'Hook', value: hook.type.replace(/_/g, ' ') });
                    if (parsed.ctaType) lines.push({ label: 'CTA style', value: String(parsed.ctaType).replace(/_/g, ' ') });
                    if (lines.length) return lines.map(l => <p key={l.label}><span className="font-semibold">{l.label}:</span> {l.value}</p>);
                  }
                  const entries = Object.entries(parsed)
                    .filter(([, v]) => typeof v === 'string' || (Array.isArray(v) && (v as unknown[]).length > 0))
                    .slice(0, 6);
                  if (!entries.length) return <p className="text-muted italic">No structured fields found.</p>;
                  return entries.map(([k, v]) => (
                    <p key={k}>
                      <span className="font-semibold">{k}:</span>{' '}
                      {Array.isArray(v) ? (v as string[]).slice(0, 3).join(', ') : String(v).slice(0, 120)}
                    </p>
                  ));
                })()}
              </div>
            )}
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
              <pre className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border bg-white p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {node.promptTemplate}
              </pre>
            )}
          </div>
        </>
      ) : !isLoadingRuns ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Prompt Template</p>
          <pre className="max-h-48 overflow-y-auto rounded-xl border border-border bg-white p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
            {node.promptTemplate}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

// ─── TraceRow ──────────────────────────────────────────────────────────────────

function TraceRow({
  node,
  nodeRun,
  hasRunSelected,
  isLoadingRuns,
  isExpanded,
  isSkipped,
  onClick,
  session,
  maxDurationMs,
}: {
  node: FlowNode;
  nodeRun: NodeRun | null;
  hasRunSelected: boolean;
  isLoadingRuns: boolean;
  isExpanded: boolean;
  isSkipped: boolean;
  onClick: () => void;
  session: AppSession;
  maxDurationMs: number;
}) {
  const durationMs = nodeRun?.durationMs ?? 0;
  const barWidth = maxDurationMs > 0 ? Math.max(4, (durationMs / maxDurationMs) * 100) : 0;
  const isNotLogged = hasRunSelected && !nodeRun && !isLoadingRuns && node.type === 'llm';

  let statusEl: React.ReactNode;
  if (isLoadingRuns && node.type === 'llm') {
    statusEl = <Loader2 className="h-3.5 w-3.5 text-muted animate-spin" />;
  } else if (nodeRun?.status === 'failed') {
    statusEl = <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  } else if (nodeRun?.status === 'completed') {
    statusEl = <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
  } else if (node.type === 'trigger' || node.type === 'output') {
    statusEl = <CheckCircle className="h-3.5 w-3.5 text-violet-400" />;
  } else if (isSkipped || isNotLogged) {
    statusEl = <span className="h-3.5 w-3.5 flex items-center justify-center"><span className="w-2.5 h-0.5 bg-slate-300 rounded-full block" /></span>;
  } else {
    statusEl = <span className="h-3.5 w-3.5 rounded-full border-2 border-border/60 block" />;
  }

  let typeBadgeEl: React.ReactNode = null;
  if (node.type === 'trigger') {
    typeBadgeEl = <span className="hidden sm:inline text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">trigger</span>;
  } else if (node.type === 'output') {
    typeBadgeEl = <span className="hidden sm:inline text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">output</span>;
  } else if (node.group === 'enrichment') {
    typeBadgeEl = <span className="hidden sm:inline text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">enrichment</span>;
  } else {
    typeBadgeEl = <span className="hidden sm:inline text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">llm</span>;
  }

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border transition-colors',
      isExpanded ? 'border-primary/30 bg-white shadow-sm' : 'border-transparent',
    )}>
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ backgroundColor: isExpanded ? 'transparent' : 'rgba(124,58,237,0.03)' }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer rounded-xl"
      >
        <span className="shrink-0">{statusEl}</span>
        <span className={cn(
          'text-xs font-medium flex-1 min-w-0 truncate',
          isSkipped || isNotLogged ? 'text-muted/60' : 'text-ink',
        )}>
          {node.label}
        </span>
        {typeBadgeEl}
        {nodeRun && maxDurationMs > 0 && (
          <div className="flex items-center gap-2 shrink-0 w-36">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', nodeRun.status === 'failed' ? 'bg-red-400' : 'bg-primary/60')}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ width: `${barWidth}%`, transformOrigin: 'left' }}
              />
            </div>
            <span className="text-[10px] text-muted w-12 text-right shrink-0">
              {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
            </span>
          </div>
        )}
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted/50 shrink-0 transition-transform duration-150', isExpanded && 'rotate-90')} />
      </motion.button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <NodeInlineDetail
              node={node}
              nodeRun={nodeRun}
              hasRunSelected={hasRunSelected}
              isLoadingRuns={isLoadingRuns}
              session={session}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ExecutionTrace ────────────────────────────────────────────────────────────

function ExecutionTrace({
  triggerNode,
  enrichmentNodes,
  postEnrichmentNodes,
  getNodeRun,
  hasRunSelected,
  isLoadingRuns,
  expandedNodeId,
  onToggleNode,
  session,
}: {
  triggerNode: FlowNode;
  enrichmentNodes: FlowNode[];
  postEnrichmentNodes: FlowNode[];
  getNodeRun: (nodeId: string) => NodeRun | null;
  hasRunSelected: boolean;
  isLoadingRuns: boolean;
  expandedNodeId: string | null;
  onToggleNode: (nodeId: string) => void;
  session: AppSession;
}) {
  const allNodes = [triggerNode, ...enrichmentNodes, ...postEnrichmentNodes];
  const allRuns = allNodes.map(n => getNodeRun(n.id)).filter((r): r is NodeRun => r !== null);
  const maxDurationMs = allRuns.length > 0 ? Math.max(...allRuns.map(r => r.durationMs ?? 0)) : 0;

  const rowProps = (node: FlowNode, isSkipped = false) => ({
    node,
    nodeRun: getNodeRun(node.id),
    hasRunSelected,
    isLoadingRuns,
    isExpanded: expandedNodeId === node.id,
    isSkipped,
    onClick: () => onToggleNode(node.id),
    session,
    maxDurationMs,
  });

  return (
    <motion.div className="space-y-0.5" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={cardItemVariants}>
        <TraceRow {...rowProps(triggerNode)} />
      </motion.div>

      <motion.div variants={cardItemVariants} className="ml-4 border-l-2 border-blue-200 pl-3 py-1.5 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 px-2 pb-1">Enrichment Modules</p>
        {enrichmentNodes.map(node => {
          const isSkipped = hasRunSelected && !isLoadingRuns && !getNodeRun(node.id);
          return (
            <motion.div key={node.id} variants={cardItemVariants}>
              <TraceRow {...rowProps(node, isSkipped)} />
            </motion.div>
          );
        })}
      </motion.div>

      {postEnrichmentNodes.map(node => (
        <motion.div key={node.id} variants={cardItemVariants}>
          <TraceRow {...rowProps(node)} />
        </motion.div>
      ))}
    </motion.div>
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
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [canvasResetKey, setCanvasResetKey] = useState(0);
  const [showDag, setShowDag] = useState(false);
  const [topicPanelExpanded, setTopicPanelExpanded] = useState(false);
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

  useEffect(() => {
    if (!selectedRunId && defaultRun) setSelectedRunId(defaultRun.id);
  }, [defaultRun?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadedNodeRuns = selectedRun ? nodeRunsCache.get(selectedRun.topicId) : undefined;
  const isLoadingRuns = loadingTopicId !== null && loadingTopicId === selectedRun?.topicId;

  const getNodeRun = (nodeId: string): NodeRun | null =>
    loadedNodeRuns?.find(nr => nr.nodeId === nodeId) ?? null;

  const handleSelectRun = (run: TopicRun) => {
    setSelectedRunId(run.id);
    setExpandedNodeId(null);
  };

  const handleToggleNode = (nodeId: string) => {
    setExpandedNodeId(prev => prev === nodeId ? null : nodeId);
  };

  const executedEnrichmentNodeIds = useMemo(() => {
    if (!loadedNodeRuns || loadedNodeRuns.length === 0) return null;
    return loadedNodeRuns
      .map(nr => nr.nodeId)
      .filter(id => FLOW_NODES.find(n => n.id === id)?.group === 'enrichment');
  }, [loadedNodeRuns]);

  const enrichmentNodesToRender = useMemo(() => {
    if (!executedEnrichmentNodeIds || executedEnrichmentNodeIds.length === 0) return ENRICHMENT_NODES;
    const definedOrder = ENRICHMENT_NODES.map(n => n.id);
    return executedEnrichmentNodeIds
      .map(id => FLOW_NODES.find(n => n.id === id))
      .filter((n): n is FlowNode => n !== undefined)
      .sort((a, b) => definedOrder.indexOf(a.id) - definedOrder.indexOf(b.id));
  }, [executedEnrichmentNodeIds]);

  const triggerNode = FLOW_NODES.find(n => n.id === 'topic_created')!;
  const reviewGenNode = FLOW_NODES.find(n => n.id === 'review_generation')!;
  const genWorkerNode = FLOW_NODES.find(n => n.id === 'generation_worker')!;
  const textReviewNode = FLOW_NODES.find(n => n.id === 'content_review_text')!;
  const visionReviewNode = FLOW_NODES.find(n => n.id === 'content_review_vision')!;
  const outputNode = FLOW_NODES.find(n => n.id === 'post_published')!;
  const postEnrichmentNodes = [reviewGenNode, genWorkerNode, textReviewNode, visionReviewNode, outputNode];

  const dagCardProps = (node: FlowNode) => ({
    node,
    isSelected: expandedNodeId === node.id,
    hasRunData: !!getNodeRun(node.id),
    isSkipped: node.group === 'enrichment' && loadedNodeRuns !== undefined && !getNodeRun(node.id),
    onClick: () => handleToggleNode(node.id),
  });

  const isEmpty = rows.length === 0;
  const hasPendingOnly = !isEmpty && topicGroups.length === 0;

  return (
    <MotionConfig transition={spring.smooth}>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-canvas shrink-0 flex-wrap gap-y-2">

          {/* Topic panel toggle — only shown when there are topics */}
          {!isEmpty && !hasPendingOnly && (
            <button
              type="button"
              onClick={() => setTopicPanelExpanded(p => !p)}
              title={topicPanelExpanded ? 'Collapse topic panel' : 'Expand topic panel'}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors shrink-0"
            >
              <List className="h-3.5 w-3.5" />
              {topicPanelExpanded ? 'Collapse' : 'Topics'}
            </button>
          )}

          {/* RunSelector: inline dropdown when panel is collapsed */}
          {!isEmpty && !hasPendingOnly && !topicPanelExpanded && (
            <RunSelector
              topicGroups={topicGroups}
              selectedTopicId={selectedRun?.topicId ?? null}
              selectedRunId={selectedRunId}
              onSelectTopic={(topicId) => {
                const group = topicGroups.find(g => g.topicId === topicId);
                const run = group?.runs[0];
                if (run) handleSelectRun(run);
              }}
              onSelectRun={handleSelectRun}
            />
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {selectedRun && !showDag && (
              <span className="text-[11px] text-muted hidden sm:block">
                {loadedNodeRuns?.length ?? 0} nodes · {formatDate(selectedRun.runAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowDag(p => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors"
            >
              {showDag ? 'Trace view' : 'DAG view'}
            </button>
            {showDag && (
              <button
                type="button"
                onClick={() => setCanvasResetKey(k => k + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
            <Activity className="h-8 w-8 text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted">No topics yet</p>
            <p className="text-xs text-muted/60 mt-1 max-w-xs">Add topics to your Google Sheet to start generating posts.</p>
          </div>
        ) : hasPendingOnly ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
            <Clock className="h-8 w-8 text-muted/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted">No completed runs</p>
            <p className="text-xs text-muted/60 mt-1">Topics exist but none have been generated yet.</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── Collapsible left topic panel ────────────────────────── */}
            <AnimatePresence initial={false}>
              {topicPanelExpanded && (
                <motion.div
                  key="topic-panel"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 216, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="shrink-0 border-r border-border/60 bg-canvas overflow-hidden flex flex-col"
                >
                  <div className="px-3 py-2.5 border-b border-border/60 shrink-0 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Topics</p>
                    <span className="text-[10px] text-muted/60 tabular-nums">{topicGroups.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {topicGroups.map(group => (
                      <button
                        key={group.topicId}
                        type="button"
                        onClick={() => {
                          const run = group.runs[0];
                          if (run) handleSelectRun(run);
                        }}
                        className={cn(
                          'w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer',
                          selectedRun?.topicId === group.topicId
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-ink/70 hover:bg-border/40 hover:text-ink',
                        )}
                      >
                        <span className="line-clamp-2 leading-snug">{group.topic}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── DAG or Trace view ───────────────────────────────────── */}
            {showDag ? (
              <div className="flex flex-1 min-h-0 p-3 gap-3">
                <DraggableCanvas resetKey={canvasResetKey}>
                  <motion.div
                    className="flex flex-col items-center gap-0 p-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    <NodeCard {...dagCardProps(triggerNode)} />
                    <Arrow />
                    <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4">
                      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-blue-400">
                        Enrichment Modules
                      </p>
                      <motion.div className="flex flex-wrap justify-center gap-3" variants={containerVariants}>
                        {enrichmentNodesToRender.map(node => (
                          <motion.div key={node.id} variants={cardItemVariants}>
                            <NodeCard {...dagCardProps(node)} />
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                    <Arrow />
                    <NodeCard {...dagCardProps(reviewGenNode)} />
                    <Arrow />
                    <NodeCard {...dagCardProps(genWorkerNode)} />
                    <Arrow />
                    <div className="flex items-center gap-0">
                      <NodeCard {...dagCardProps(textReviewNode)} />
                      <Arrow horizontal />
                      <NodeCard {...dagCardProps(visionReviewNode)} />
                    </div>
                    <Arrow />
                    <NodeCard {...dagCardProps(outputNode)} />
                  </motion.div>
                </DraggableCanvas>

                <AnimatePresence>
                  {expandedNodeId && (() => {
                    const selectedNode = FLOW_NODES.find(n => n.id === expandedNodeId);
                    if (!selectedNode) return null;
                    return (
                      <motion.div
                        key={expandedNodeId}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="w-80 shrink-0 flex flex-col rounded-xl border border-border bg-canvas overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              selectedNode.type === 'trigger' ? 'bg-violet-400' :
                              selectedNode.type === 'output' ? 'bg-emerald-400' :
                              selectedNode.group === 'enrichment' ? 'bg-blue-400' : 'bg-amber-400',
                            )} />
                            <span className="text-xs font-semibold text-ink truncate">{selectedNode.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedNodeId(null)}
                            className="shrink-0 ml-2 text-muted hover:text-ink transition-colors text-lg leading-none"
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <NodeInlineDetail
                            node={selectedNode}
                            nodeRun={getNodeRun(selectedNode.id)}
                            hasRunSelected={!!selectedRun}
                            isLoadingRuns={isLoadingRuns}
                            session={session}
                          />
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
                  {selectedRun && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      {(() => {
                        const matchedRow = rows?.find((r: SheetRow) => r.topicId === selectedRun.topicId);
                        const templateId = matchedRow?.generationTemplateId;
                        const workflowCard = templateId ? BUILT_IN_WORKFLOW_CARDS.find(c => c.id === templateId) : null;
                        const workflowLabel = workflowCard?.name ?? templateId ?? 'Default';
                        const channel = (matchedRow as SheetRow & { channel?: string } | undefined)?.channel;
                        const wordCount = (matchedRow as SheetRow & { targetWordCount?: number } | undefined)?.targetWordCount;
                        return (
                          <>
                            <span className="font-semibold text-ink/80">{workflowLabel}</span>
                            {channel && <><span className="text-muted/40">·</span><span>{channel}</span></>}
                            {wordCount != null && <><span className="text-muted/40">·</span><span>{wordCount} words target</span></>}
                            <span className="text-muted/40">·</span>
                            <span>{loadedNodeRuns?.length ?? 0} nodes ran</span>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {!selectedRun ? (
                    <p className="text-center text-xs text-muted py-8">Select a topic to view the execution trace.</p>
                  ) : (
                    <ExecutionTrace
                      triggerNode={triggerNode}
                      enrichmentNodes={enrichmentNodesToRender}
                      postEnrichmentNodes={postEnrichmentNodes}
                      getNodeRun={getNodeRun}
                      hasRunSelected={!!selectedRun}
                      isLoadingRuns={isLoadingRuns}
                      expandedNodeId={expandedNodeId}
                      onToggleNode={handleToggleNode}
                      session={session}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
