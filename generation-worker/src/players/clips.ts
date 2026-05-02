/** Clips persistence via KV (Cloudflare Workers). */
import type { Env } from '../types';
import { SaveClipRequestSchema } from '../types';
import type { SavedClip } from '../types';

const CLIPS_KV_PREFIX = 'clips:';

function clipsKey(userId: string, clipId: string): string {
  return `${CLIPS_KV_PREFIX}${userId}:${clipId}`;
}

function clipsListKey(userId: string): string {
  return `${CLIPS_KV_PREFIX}${userId}:`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleSaveClip(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const raw = await request.json();
    const data = SaveClipRequestSchema.parse(raw);

    const clipId = crypto.randomUUID();
    const key = clipsKey(data.sessionId, clipId);
    const record: SavedClip = {
      id: clipId,
      sessionId: data.sessionId,
      clip: data.clip,
      clippedAt: new Date().toISOString(),
    };

    await env.CLIPS_KV.put(key, JSON.stringify(record));

    return json({ saved: true, id: clipId, clippedAt: record.clippedAt }, 200);
  } catch (e) {
    if (e instanceof Error && 'issues' in e) {
      return json({ error: String(e) }, 400);
    }
    return json({ error: String(e) }, 500);
  }
}

export async function handleGetClips(
  sessionId: string,
  env: Env,
): Promise<Response> {
  try {
    const prefix = clipsListKey(sessionId);
    const list = await env.CLIPS_KV.list({ prefix });
    if (!list.keys.length) {
      return json({ clips: [], clippedAt: new Date().toISOString() }, 200);
    }

    const records: SavedClip[] = await Promise.all(
      list.keys
        .map(k => {
          const raw = k.name;
          const clipId = raw.split(':').pop() ?? '';
          return env.CLIPS_KV.get(raw, 'text');
        })
        .map(async (p, i) => {
          const raw = await p;
          if (!raw) return null;
          try {
            const clip = JSON.parse(raw) as SavedClip;
            return clip;
          } catch {
            return null;
          }
        }),
    );

    const valid = records.filter(Boolean) as SavedClip[];
    // Sort by clippedAt descending
    valid.sort((a, b) => (b.clippedAt > a.clippedAt ? 1 : -1));

    return json({ clips: valid }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function handleDeleteClip(
  sessionId: string,
  clipId: string,
  env: Env,
): Promise<Response> {
  try {
    const key = clipsKey(sessionId, clipId);
    await env.CLIPS_KV.delete(key);
    return json({ deleted: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}