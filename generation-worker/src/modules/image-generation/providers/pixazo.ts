// Pixazo Stable Diffusion XL image generation provider
// API: POST https://gateway.pixazo.ai/getImage/v1/getSDXLImage

export interface PixazoRequest {
  prompt: string;
  negative_prompt?: string;
  height?: number;
  width?: number;
  num_steps?: number;
  guidance_scale?: number;
  seed?: number;
}

export interface PixazoResult {
  imageUrl: string;
}

export async function generateWithPixazo(apiKey: string, req: PixazoRequest): Promise<PixazoResult> {
  const response = await fetch('https://gateway.pixazo.ai/getImage/v1/getSDXLImage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`Pixazo API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PixazoResult>;
}
