/** Base fal.ai REST client */
export async function falaiRequest(
  modelPath: string,           // e.g. 'fal-ai/flux-kontext-pro'
  input: Record<string, unknown>,
  apiKey: string,
): Promise<{ images?: Array<{ url: string }>; video?: { url: string } }> {
  const url = `https://fal.run/${modelPath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({ input }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    throw new Error(`fal.ai error ${resp.status} for ${modelPath}: ${err.slice(0, 200)}`);
  }
  return resp.json() as Promise<{ images?: Array<{ url: string }>; video?: { url: string } }>;
}
