export async function openaiImageRequest(
  prompt: string,
  model: string,           // 'gpt-image-1' or 'dall-e-3'
  size: string,            // '1024x1024', '1792x1024', etc.
  apiKey: string,
): Promise<{ url: string }> {
  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, prompt, n: 1, size }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    throw new Error(`OpenAI Images error ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json() as { data: Array<{ url: string }> };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('OpenAI Images: no URL in response');
  return { url };
}
