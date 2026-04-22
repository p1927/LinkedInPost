import { useState } from 'react';
import { X } from 'lucide-react';
import type { LlmProviderId } from '@repo/llm-core';
import type { GoogleModelOption } from '../services/configService';
import type { AppSession } from '../services/backendApi';
import { cn } from '../lib/cn';

type LlmCatalog = Array<{ id: LlmProviderId; name: string; models: GoogleModelOption[] }>;

interface FlowNode {
  id: string;
  label: string;
  type: 'trigger' | 'llm' | 'output';
  settingKey?: string;
  description: string;
  promptTemplate: string;
  group?: string;
}

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

function getNodeColor(node: FlowNode) {
  if (node.type === 'trigger') return 'bg-violet-100 border-violet-300 text-violet-800';
  if (node.type === 'output') return 'bg-emerald-100 border-emerald-300 text-emerald-800';
  if (node.group === 'enrichment') return 'bg-blue-50 border-blue-200 text-blue-800';
  return 'bg-amber-50 border-amber-200 text-amber-800';
}

function getLlmLabel(
  settingKey: string | undefined,
  session: AppSession,
): string {
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

interface NodeCardProps {
  node: FlowNode;
  isSelected: boolean;
  onClick: () => void;
}

function NodeCard({ node, isSelected, onClick }: NodeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-center shadow-sm transition-all duration-150 hover:shadow-md cursor-pointer min-w-[140px]',
        getNodeColor(node),
        isSelected && 'ring-2 ring-offset-2 ring-primary shadow-lg scale-105',
      )}
    >
      <span className="text-xs font-semibold leading-snug">{node.label}</span>
      {node.type === 'llm' && (
        <span className="text-[10px] opacity-60 font-medium">LLM call</span>
      )}
    </button>
  );
}

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

export function EnrichmentFlowPage({
  session,
  llmCatalog,
}: {
  session: AppSession;
  llmCatalog: LlmCatalog | null;
}) {
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  const enrichmentNodes = FLOW_NODES.filter((n) => n.group === 'enrichment');
  const triggerNode = FLOW_NODES.find((n) => n.id === 'topic_created')!;
  const reviewGenNode = FLOW_NODES.find((n) => n.id === 'review_generation')!;
  const genWorkerNode = FLOW_NODES.find((n) => n.id === 'generation_worker')!;
  const textReviewNode = FLOW_NODES.find((n) => n.id === 'content_review_text')!;
  const visionReviewNode = FLOW_NODES.find((n) => n.id === 'content_review_vision')!;
  const outputNode = FLOW_NODES.find((n) => n.id === 'post_published')!;

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-ink">Enrichment Flow</h1>
        <p className="mt-1 text-sm text-muted">
          The LLM pipeline from topic creation to post publication. Click any node to inspect its prompt and model.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        {/* Flow diagram */}
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border bg-canvas p-6 shadow-sm">
          <div className="flex flex-col items-center gap-0 min-w-max mx-auto">

            {/* Trigger */}
            <NodeCard node={triggerNode} isSelected={selectedNode?.id === triggerNode.id} onClick={() => handleNodeClick(triggerNode)} />
            <Arrow />

            {/* Enrichment group */}
            <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4">
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Enrichment Modules (parallel)
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {enrichmentNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    onClick={() => handleNodeClick(node)}
                  />
                ))}
              </div>
            </div>
            <Arrow />

            {/* Review Generation */}
            <NodeCard node={reviewGenNode} isSelected={selectedNode?.id === reviewGenNode.id} onClick={() => handleNodeClick(reviewGenNode)} />
            <Arrow />

            {/* Generation Worker */}
            <NodeCard node={genWorkerNode} isSelected={selectedNode?.id === genWorkerNode.id} onClick={() => handleNodeClick(genWorkerNode)} />
            <Arrow />

            {/* Content Review row */}
            <div className="flex items-center gap-0">
              <NodeCard node={textReviewNode} isSelected={selectedNode?.id === textReviewNode.id} onClick={() => handleNodeClick(textReviewNode)} />
              <Arrow horizontal />
              <NodeCard node={visionReviewNode} isSelected={selectedNode?.id === visionReviewNode.id} onClick={() => handleNodeClick(visionReviewNode)} />
            </div>
            <Arrow />

            {/* Output */}
            <NodeCard node={outputNode} isSelected={selectedNode?.id === outputNode.id} onClick={() => handleNodeClick(outputNode)} />
          </div>
        </div>

        {/* Node detail panel */}
        {selectedNode ? (
          <div className="w-full lg:w-[360px] shrink-0 rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-heading text-base font-bold text-ink">{selectedNode.label}</h2>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="rounded-lg p-1 text-muted hover:bg-border/30 hover:text-ink transition-colors"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted">{selectedNode.description}</p>

            {selectedNode.settingKey && (
              <div className="mt-4 rounded-xl border border-border bg-canvas px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">LLM Configuration</p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {getLlmLabel(selectedNode.settingKey, session)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  Configure in Settings → AI / LLM → Model per feature
                </p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Prompt Template</p>
              <pre className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
                {selectedNode.promptTemplate}
              </pre>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-[360px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-canvas/50 p-8">
            <p className="text-center text-sm text-muted">Click a node to inspect its prompt template and LLM configuration</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-canvas px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-violet-300 bg-violet-100" />
          <span className="text-xs text-muted">Trigger / Input</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-blue-200 bg-blue-50" />
          <span className="text-xs text-muted">Enrichment (parallel LLM calls)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-amber-200 bg-amber-50" />
          <span className="text-xs text-muted">Generation / Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-emerald-300 bg-emerald-100" />
          <span className="text-xs text-muted">Output</span>
        </div>
      </div>
    </div>
  );
}
