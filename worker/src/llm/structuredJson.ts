import { generateForRef } from './gateway';
import type { LlmGenerationOptions, LlmRef, WorkerEnvForLlm } from './types';

/** JSON structured output: dispatches to Gemini or Grok via gateway.generateForRef. */
export async function generateLlmParsedJson<T>(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  prompt: string,
  opts?: LlmGenerationOptions,
): Promise<T> {
  const raw = await generateForRef(env, ref, prompt, opts);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
  }
}
