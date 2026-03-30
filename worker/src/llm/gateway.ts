import { generateGeminiJson } from './providers/gemini';
import { generateGrokJson } from './providers/grok';
import type { LlmRef } from './types';
import type { WorkerEnvForLlm } from './types';

function isRetryableLlmError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable|empty generation response/i.test(m);
}

async function generateForRef(env: WorkerEnvForLlm, ref: LlmRef, prompt: string): Promise<string> {
  if (ref.provider === 'gemini') {
    return generateGeminiJson(env, ref.model, prompt);
  }
  return generateGrokJson(env, ref.model, prompt);
}

export async function generateTextJsonWithFallback(
  env: WorkerEnvForLlm,
  primary: LlmRef,
  fallback: LlmRef | undefined,
  prompt: string,
): Promise<{ text: string; used: LlmRef }> {
  try {
    const text = await generateForRef(env, primary, prompt);
    return { text, used: primary };
  } catch (firstErr) {
    if (!fallback || !isRetryableLlmError(firstErr)) {
      throw firstErr;
    }
    try {
      const text = await generateForRef(env, fallback, prompt);
      return { text, used: fallback };
    } catch {
      throw firstErr;
    }
  }
}
