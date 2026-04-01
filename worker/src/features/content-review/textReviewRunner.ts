import type { WorkerEnvForLlm } from '../../llm/types';
import type { LlmRef } from '../../llm/types';
import { generateForRef } from '../../llm/gateway';
import { buildTextGuardrailsPrompt } from './prompts/textGuardrails';
import type { TextReviewResult, ContentReviewVerdict } from './types';

function parseTextReviewJson(raw: string): TextReviewResult {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const severityTierRaw = String(parsed.severityTier || 'none');
    const severityTier = (['none', 'low', 'medium', 'high'].includes(severityTierRaw)
      ? severityTierRaw
      : 'none') as TextReviewResult['severityTier'];
    return {
      guardrailsOk: Boolean(parsed.guardrailsOk),
      doubleMeanings: Array.isArray(parsed.doubleMeanings)
        ? parsed.doubleMeanings.map((x) => String(x))
        : [],
      severityTier,
      summary: String(parsed.summary || ''),
      verdict: (['pass', 'flag', 'block'].includes(String(parsed.verdict))
        ? String(parsed.verdict)
        : 'flag') as ContentReviewVerdict,
    };
  } catch {
    return {
      guardrailsOk: false,
      doubleMeanings: [],
      severityTier: 'none',
      summary: 'Could not parse text review response.',
      verdict: 'flag',
    };
  }
}

export async function runTextReview(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  topic: string,
  postText: string,
  channel: string,
): Promise<TextReviewResult> {
  const prompt = buildTextGuardrailsPrompt({ topic, postText, channel });
  try {
    const raw = await generateForRef(env, ref, prompt);
    return parseTextReviewJson(raw);
  } catch (err) {
    return {
      guardrailsOk: false,
      doubleMeanings: [],
      severityTier: 'none',
      summary: `Text review failed: ${err instanceof Error ? err.message : String(err)}`,
      verdict: 'flag',
    };
  }
}
