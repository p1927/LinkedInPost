import type { ImageGenProvider, ImageGenRequest, ImageGenResult } from '../types';
import { falaiRequest } from '../connectors/falai';

export const fluxKontextProvider: ImageGenProvider = {
  async generate(req: ImageGenRequest, env: Record<string, string | undefined>): Promise<ImageGenResult> {
    const apiKey = env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY is not configured');

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio ?? '1:1',
      num_images: 1,
    };
    // Use first reference image if provided (key feature: SerpApi image → adapted generation)
    const referenceUsed = req.referenceImages?.[0];
    if (referenceUsed) {
      input.image_url = referenceUsed;
    }

    const model = req.model ?? 'fal-ai/flux-kontext-pro';
    const result = await falaiRequest(model, input, apiKey);
    const url = result.images?.[0]?.url;
    if (!url) throw new Error('flux-kontext: no image URL in response');

    return { url, generationPrompt: req.prompt, provider: 'flux-kontext', model, referenceUsed };
  },
};
