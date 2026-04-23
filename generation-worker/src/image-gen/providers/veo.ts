import type { VideoGenProvider, VideoGenRequest, VideoGenResult } from '../types';

export const veoProvider: VideoGenProvider = {
  async generate(req: VideoGenRequest, env: Record<string, string | undefined>): Promise<VideoGenResult> {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    const model = req.model ?? 'veo-2.0-generate-preview';

    // Submit generation request
    const createResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateVideo`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          instances: [{ prompt: req.prompt }],
          parameters: { aspectRatio: '16:9', sampleCount: 1 },
        }),
      },
    );
    if (!createResp.ok) {
      const err = await createResp.text().catch(() => createResp.statusText);
      throw new Error(`Veo error ${createResp.status}: ${err.slice(0, 200)}`);
    }
    const operation = await createResp.json() as { name: string };

    // Poll for completion (max 3 minutes)
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));
      const pollResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operation.name}`,
        { headers: { 'x-goog-api-key': apiKey } },
      );
      const status = await pollResp.json() as {
        done?: boolean;
        response?: { videos?: Array<{ uri: string }> };
        error?: { message: string };
      };
      if (status.error) throw new Error(`Veo operation failed: ${status.error.message}`);
      if (status.done) {
        const url = status.response?.videos?.[0]?.uri;
        if (!url) throw new Error('Veo: no video URL in completed operation');
        return { url, generationPrompt: req.prompt, provider: 'veo', model };
      }
    }
    throw new Error('Veo task timed out after 3 minutes');
  },
};
