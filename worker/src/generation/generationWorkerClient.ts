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
}

export interface TextVariant {
  index: number;
  label: string;
  text: string;
}

export interface GenWorkerGenerateResponse {
  runId: string;
  primaryPatternId: string;
  runnerUpPatternId: string;
  patternRationale: string;
  variants: TextVariant[];
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

  const response = await fetch(`${baseUrl}/v1/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Generation worker error ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json() as Promise<GenWorkerGenerateResponse>;
}

export function isGenerationWorkerConfigured(env: Env): boolean {
  return Boolean(String(env.GENERATION_WORKER_URL || '').trim());
}
