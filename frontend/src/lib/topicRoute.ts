import { type SheetRow } from '../services/sheets';

type TopicRoutePayload = { id: string };

function utf8BytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(id: string): string {
  const padded = `${id.replace(/-/g, '+').replace(/_/g, '/')}${'==='.slice((id.length + 3) % 4)}`;
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** URL segment for a sheet row, encoded from its stable topicId UUID. */
export function encodeTopicRouteId(row: SheetRow): string {
  const payload: TopicRoutePayload = { id: row.topicId };
  return utf8BytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/** Normalize `:topicId` from the URL (decodeURIComponent is a no-op for typical base64url). */
export function normalizeTopicRouteParam(param: string): string {
  const t = param.trim();
  if (!t) return param;
  try {
    return decodeURIComponent(t);
  } catch {
    return param;
  }
}

export function decodeTopicRoutePayload(id: string): TopicRoutePayload | null {
  try {
    const text = base64UrlToUtf8(id);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id.trim()) return null;
    return { id: o.id.trim() };
  } catch {
    return null;
  }
}

export function findRowByTopicRouteId(rows: SheetRow[], id: string): SheetRow | undefined {
  const key = decodeTopicRoutePayload(normalizeTopicRouteParam(id));
  if (!key) return undefined;
  return rows.find((r) => r.topicId === key.id);
}

/** DOM / scroll id aligned with topic URLs */
export function topicRowElementId(row: SheetRow): string {
  return encodeTopicRouteId(row);
}

/** Use when building `/topics/:topicId/...` paths so decoded params round-trip safely. */
export function encodeTopicIdForPath(topicIdFromParams: string): string {
  return encodeURIComponent(topicIdFromParams);
}

/** Sheet variant column index 0–3 (columns D–G). */
export function getVariantSlotContent(row: SheetRow, slot: number): { text: string; imageUrl: string } | null {
  if (slot < 0 || slot > 3) return null;
  const texts = [row.variant1, row.variant2, row.variant3, row.variant4] as const;
  const images = [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4] as const;
  return { text: texts[slot] ?? '', imageUrl: images[slot] ?? '' };
}
