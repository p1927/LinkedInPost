import type { Env, ImageCandidate } from '../../types';
import { generateWithPixazo } from './providers/pixazo';
import { generateWithGemini } from './providers/gemini';
import { generateWithSeedance } from './providers/seedance';

const NEGATIVE_PROMPT =
  'blurry, low quality, distorted text, watermark, logo, signature, grainy, overexposed';

export type ImageGenProvider = 'pixazo' | 'gemini' | 'seedance';

interface ImageGenConfig {
  provider?: ImageGenProvider;
  model?: string;
}

async function generateUrl(prompt: string, env: Env, config: ImageGenConfig): Promise<string> {
  const provider = config.provider ?? 'pixazo';

  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    return generateWithGemini(env.GEMINI_API_KEY, { prompt, model: config.model });
  }

  if (provider === 'seedance') {
    if (!env.SEEDANCE_API_KEY) throw new Error('SEEDANCE_API_KEY not configured');
    return generateWithSeedance(env.SEEDANCE_API_KEY, { prompt, model: config.model });
  }

  // Default: pixazo
  if (!env.PIXAZO_API_KEY) throw new Error('PIXAZO_API_KEY not configured');
  return generateWithPixazo(env.PIXAZO_API_KEY, {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    height: 1024,
    width: 1024,
    num_steps: 30,
    guidance_scale: 7.5,
  }).then((r) => r.imageUrl);
}

function hasProviderKey(provider: ImageGenProvider, env: Env): boolean {
  if (provider === 'gemini') return Boolean(env.GEMINI_API_KEY);
  if (provider === 'seedance') return Boolean(env.SEEDANCE_API_KEY);
  return Boolean(env.PIXAZO_API_KEY);
}

/**
 * Generate images for a single variant.
 * Respects the provider/model selection from workspace config.
 * Returns empty array if the required API key is not set, or prompts are empty.
 */
export async function generateImagesForVariant(
  genPrompts: string[],
  visualBrief: string,
  variantIndex: number,
  env: Env,
  config: ImageGenConfig = {},
): Promise<ImageCandidate[]> {
  const provider = config.provider ?? 'pixazo';

  if (!hasProviderKey(provider, env) || genPrompts.length === 0) {
    return [];
  }

  const topPrompts = genPrompts.slice(0, 2);

  const settled = await Promise.allSettled(
    topPrompts.map((prompt, i) =>
      generateUrl(prompt, env, config).then(
        (url): ImageCandidate => ({
          id: `${provider}-${variantIndex}-${i}`,
          url,
          generationPrompt: prompt,
          visualBrief,
          score: 0.95 - i * 0.05,
          variantIndex,
        }),
      ),
    ),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<ImageCandidate> => r.status === 'fulfilled')
    .map((r) => r.value);
}
