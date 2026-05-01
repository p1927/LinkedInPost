/**
 * Preview-only generation endpoints.
 * These produce AI output WITHOUT persisting anything — no D1 writes, no KV.
 */
import { z } from 'zod';
import { resolveGenerationWorkerLlmRef, generateLlmParsedJson } from './llmFromWorker';
import type { Env } from './types';

// ── Quick-change preview ───────────────────────────────────────────────────────

const QuickChangeInputSchema = z.object({
  /** The text to transform. */
  text: z.string().min(1),
  /** "selection" or "whole-post". */
  scope: z.enum(['selection', 'whole-post']),
  /** Instruction for the transformation. */
  instruction: z.string().min(1),
  /** Optional LLM override. */
  model: z.object({
    provider: z.enum(['gemini', 'grok', 'openrouter', 'minimax']),
    model: z.string().min(1),
  }).optional(),
});

type QuickChangeInput = z.infer<typeof QuickChangeInputSchema>;

// ── Variants preview ──────────────────────────────────────────────────────────

const VariantsInputSchema = z.object({
  /** The source text to generate variants from. */
  text: z.string().min(1),
  /** "selection" or "whole-post". */
  scope: z.enum(['selection', 'whole-post']),
  /** Number of variants to generate (default 4, max 8). */
  count: z.number().int().min(1).max(8).default(4),
  /** Optional LLM override. */
  model: z.object({
    provider: z.enum(['gemini', 'grok', 'openrouter', 'minimax']),
    model: z.string().min(1),
  }).optional(),
});

type VariantsInput = z.infer<typeof VariantsInputSchema>;

// ── Shared prompt helpers ───────────────────────────────────────────────────────

async function runQuickChange(input: QuickChangeInput, env: Env): Promise<string> {
  const llmRef = await resolveGenerationWorkerLlmRef(env, input.model ?? undefined);

  const scopeNote = input.scope === 'selection'
    ? 'The input text is a selected passage within a larger post. Transform it in-place with minimal length change.'
    : 'The input text is the full post. Transform it as directed.';

  const prompt = `You are an expert content editor. Transform the text below according to the instruction.

${scopeNote}

TEXT:
${input.text}

INSTRUCTION: ${input.instruction}

Return the transformed text only — no preamble, no explanation, no JSON. Just the final content.`;

  const result = await generateLlmParsedJson<{ text: string }>(env, llmRef, prompt, {
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  return result.text ?? input.text;
}

interface LlmVariantResult {
  label: string;
  text: string;
}

interface LlmVariantsResponse {
  variants: LlmVariantResult[];
}

async function runSingleVariant(
  input: VariantsInput,
  variantIndex: number,
  total: number,
  env: Env,
): Promise<string> {
  const llmRef = await resolveGenerationWorkerLlmRef(env, input.model ?? undefined);

  const letter = String.fromCharCode(65 + variantIndex);
  const scopeNote = input.scope === 'selection'
    ? 'The source text is a selected passage. Produce a standalone variant that could replace or extend it naturally.'
    : 'The source text is the full post. Produce a variant with a different angle, hook, or emphasis.';

  const prompt = `You are an expert content writer. Rewrite the text below as variant ${letter} of ${total}.

${scopeNote}

SOURCE TEXT:
${input.text}

Produce variant ${letter} — different hook or angle from the others, same quality bar, same approximate length.

Return JSON with this exact shape:
{
  "label": "Variant ${letter} — <one-line description>",
  "text": "<full rewritten text>"
}`;

  const result = await generateLlmParsedJson<LlmVariantsResponse>(env, llmRef, prompt, {
    temperature: 0.8,
    maxOutputTokens: 4096,
  });

  return result.variants?.[0]?.text ?? input.text;
}

// ── Public handler (called from index.ts) ────────────────────────────────────

export async function handleQuickChangePreview(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const raw = await request.json();
    const input = QuickChangeInputSchema.parse(raw);
    const preview = await runQuickChange(input, env);
    return json({
      preview,
      scope: input.scope,
      timestamp: Date.now(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.message }, 400);
    return json({ error: String(e) }, 500);
  }
}

export async function handleVariantsPreview(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const raw = await request.json();
    const input = VariantsInputSchema.parse(raw);
    const { count } = input;

    const variants = await Promise.all(
      Array.from({ length: count }, (_, i) => runSingleVariant(input, i, count, env)),
    );

    return json({
      variants,
      scope: input.scope,
      timestamp: Date.now(),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return json({ error: e.message }, 400);
    return json({ error: String(e) }, 500);
  }
}

// ── Internal helpers (must be exported so index.ts can call them) ─────────────

function json(data: unknown, status = 200): Response {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(JSON.stringify(data), { status, headers });
}