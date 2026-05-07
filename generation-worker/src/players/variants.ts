/** Variants persistence via KV (Cloudflare Workers). */
import type { Env } from '../types';
import { SaveVariantsRequestSchema } from '../types';
import type { SaveVariantsResponse, SavedVariantsRecord } from '../types';

const VARIANTS_KV_PREFIX = 'variants:';

function variantsKey(sessionId: string, timestamp: number): string {
  return `${VARIANTS_KV_PREFIX}${sessionId}:${timestamp}`;
}

function listVariantsKeys(sessionId: string): string {
  return `${VARIANTS_KV_PREFIX}${sessionId}:`;
}

export async function handleSaveVariants(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const raw = await request.json();
    const data = SaveVariantsRequestSchema.parse(raw);

    const timestamp = Date.now();
    const key = variantsKey(data.sessionId, timestamp);
    const record: SavedVariantsRecord = {
      sessionId: data.sessionId,
      variants: data.variants,
      postId: data.postId,
      savedAt: new Date(timestamp).toISOString(),
    };

    await env.VARIANTS_KV.put(key, JSON.stringify(record));

    const response: SaveVariantsResponse = {
      saved: true,
      key,
      savedAt: record.savedAt,
    };
    return json(response, 200);
  } catch (e) {
    if (e instanceof Error && 'issues' in e) {
      return json({ error: String(e) }, 400);
    }
    return json({ error: String(e) }, 500);
  }
}

export async function handleGetSavedVariants(
  sessionId: string,
  env: Env,
): Promise<Response> {
  try {
    const prefix = listVariantsKeys(sessionId);
    const list = await env.VARIANTS_KV.list({ prefix });
    if (!list.keys.length) {
      return json({ error: 'Not found' }, 404);
    }

    // Return the most recent entry
    const latest = list.keys.sort((a: any, b: any) => (b.name > a.name ? 1 : -1))[0];
    const raw = await env.VARIANTS_KV.get(latest.name, 'text');
    if (!raw) {
      return json({ error: 'Not found' }, 404);
    }

    const record: SavedVariantsRecord = JSON.parse(raw);
    return json(record, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
