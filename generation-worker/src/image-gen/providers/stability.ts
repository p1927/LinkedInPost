import type { ImageGenProvider, ImageGenRequest, ImageGenResult } from '../types';
import { stabilityRequest } from '../connectors/stability';

const ASPECT_MAP: Record<string, string> = {
  '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '4:3': '4:3',
};

export const stabilityProvider: ImageGenProvider = {
  async generate(req: ImageGenRequest, env: Record<string, string | undefined>): Promise<ImageGenResult> {
    const apiKey = env.STABILITY_API_KEY;
    if (!apiKey) throw new Error('STABILITY_API_KEY is not configured');
    const model = req.model ?? 'sd3.5-large';
    const aspectRatio = ASPECT_MAP[req.aspectRatio ?? '1:1'] ?? '1:1';
    const result = await stabilityRequest(req.prompt, model, aspectRatio, apiKey);
    return { url: result.url, generationPrompt: req.prompt, provider: 'stability', model };
  },
};
