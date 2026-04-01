import type { Env } from '../index';

export interface GenWorkerGenerateRequest {
  spreadsheetId: string;
  topic: string;
  channel?: string;
  audience?: string;
  tone?: string;
  jtbd?: string;
  factual?: boolean;
  mustInclude?: string[];
  mustAvoid?: string[];
  cta?: string;
  constraints?: string;
  composableAssets?: {
    brandContext?: string;
    globalRules?: string;
    fewShotExamples?: string;
    authorProfile?: string;
    reviewChecklist?: string[];
  };
  /** Matches generation worker catalog (`GET /v1/llm/catalog`); omit to use default model for first configured provider. */
  llm?: { provider: 'gemini' | 'grok'; model: string };
  skipImages?: boolean;
}

export interface TextVariant {
  index: number;
  label: string;
  text: string;
}

export interface ImageCandidate {
  id: string;
  url?: string;
  searchQuery?: string;
  generationPrompt?: string;
  visualBrief: string;
  score: number;
  variantIndex?: number;
}

export interface PerVariantImageCandidates {
  variantIndex: number;
  candidates: ImageCandidate[];
}

export interface GenWorkerGenerateResponse {
  runId: string;
  primaryPatternId: string;
  runnerUpPatternId: string;
  patternRationale: string;
  variants: TextVariant[];
  imageCandidates: ImageCandidate[];
  perVariantImageCandidates: PerVariantImageCandidates[];
  review: { passed: boolean; verdict: string; summary: string };
  trace: Record<string, unknown>;
}

export async function callGenerationWorker(
  env: Env,
  req: GenWorkerGenerateRequest,
): Promise<GenWorkerGenerateResponse> {
  const baseUrl = String(env.GENERATION_WORKER_URL || '').trim().replace(/\/$/, '');
  if (!baseUrl) {
    throw new Error('GENERATION_WORKER_URL is not configured. Set it in Worker environment.');
  }
  const secret = String(env.GENERATION_WORKER_SECRET || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  const endpoint = `${baseUrl}/v1/generate`;
  console.log(`[callGenerationWorker] Calling ${endpoint} with topic="${req.topic}" channel="${req.channel}"`);
  console.log(`[callGenerationWorker] Auth header set: ${headers['Authorization'] ? 'YES' : 'NO'}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(120_000), // increased from 60s to 120s
    });
    console.log(`[callGenerationWorker] Response status: ${response.status}`);
  } catch (e) {
    console.log(`[callGenerationWorker] Fetch error: ${String(e)}`);
    throw e;
  }

  if (!response.ok) {
    const text = await response.text();
    console.log(`[callGenerationWorker] Error response: ${text.slice(0, 300)}`);
    throw new Error(`Generation worker error ${response.status}: ${text.slice(0, 200)}`);
  }

  const result = await response.json() as GenWorkerGenerateResponse;
  console.log(`[callGenerationWorker] Success - got variants count: ${result.variants?.length || 0}`);
  return result;
}

export function isGenerationWorkerConfigured(env: Env): boolean {
  return Boolean(String(env.GENERATION_WORKER_URL || '').trim());
}
