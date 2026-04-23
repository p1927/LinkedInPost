import type { ImageGenProvider, ImageGenRequest, ImageGenResult } from '../types';
import { falaiRequest } from '../connectors/falai';

export const ideogramProvider: ImageGenProvider = {
  async generate(req: ImageGenRequest, env: Record<string, string | undefined>): Promise<ImageGenResult> {
    const apiKey = env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY is not configured');
    const model = req.model ?? 'fal-ai/ideogram/v3';
    const result = await falaiRequest(model, {
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio ?? '1:1',
      style_type: req.style ?? 'Auto',
    }, apiKey);
    const url = result.images?.[0]?.url;
    if (!url) throw new Error('ideogram: no image URL in response');
    return { url, generationPrompt: req.prompt, provider: 'ideogram', model };
  },
};
