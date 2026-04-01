import type { LlmRef } from '../../llmFromWorker';
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import type { Env, RequirementReport } from '../../types';
import type { EnrichmentBundle, EnrichedTextVariant, ScoredVariant, VariantScores } from './types';
import { successFramework } from '../stickiness/index';
import { viralStructures, engagementTriggers } from '../viral-patterns/index';
import { buildKnowledgeContext } from './knowledgeLoader';

// ---------------------------------------------------------------------------
// Stage 1: Rule-based pre-filter
// ---------------------------------------------------------------------------

const CHANNEL_MAX_CHARS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 5000,
  gmail: 5000,
  whatsapp: 500,
  telegram: 4096,
};

function hasHook(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  return firstLine.split(/\s+/).length >= 3;
}

function ruleFilter(
  variants: EnrichedTextVariant[],
  report: RequirementReport,
): EnrichedTextVariant[] {
  const maxChars = CHANNEL_MAX_CHARS[report.channel.toLowerCase()] ?? 3000;
  const seenHookStarts = new Set<string>();

  return variants.filter((v) => {
    // Character limit
    if (v.text.length > maxChars) return false;

    // Hook present
    if (!hasHook(v.text)) return false;

    // No duplicate hook openings (first 50 chars)
    const hookStart = v.text.slice(0, 50).toLowerCase();
    if (seenHookStarts.has(hookStart)) return false;
    seenHookStarts.add(hookStart);

    // Must include
    if (report.mustInclude?.length) {
      const textLower = v.text.toLowerCase();
      if (report.mustInclude.some((term) => !textLower.includes(term.toLowerCase()))) return false;
    }

    // Must avoid
    if (report.mustAvoid?.length) {
      const textLower = v.text.toLowerCase();
      if (report.mustAvoid.some((term) => textLower.includes(term.toLowerCase()))) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Stage 2: LLM-as-judge scoring
// ---------------------------------------------------------------------------

interface LlmJudgeResponse {
  scores: Array<{
    variantIndex: number;
    stickiness: number;
    viralPotential: number;
    personaFit: number;
    emotionalImpact: number;
    rationale: string;
  }>;
}

function defaultScores(rationale: string): VariantScores {
  return {
    stickiness: 5,
    viralPotential: 5,
    personaFit: 5,
    emotionalImpact: 5,
    weightedTotal: 5,
    rationale,
  };
}

async function llmJudge(
  variants: EnrichedTextVariant[],
  bundle: EnrichmentBundle,
  env: Env,
  llmRef: LlmRef,
): Promise<ScoredVariant[]> {
  const rubrics = buildKnowledgeContext({
    'Stickiness Rubric (SUCCESs)': successFramework,
    'Viral Patterns': viralStructures,
    'Engagement Triggers': engagementTriggers,
  });

  const variantList = variants
    .map((v, i) => `[${i}] ${v.label}\n${v.text.slice(0, 800)}`)
    .join('\n\n---\n\n');

  const prompt = `You are a content evaluation expert. Score each variant on 4 dimensions.

SCORING RUBRICS:
${rubrics}

TARGET PERSONA: ${bundle.persona.name}
Persona concerns: ${bundle.persona.concerns.slice(0, 3).join(', ')}
Target emotion: ${bundle.emotion.primaryEmotion} (intensity ${bundle.emotion.intensity}/10)
Emotional arc: ${bundle.emotion.arc}

VARIANTS TO SCORE:
${variantList}

Score each on 0-10 scale:
- stickiness: How memorable? (SUCCESs framework)
- viralPotential: How shareable? (viral patterns + engagement triggers)
- personaFit: How well does it speak to ${bundle.persona.name}?
- emotionalImpact: Does it land the ${bundle.emotion.primaryEmotion} emotion?

Return JSON:
{
  "scores": [
    { "variantIndex": 0, "stickiness": 7, "viralPotential": 8, "personaFit": 6, "emotionalImpact": 7, "rationale": "<1 sentence>" }
  ]
}`;

  const result = await generateLlmParsedJson<LlmJudgeResponse>(env, llmRef, prompt, {
    temperature: 0.3,
    maxOutputTokens: 2000,
  });

  const scored: ScoredVariant[] = variants.map((v, i) => {
    const score = result.scores?.find((s) => s.variantIndex === i);
    const stickiness = score?.stickiness ?? 5;
    const viralPotential = score?.viralPotential ?? 5;
    const personaFit = score?.personaFit ?? 5;
    const emotionalImpact = score?.emotionalImpact ?? 5;
    const weightedTotal = stickiness * 0.3 + viralPotential * 0.3 + personaFit * 0.2 + emotionalImpact * 0.2;

    const scores: VariantScores = {
      stickiness,
      viralPotential,
      personaFit,
      emotionalImpact,
      weightedTotal,
      rationale: score?.rationale ?? '',
    };

    return { ...v, scores };
  });

  return scored.sort((a, b) => b.scores.weightedTotal - a.scores.weightedTotal);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function selectTopVariants(
  variants: EnrichedTextVariant[],
  bundle: EnrichmentBundle,
  report: RequirementReport,
  env: Env,
  llmRef: LlmRef,
  topN = 4,
): Promise<ScoredVariant[]> {
  // Stage 1: Rule filter
  const filtered = ruleFilter(variants, report);

  if (filtered.length === 0) {
    return variants.slice(0, topN).map((v) => ({
      ...v,
      scores: defaultScores('No variants passed rule filter; using fallback'),
    }));
  }

  // Stage 2: LLM judge (if available)
  if (!hasAnyLlmProvider(env)) {
    return filtered.slice(0, topN).map((v) => ({
      ...v,
      scores: defaultScores('No LLM available; using rule-filtered order'),
    }));
  }

  try {
    const scored = await llmJudge(filtered, bundle, env, llmRef);
    return scored.slice(0, topN);
  } catch {
    return filtered.slice(0, topN).map((v) => ({
      ...v,
      scores: defaultScores('LLM judge failed; using rule-filtered order'),
    }));
  }
}
