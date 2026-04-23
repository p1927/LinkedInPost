// Seedance (ByteDance) image generation provider
// Uses the Ark API (OpenAI-compatible endpoint).
// Endpoint: https://ark.cn-beijing.volces.com/api/v3/images/generations
// Models: seedance-1-lite (default), seedance-1

export interface SeedanceRequest {
  prompt: string;
  model?: string;
  size?: string;
  n?: number;
}

interface SeedanceResponse {
  data?: Array<{ url?: string; b64_json?: string }>;
}

export async function generateWithSeedance(apiKey: string, req: SeedanceRequest): Promise<string> {
  const model = req.model || 'seedance-1-lite';

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: req.prompt,
      size: req.size || '1024x1024',
      n: req.n ?? 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Seedance API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as SeedanceResponse;
  const item = data.data?.[0];

  if (!item) {
    throw new Error('Seedance returned no image data');
  }

  if (item.url) {
    return item.url;
  }

  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  throw new Error('Seedance response missing url and b64_json');
}
