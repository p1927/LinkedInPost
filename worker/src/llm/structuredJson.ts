import { generateGeminiJson } from './providers/gemini';
import { generateGrokJson } from './providers/grok';
import type { LlmGenerationOptions, LlmRef, WorkerEnvForLlm } from './types';

/** JSON structured output: Gemini or Grok via existing provider modules. */
export async function generateLlmParsedJson<T>(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  prompt: string,
  opts?: LlmGenerationOptions,
): Promise<T> {
  const raw =
    ref.provider === 'gemini'
      ? await generateGeminiJson(env, ref.model, prompt, opts)
      : await generateGrokJson(env, ref.model, prompt, opts);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
  }
}
