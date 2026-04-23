import type { VideoGenProvider, VideoGenRequest, VideoGenResult } from '../types';
import { falaiRequest } from '../connectors/falai';

export const klingProvider: VideoGenProvider = {
  async generate(req: VideoGenRequest, env: Record<string, string | undefined>): Promise<VideoGenResult> {
    const apiKey = env.FAL_API_KEY;
    if (!apiKey) throw new Error('FAL_API_KEY is not configured');
    const model = req.model ?? 'fal-ai/kling-video/v2.1/standard/text-to-video';
    const input: Record<string, unknown> = {
      prompt: req.prompt,
      duration: req.duration ?? 5,
    };
    if (req.referenceImage) input.image_url = req.referenceImage;
    const result = await falaiRequest(model, input, apiKey);
    const url = result.video?.url;
    if (!url) throw new Error('kling: no video URL in response');
    return { url, generationPrompt: req.prompt, provider: 'kling', model };
  },
};
