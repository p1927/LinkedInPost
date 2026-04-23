export async function runwayRequest(
  prompt: string,
  model: string,       // e.g. 'gen4_turbo'
  duration: number,
  apiKey: string,
  referenceImage?: string,
): Promise<{ url: string }> {
  // Create generation task
  const body: Record<string, unknown> = { textPrompt: prompt, model, duration };
  if (referenceImage) body.promptImage = referenceImage;
  const createResp = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(body),
  });
  if (!createResp.ok) {
    const err = await createResp.text().catch(() => createResp.statusText);
    throw new Error(`Runway error ${createResp.status}: ${err.slice(0, 200)}`);
  }
  const task = await createResp.json() as { id: string };
  // Poll for completion (max 2 minutes)
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const pollResp = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' },
    });
    const status = await pollResp.json() as { status: string; output?: string[] };
    if (status.status === 'SUCCEEDED' && status.output?.[0]) return { url: status.output[0] };
    if (status.status === 'FAILED') throw new Error('Runway task failed');
  }
  throw new Error('Runway task timed out after 2 minutes');
}
