import type { ImageGenProvider, ImageGenRequest, ImageGenResult } from '../types';
import { openaiImageRequest } from '../connectors/openai-images';

const ASPECT_TO_SIZE: Record<string, string> = {
  '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '4:3': '1024x1024',
};

export const dalleProvider: ImageGenProvider = {
  async generate(req: ImageGenRequest, env: Record<string, string | undefined>): Promise<ImageGenResult> {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    const model = req.model ?? 'gpt-image-1';
    const size = ASPECT_TO_SIZE[req.aspectRatio ?? '1:1'] ?? '1024x1024';
    const result = await openaiImageRequest(req.prompt, model, size, apiKey);
    return { url: result.url, generationPrompt: req.prompt, provider: 'dall-e', model };
  },
};
