import type { LlmRef } from '../llmFromWorker';
import { generateLlmParsedJson, hasAnyLlmProvider } from '../llmFromWorker';
import type { Env, RequirementReport } from '../types';
import type { PatternRepository } from './patternRepository';

interface FinderResult {
  primaryId: string;
  runnerUpId: string;
  rationale: string;
  confidence: number;
}

interface LlmRankResponse {
  primaryId: string;
  runnerUpId: string;
  rationale: string;
  confidence: number;
}

export async function findPattern(
  repo: PatternRepository,
  report: RequirementReport,
  env: Env,
  llmRef: LlmRef,
  preferPatternId?: string,
): Promise<FinderResult> {
  const all = repo.getAll();
  if (all.length === 0) throw new Error('PatternRepository is empty');

  // Fast path: if caller specifies a valid pattern and we have >=2 patterns
  if (preferPatternId && repo.getById(preferPatternId)) {
    const others = all.filter((p) => p.id !== preferPatternId);
    const runnerUp = others[0]?.id ?? preferPatternId;
    return { primaryId: preferPatternId, runnerUpId: runnerUp, rationale: 'Caller-specified pattern', confidence: 1 };
  }

  // Step 1: deterministic tag pre-filter → top-K candidates
  const channelFiltered = all.filter(
    (p) => p.tags.channels.length === 0 || p.tags.channels.includes(report.channel),
  );
  const candidates = channelFiltered.length >= 2 ? channelFiltered : all;

  // If only 1-2 patterns after filter, skip LLM
  if (candidates.length === 1) {
    return { primaryId: candidates[0].id, runnerUpId: candidates[0].id, rationale: 'Only one matching pattern', confidence: 0.8 };
  }

  if (!hasAnyLlmProvider(env)) {
    return { primaryId: candidates[0].id, runnerUpId: candidates[1].id, rationale: 'No LLM provider — defaulted to first match', confidence: 0.5 };
  }

  // Step 2: LLM ranking over compact summaries
  const summaries = candidates.map((p) => ({
    id: p.id,
    name: p.name,
    whenToUse: p.whenToUse,
    tags: p.tags,
  }));

  const prompt = `You are a content strategy expert. Given the requirements below, select the BEST matching post pattern from the candidates.

REQUIREMENTS:
- Topic: ${report.topic}
- Channel: ${report.channel}
- Audience: ${report.audience || 'general professionals'}
- Tone: ${report.tone || 'professional'}
- Job-to-be-done: ${report.jtbd || 'not specified'}
- Factual/news content: ${report.factual ? 'yes' : 'no'}
- Content summary: ${report.contentSummary || 'none'}

PATTERN CANDIDATES (compact summaries):
${JSON.stringify(summaries, null, 2)}

Return JSON with this exact shape:
{
  "primaryId": "<id of best pattern>",
  "runnerUpId": "<id of second-best pattern>",
  "rationale": "<1-2 sentence explanation of why primaryId fits best>",
  "confidence": <0.0-1.0>
}`;

  try {
    const result = await generateLlmParsedJson<LlmRankResponse>(env, llmRef, prompt, {
      temperature: 0.2,
      maxOutputTokens: 512,
    });

    const primary = repo.getById(result.primaryId) ? result.primaryId : candidates[0].id;
    const runnerUp = repo.getById(result.runnerUpId) && result.runnerUpId !== primary
      ? result.runnerUpId
      : candidates.find((p) => p.id !== primary)?.id ?? primary;

    return {
      primaryId: primary,
      runnerUpId: runnerUp,
      rationale: result.rationale ?? '',
      confidence: result.confidence ?? 0.8,
    };
  } catch {
    return { primaryId: candidates[0].id, runnerUpId: candidates[1]?.id ?? candidates[0].id, rationale: 'LLM ranking failed — fallback', confidence: 0.5 };
  }
}
