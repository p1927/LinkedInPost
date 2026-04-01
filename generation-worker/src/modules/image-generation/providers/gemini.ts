// Google Gemini image generation provider
// Uses the Gemini API with response modalities to generate images.
// Model: gemini-2.0-flash-preview-image-generation (default) or imagen-3.0-generate-001

export interface GeminiImageRequest {
  prompt: string;
  model?: string;
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType: string; data: string };
        text?: string;
      }>;
    };
  }>;
}

export async function generateWithGemini(apiKey: string, req: GeminiImageRequest): Promise<string> {
  const model = req.model || 'gemini-2.0-flash-preview-image-generation';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: req.prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini image generation error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as GeminiImageResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData) {
    throw new Error('Gemini returned no image data');
  }

  const { mimeType, data: b64 } = imagePart.inlineData;
  return `data:${mimeType};base64,${b64}`;
}
