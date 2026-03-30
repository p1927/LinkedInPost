/** Max images per post across channels (LinkedIn 20, Telegram album 10, Instagram carousel 10). */
export const MAX_IMAGES_PER_POST = 20;

export function parseRowImageUrls(row: { selectedImageId?: string; selectedImageUrlsJson?: string }): string[] {
  const raw = String(row.selectedImageUrlsJson || '').trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const out: string[] = [];
        const seen = new Set<string>();
        for (const item of parsed) {
          const u = String(item || '').trim();
          if (u && !seen.has(u)) {
            seen.add(u);
            out.push(u);
          }
        }
        if (out.length > 0) {
          return out.slice(0, MAX_IMAGES_PER_POST);
        }
      }
    } catch {
      /* fall through */
    }
  }
  const single = String(row.selectedImageId || '').trim();
  return single ? [single] : [];
}

export function serializeRowImageUrls(urls: string[]): { selectedImageId: string; selectedImageUrlsJson: string } {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const t = String(u || '').trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      cleaned.push(t);
      if (cleaned.length >= MAX_IMAGES_PER_POST) break;
    }
  }
  if (cleaned.length === 0) {
    return { selectedImageId: '', selectedImageUrlsJson: '' };
  }
  if (cleaned.length === 1) {
    return { selectedImageId: cleaned[0], selectedImageUrlsJson: '' };
  }
  return { selectedImageId: cleaned[0], selectedImageUrlsJson: JSON.stringify(cleaned) };
}
