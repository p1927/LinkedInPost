import { generateForRef } from './gateway';
import type { LlmGenerationOptions, LlmRef, WorkerEnvForLlm } from './types';

function stripJsonCodeFences(text: string): string {
  let s = text.trim();
  // Strip thinking blocks emitted by reasoning models (e.g. MiniMax-M2.7).
  // Two passes: closed blocks first, then any unclosed <think> that extends to end of string
  // (model ran out of tokens mid-thought, so no closing tag is present).
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/<think>[\s\S]*/i, '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  return s.trim();
}

/** JSON structured output: dispatches to Gemini or Grok via gateway.generateForRef. */
export async function generateLlmParsedJson<T>(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  prompt: string,
  opts?: LlmGenerationOptions,
): Promise<T> {
  const { text: raw } = await generateForRef(env, ref, prompt, opts);
  const toParse = stripJsonCodeFences(raw);
  try {
    return JSON.parse(toParse) as T;
  } catch {
    const hint =
      toParse.startsWith('{') && !toParse.trimEnd().endsWith('}')
        ? ' (response looks truncated — try raising maxOutputTokens)'
        : '';
    console.error(`[LLM ${ref.provider}/${ref.model}] JSON_PARSE_FAIL${hint} raw_chars=${toParse.length} raw=${JSON.stringify(toParse.slice(0, 400))}`);
    throw new Error(`LLM returned non-JSON${hint}: ${toParse.slice(0, 200)}`);
  }
}
