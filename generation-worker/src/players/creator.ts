import { callGeminiJson } from '../gemini';
import type { ComposableAssets, Pattern, RequirementReport, TextVariant } from '../types';
import type { ResearchArticleRef } from '@linkedinpost/researcher';

interface LlmVariantsResponse {
  variants: Array<{
    label: string;
    text: string;
  }>;
}

function buildResearchBlock(articles: ResearchArticleRef[]): string {
  if (articles.length === 0) return 'No research — write from general knowledge.';
  return articles
    .slice(0, 10)
    .map((a, i) => `[${i + 1}] ${a.title} — ${a.url}\n    ${a.snippet ?? ''}`)
    .join('\n');
}

function buildAssetsBlock(assets: ComposableAssets): string {
  const parts: string[] = [];
  if (assets.brandContext) parts.push(`Brand context: ${assets.brandContext}`);
  if (assets.authorProfile) parts.push(`Author profile: ${assets.authorProfile}`);
  if (assets.globalRules) parts.push(`Global rules: ${assets.globalRules}`);
  if (assets.fewShotExamples) parts.push(`Examples of good posts:\n${assets.fewShotExamples}`);
  if (assets.reviewChecklist?.length) parts.push(`Quality checklist: ${assets.reviewChecklist.join(', ')}`);
  return parts.join('\n\n');
}

export async function createVariants(
  pattern: Pattern,
  report: RequirementReport,
  research: ResearchArticleRef[],
  assets: ComposableAssets,
  env: { GEMINI_API_KEY?: string },
): Promise<TextVariant[]> {
  const apiKey = String(env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return [{ index: 0, label: 'Draft', text: `[No GEMINI_API_KEY] Topic: ${report.topic}` }];
  }

  const prompt = `You are an expert LinkedIn content writer. Write 3 comparable post variants using the pattern below.

PATTERN: ${pattern.name}
Pattern outline:
${pattern.outline}

Writer guidance:
${pattern.writerSnippet}

${pattern.fewShotLines?.length ? `Example lines:\n${pattern.fewShotLines.map((l: string) => `• ${l}`).join('\n')}` : ''}

---
POST REQUIREMENTS:
- Topic: ${report.topic}
- Channel: ${report.channel}
- Audience: ${report.audience || 'general professionals'}
- Tone: ${report.tone || 'professional'}
- Job-to-be-done: ${report.jtbd || 'not specified'}
${report.mustInclude?.length ? `- Must include: ${report.mustInclude.join(', ')}` : ''}
${report.mustAvoid?.length ? `- Must avoid: ${report.mustAvoid.join(', ')}` : ''}
${report.cta ? `- CTA: ${report.cta}` : ''}
${report.constraints ? `- Constraints: ${report.constraints}` : ''}

---
RESEARCH MATERIAL:
${buildResearchBlock(research)}

---
${buildAssetsBlock(assets)}

---
INSTRUCTIONS:
Write exactly 3 variants. Each variant MUST:
1. Follow the same pattern (${pattern.name}) — same structure, different hook/angle/emphasis
2. Be platform-native for ${report.channel} (appropriate length, formatting, tone)
3. Be complete and publication-ready
4. Ground any factual claims in the research material if provided

Return JSON with this exact shape:
{
  "variants": [
    { "label": "Variant A — <hook style>", "text": "<full post text>" },
    { "label": "Variant B — <hook style>", "text": "<full post text>" },
    { "label": "Variant C — <hook style>", "text": "<full post text>" }
  ]
}`;

  const result = await callGeminiJson<LlmVariantsResponse>(apiKey, prompt, {
    temperature: 0.8,
    maxOutputTokens: 3000,
  });

  if (!Array.isArray(result.variants) || result.variants.length === 0) {
    throw new Error('Creator: LLM returned no variants');
  }

  return result.variants.map((v, i) => ({
    index: i,
    label: v.label ?? `Variant ${String.fromCharCode(65 + i)}`,
    text: v.text ?? '',
  }));
}
