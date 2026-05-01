import type { ResearchArticle } from './types';

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'igshid',
]);

export function canonicalizeUrl(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    u.hash = '';
    const params = new URLSearchParams(u.search);
    const toDelete: string[] = [];
    params.forEach((_, k) => {
      const lk = k.toLowerCase();
      if (TRACKING_PARAMS.has(lk) || lk.startsWith('utm_')) {
        toDelete.push(k);
      }
    });
    for (const k of toDelete) {
      params.delete(k);
    }
    const qs = params.toString();
    u.search = qs ? `?${qs}` : '';
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    u.hostname = host;
    const path = u.pathname.replace(/\/+$/, '') || '/';
    u.pathname = path;
    return u.toString();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function normalizeTitle(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function dayBucket(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toISOString().slice(0, 10);
}

export function dedupeArticles(items: ResearchArticle[]): { articles: ResearchArticle[]; removed: number } {
  const out: ResearchArticle[] = [];
  const seenUrl = new Set<string>();
  const seenFuzzy = new Set<string>();
  let removed = 0;
  for (const item of items) {
    const cUrl = canonicalizeUrl(item.url);
    if (cUrl && seenUrl.has(cUrl)) {
      removed++;
      continue;
    }
    const nt = normalizeTitle(item.title);
    const day = dayBucket(item.publishedAt);
    const fuzzyKey = nt && day ? `${nt}::${day}` : '';
    if (fuzzyKey && seenFuzzy.has(fuzzyKey)) {
      removed++;
      continue;
    }
    if (cUrl) {
      seenUrl.add(cUrl);
    }
    if (fuzzyKey) {
      seenFuzzy.add(fuzzyKey);
    }
    out.push(item);
  }
  return { articles: out, removed };
}
