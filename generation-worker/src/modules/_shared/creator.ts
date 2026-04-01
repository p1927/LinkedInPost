import type { LlmRef } from '../../llmFromWorker';
import { generateLlmParsedJson } from '../../llmFromWorker';
import type { ComposableAssets, Env, Pattern, RequirementReport } from '../../types';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import type { EnrichmentBundle, EnrichedTextVariant } from './types';

interface LlmGroupResponse {
  variants: Array<{
    label: string;
    text: string;
    hookType: string;
  }>;
}

const CHANNEL_MAX_CHARS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 5000,
  gmail: 5000,
  whatsapp: 500,
  telegram: 4096,
};

function buildResearchBlock(articles: ResearchArticleRef[]): string {
  if (articles.length === 0) return 'No research — write from general knowledge.';
  return articles
    .slice(0, 8)
    .map((a, i) => `[${i + 1}] ${a.title} — ${a.snippet ?? ''}`)
    .join('\n');
}

function buildAssetsBlock(assets: ComposableAssets): string {
  const parts: string[] = [];
  if (assets.brandContext) parts.push(`Brand context: ${assets.brandContext}`);
  if (assets.authorProfile) parts.push(`Author profile: ${assets.authorProfile}`);
  if (assets.globalRules) parts.push(`Global rules: ${assets.globalRules}`);
  if (assets.fewShotExamples) parts.push(`Examples:\n${assets.fewShotExamples}`);
  return parts.join('\n\n');
}

interface GroupConfig {
  name: string;
  emphasis: string;
  signalWeights: Record<string, number>;
  variantCount: number;
}

const GROUPS: GroupConfig[] = [
  {
    name: 'emotion-story',
    emphasis: 'Lead with emotional arc and narrative structure. Use psychology and persuasion as supporting elements.',
    signalWeights: { emotion: 0.35, story: 0.35, psychology: 0.15, persuasion: 0.15 },
    variantCount: 3,
  },
  {
    name: 'persuasion-psychology',
    emphasis: 'Lead with the persuasion framework. Use cognitive biases as structural elements. Build the argument methodically.',
    signalWeights: { persuasion: 0.35, psychology: 0.35, emotion: 0.15, copy: 0.15 },
    variantCount: 3,
  },
  {
    name: 'viral-copy',
    emphasis: 'Optimize for engagement metrics. Hook-driven, punchy, share-optimized. Viral patterns and copywriting techniques front and center.',
    signalWeights: { copy: 0.35, viral: 0.35, emotion: 0.15, persuasion: 0.15 },
    variantCount: 3,
  },
  {
    name: 'balanced',
    emphasis: 'Even weighting across all signals. Natural, well-rounded content that integrates all enrichment signals smoothly.',
    signalWeights: { emotion: 0.2, psychology: 0.15, persuasion: 0.15, copy: 0.2, story: 0.15, viral: 0.15 },
    variantCount: 3,
  },
];

function buildGroupPrompt(
  group: GroupConfig,
  bundle: EnrichmentBundle,
  pattern: Pattern,
  report: RequirementReport,
  research: ResearchArticleRef[],
  assets: ComposableAssets,
  maxChars: number,
): string {
  return `You are an expert content writer. Write ${group.variantCount} post variants using the enrichment signals below.

GROUP EMPHASIS: ${group.emphasis}

PATTERN: ${pattern.name}
${pattern.outline}
Writer guidance: ${pattern.writerSnippet}

TARGET PERSONA: ${bundle.persona.name}
Concerns: ${bundle.persona.concerns.slice(0, 3).join(', ')}
Language: ${bundle.persona.language}
Decision drivers: ${bundle.persona.decisionDrivers.slice(0, 3).join(', ')}

EMOTION SIGNAL:
Primary: ${bundle.emotion.primaryEmotion} (intensity ${bundle.emotion.intensity}/10)
Arc: ${bundle.emotion.arc}
Hook trigger: ${bundle.emotion.emotionalHook}

PSYCHOLOGY SIGNAL:
Maslow level: ${bundle.psychology.maslowLevel}
Primary bias: ${bundle.psychology.primaryBias}
Behavioral trigger: ${bundle.psychology.behavioralTrigger}
Frame: ${bundle.psychology.psychologicalFrame}

PERSUASION SIGNAL:
Framework: ${bundle.persuasion.framework}
Steps: ${bundle.persuasion.frameworkSteps.join(' → ')}
Principles: ${bundle.persuasion.principles.join(', ')}
Proof type: ${bundle.persuasion.proofType}

COPYWRITING SIGNAL:
Hook type: ${bundle.copy.hookType}
Hook example: ${bundle.copy.hookExample}
Power words: ${bundle.copy.powerWords.join(', ')}
CTA: ${bundle.copy.ctaStyle} — "${bundle.copy.ctaPhrase}"
Rhythm: ${bundle.copy.sentenceRhythm}

STORY SIGNAL:
Structure: ${bundle.story.structure}
Protagonist: ${bundle.story.protagonist}
Devices: ${bundle.story.devices.join(', ')}
Tension: ${bundle.story.tensionPoint}

TYPOGRAPHY:
Format: ${bundle.typography.lineBreakStrategy}, ${bundle.typography.whitespaceRatio}
Emoji: ${bundle.typography.emojiUsage}

VOCABULARY SIGNAL:
Industry terms: ${bundle.vocabulary.industryTerms.join(', ')}
Power phrases: ${bundle.vocabulary.powerPhrases.join(', ')}
Avoid: ${bundle.vocabulary.avoidWords.join(', ')}
Register: ${bundle.vocabulary.registerLevel}
Jargon budget: ${bundle.vocabulary.jargonBudget}/10

TRENDING SIGNAL:
${bundle.trending.trendingTopics.length > 0 ? `Trending topics: ${bundle.trending.trendingTopics.join(', ')}` : ''}
${bundle.trending.buzzwords.length > 0 ? `Buzzwords: ${bundle.trending.buzzwords.join(', ')}` : ''}
${bundle.trending.genZSlang.length > 0 ? `GenZ/internet terms: ${bundle.trending.genZSlang.join(', ')}` : ''}
${bundle.trending.timelySuggestion ? `Timely angle: ${bundle.trending.timelySuggestion}` : ''}
Trend confidence: ${bundle.trending.trendConfidence}/10

POST REQUIREMENTS:
- Topic: ${report.topic}
- Channel: ${report.channel}
- Audience: ${report.audience || 'general professionals'}
- Tone: ${report.tone || 'professional'}
${report.mustInclude?.length ? `- Must include: ${report.mustInclude.join(', ')}` : ''}
${report.mustAvoid?.length ? `- Must avoid: ${report.mustAvoid.join(', ')}` : ''}
${report.cta ? `- CTA: ${report.cta}` : ''}

RESEARCH: ${buildResearchBlock(research)}

${buildAssetsBlock(assets)}

Write exactly ${group.variantCount} variants. Each MUST:
1. Stay under ${maxChars} characters
2. Follow the ${group.emphasis.split('.')[0].toLowerCase()} emphasis
3. Be complete and publication-ready
4. Use the designated hook type and emotional arc

Return JSON:
{
  "variants": [
    { "label": "Variant — <angle>", "text": "<full post>", "hookType": "<hook used>" }
  ]
}`;
}

export async function createEnrichedVariants(
  pattern: Pattern,
  report: RequirementReport,
  research: ResearchArticleRef[],
  bundle: EnrichmentBundle,
  assets: ComposableAssets,
  env: Env,
  llmRef: LlmRef,
): Promise<EnrichedTextVariant[]> {
  const maxChars = CHANNEL_MAX_CHARS[report.channel.toLowerCase()] ?? 3000;

  // Run 4 groups in parallel
  const groupResults = await Promise.all(
    GROUPS.map(async (group, groupIdx) => {
      const prompt = buildGroupPrompt(group, bundle, pattern, report, research, assets, maxChars);
      try {
        const result = await generateLlmParsedJson<LlmGroupResponse>(env, llmRef, prompt, {
          temperature: 0.8,
          maxOutputTokens: 4000,
        });
        if (!Array.isArray(result.variants)) return [];
        return result.variants.map((v, i) => ({
          index: groupIdx * 3 + i,
          label: v.label ?? `${group.name} ${String.fromCharCode(65 + i)}`,
          text: v.text ?? '',
          emphasisGroup: group.name,
          signalWeights: group.signalWeights,
          hookType: v.hookType ?? bundle.copy.hookType,
          persuasionFramework: bundle.persuasion.framework,
          emotionalArc: bundle.emotion.arc,
        }));
      } catch {
        return [];
      }
    }),
  );

  return groupResults.flat().filter((v) => v.text.length > 0);
}
