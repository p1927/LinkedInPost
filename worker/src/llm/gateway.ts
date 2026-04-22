import { generateGeminiJson, generateGeminiMultimodalJson } from './providers/gemini';
import type { GeminiInlineImagePart } from './providers/gemini';
import { generateGrokJson } from './providers/grok';
import { generateOpenrouterJson } from './providers/openrouter';
import { generateMinimaxJson } from './providers/minimax';
import type { LlmGenerationOptions, LlmRef, WorkerEnvForLlm } from './types';

function isRetryableLlmError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable|empty generation response/i.test(m);
}

/** Returns true for 401/403 auth errors that should never trigger a fallback. */
function isAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /\bstatus 40[13]\b/i.test(err.message);
}

/** Core provider dispatch: routes to Gemini or Grok based on ref.provider. */
export async function generateForRef(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  prompt: string,
  opts?: LlmGenerationOptions,
): Promise<string> {
  const tag = `[LLM ${ref.provider}/${ref.model}]`;
  const start = Date.now();
  console.log(`${tag} REQUEST prompt_chars=${prompt.length} temp=${opts?.temperature ?? 'default'} max_tokens=${opts?.maxOutputTokens ?? 'default'}`);
  try {
    let text: string;
    if (ref.provider === 'gemini') {
      text = await generateGeminiJson(env, ref.model, prompt, opts);
    } else if (ref.provider === 'openrouter') {
      text = await generateOpenrouterJson(env, ref.model, prompt, opts);
    } else if (ref.provider === 'minimax') {
      text = await generateMinimaxJson(env, ref.model, prompt, opts);
    } else {
      text = await generateGrokJson(env, ref.model, prompt, opts);
    }
    console.log(`${tag} OK duration_ms=${Date.now() - start} response_chars=${text.length} preview=${JSON.stringify(text.slice(0, 120))}`);
    return text;
  } catch (err) {
    console.error(`${tag} ERROR duration_ms=${Date.now() - start} error=${String(err)}`);
    throw err;
  }
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

/** Default Gemini model used as the multimodal fallback when the primary provider lacks vision support. */
const GEMINI_MULTIMODAL_FALLBACK_MODEL = 'gemini-2.0-flash';

/**
 * Multimodal dispatch: sends an image + text prompt to a provider that supports vision.
 *
 * - If `ref.provider` is `gemini`, calls `generateGeminiMultimodalJson` directly.
 * - If the provider does not support multimodal (e.g. Grok), falls back to Gemini
 *   using {@link GEMINI_MULTIMODAL_FALLBACK_MODEL}.
 *
 * Auth errors (401/403) are never retried and always rethrown immediately.
 */
export async function generateMultimodalForRef(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  image: GeminiInlineImagePart,
  prompt: string,
): Promise<{ text: string; used: LlmRef }> {
  if (ref.provider === 'gemini') {
    try {
      const text = await generateGeminiMultimodalJson(env, ref.model, image, prompt);
      return { text, used: ref };
    } catch (err) {
      if (isAuthError(err)) throw err;
      if (!isRetryableLlmError(err)) throw err;
      // Retry with the default Gemini multimodal model if the chosen model fails transiently
      const fallbackRef: LlmRef = { provider: 'gemini', model: GEMINI_MULTIMODAL_FALLBACK_MODEL };
      const text = await generateGeminiMultimodalJson(env, fallbackRef.model, image, prompt);
      return { text, used: fallbackRef };
    }
  }

  // Provider does not support multimodal — fall back to Gemini vision
  const fallbackRef: LlmRef = { provider: 'gemini', model: GEMINI_MULTIMODAL_FALLBACK_MODEL };
  const text = await generateGeminiMultimodalJson(env, fallbackRef.model, image, prompt);
  return { text, used: fallbackRef };
}
