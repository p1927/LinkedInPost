import type { ContentPattern } from './types';

/** Filter patterns by delivery channel. Empty/undefined channel returns all patterns. */
export function filterByChannel(patterns: ContentPattern[], channel?: string): ContentPattern[] {
  if (!channel) return patterns;
  return patterns.filter(
    (p) => !p.deliveryChannel || p.deliveryChannel === channel,
  );
}

/** Filter patterns by one or more tags (AND logic: pattern must have all provided tags). */
export function filterByTags(patterns: ContentPattern[], tags: string[]): ContentPattern[] {
  if (tags.length === 0) return patterns;
  return patterns.filter((p) => {
    const patternTags = p.tags ?? [];
    return tags.every((tag) => patternTags.includes(tag));
  });
}

/** Filter patterns by a search query (case-insensitive match on name and whenToUse). */
export function filterByQuery(patterns: ContentPattern[], query: string): ContentPattern[] {
  const q = query.trim().toLowerCase();
  if (!q) return patterns;
  return patterns.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.whenToUse ?? '').toLowerCase().includes(q),
  );
}

/** Apply all filters: channel, tags, and free-text query. */
export function filterPatterns(
  patterns: ContentPattern[],
  options: { channel?: string; tags?: string[]; query?: string },
): ContentPattern[] {
  let result = patterns;
  result = filterByChannel(result, options.channel);
  result = filterByTags(result, options.tags ?? []);
  result = filterByQuery(result, options.query ?? '');
  return result;
}
