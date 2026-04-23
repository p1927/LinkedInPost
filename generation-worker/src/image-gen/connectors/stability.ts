export async function stabilityRequest(
  prompt: string,
  model: string,           // e.g. 'sd3.5-large'
  aspectRatio: string,
  apiKey: string,
): Promise<{ url: string }> {
  const resp = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/sd3`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: (() => {
      const fd = new FormData();
      fd.append('prompt', prompt);
      fd.append('model', model);
      fd.append('aspect_ratio', aspectRatio);
      fd.append('output_format', 'jpeg');
      return fd;
    })(),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    throw new Error(`Stability AI error ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json() as { image: string; finish_reason: string };
  // Returns base64 image — wrap as data URL (caller should upload to GCS)
  return { url: `data:image/jpeg;base64,${data.image}` };
}
