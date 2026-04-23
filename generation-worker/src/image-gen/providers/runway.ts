import type { VideoGenProvider, VideoGenRequest, VideoGenResult } from '../types';
import { runwayRequest } from '../connectors/runway';

export const runwayProvider: VideoGenProvider = {
  async generate(req: VideoGenRequest, env: Record<string, string | undefined>): Promise<VideoGenResult> {
    const apiKey = env.RUNWAY_API_KEY;
    if (!apiKey) throw new Error('RUNWAY_API_KEY is not configured');
    const model = req.model ?? 'gen4_turbo';
    const duration = req.duration ?? 5;
    const result = await runwayRequest(req.prompt, model, duration, apiKey, req.referenceImage);
    return { url: result.url, generationPrompt: req.prompt, provider: 'runway', model };
  },
};
