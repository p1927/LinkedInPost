import { generateGeminiJson, generateGeminiMultimodalJson } from './providers/gemini';
import type { GeminiInlineImagePart } from './providers/gemini';
import { generateGrokJson } from './providers/grok';
import { generateOpenrouterJson } from './providers/openrouter';
import { generateMinimaxJson } from './providers/minimax';
import type { LlmGenerationOptions, LlmRef, WorkerEnvForLlm } from './types';
import type { D1Database } from '@cloudflare/workers-types';
import { logLlmUsage } from '../db/llm-usage';

export interface GatewayUsageCtx {
  db: D1Database;
  spreadsheetId: string;
  userId: string;
  settingKey: string;
}

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
  usageCtx?: GatewayUsageCtx,
): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number } }> {
  const tag = `[LLM ${ref.provider}/${ref.model}]`;
  const start = Date.now();
  console.log(`${tag} REQUEST prompt_chars=${prompt.length} temp=${opts?.temperature ?? 'default'} max_tokens=${opts?.maxOutputTokens ?? 'default'}`);
  try {
    let result: { text: string; usage: { promptTokens: number; completionTokens: number } };
    if (ref.provider === 'gemini') {
      result = await generateGeminiJson(env, ref.model, prompt, opts);
    } else if (ref.provider === 'openrouter') {
      result = await generateOpenrouterJson(env, ref.model, prompt, opts);
    } else if (ref.provider === 'minimax') {
      result = await generateMinimaxJson(env, ref.model, prompt, opts);
    } else {
      result = await generateGrokJson(env, ref.model, prompt, opts);
    }
    console.log(`${tag} OK duration_ms=${Date.now() - start} response_chars=${result.text.length} usage=${JSON.stringify(result.usage)} preview=${JSON.stringify(result.text.slice(0, 120))}`);
    if (usageCtx) {
      logLlmUsage(usageCtx.db, {
        spreadsheetId: usageCtx.spreadsheetId,
        userId: usageCtx.userId,
        provider: ref.provider,
        model: ref.model,
        settingKey: usageCtx.settingKey,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      }).catch((e) => console.error(`${tag} logLlmUsage failed`, e));
    }
    return result;
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
  usageCtx?: GatewayUsageCtx,
): Promise<{ text: string; used: LlmRef; usage: { promptTokens: number; completionTokens: number } }> {
  try {
    const { text, usage } = await generateForRef(env, primary, prompt, undefined, usageCtx);
    return { text, used: primary, usage };
  } catch (firstErr) {
    if (!fallback || !isRetryableLlmError(firstErr)) {
      throw firstErr;
    }
    try {
      const { text, usage } = await generateForRef(env, fallback, prompt, undefined, usageCtx);
      return { text, used: fallback, usage };
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
): Promise<{ text: string; used: LlmRef; usage: { promptTokens: number; completionTokens: number } }> {
  if (ref.provider === 'gemini') {
    try {
      const { text, usage } = await generateGeminiMultimodalJson(env, ref.model, image, prompt);
      return { text, used: ref, usage };
    } catch (err) {
      if (isAuthError(err)) throw err;
      if (!isRetryableLlmError(err)) throw err;
      // Retry with the default Gemini multimodal model if the chosen model fails transiently
      const fallbackRef: LlmRef = { provider: 'gemini', model: GEMINI_MULTIMODAL_FALLBACK_MODEL };
      const { text, usage } = await generateGeminiMultimodalJson(env, fallbackRef.model, image, prompt);
      return { text, used: fallbackRef, usage };
    }
  }

  // Provider does not support multimodal — fall back to Gemini vision
  const fallbackRef: LlmRef = { provider: 'gemini', model: GEMINI_MULTIMODAL_FALLBACK_MODEL };
  const { text, usage } = await generateGeminiMultimodalJson(env, fallbackRef.model, image, prompt);
  return { text, used: fallbackRef, usage };
}