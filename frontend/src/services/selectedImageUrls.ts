import type { SheetRow } from './sheets';

/** Max images per post across channels (LinkedIn 20, Telegram album 10, Instagram carousel 10). */
export const MAX_IMAGES_PER_POST = 20;

/** Image search / topic-based candidates shown in the media picker (worker caps requests to this). */
export const DRAFT_IMAGE_SEARCH_CHOICE_COUNT = 8;

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

/**
 * URLs for the topics-queue post preview: uses saved selection when it applies to the displayed body,
 * otherwise falls back to the variant column image links (same rules as the review editor variants).
 */
export function getTopicPreviewImageUrls(row: SheetRow): string[] {
  const rowUrls = parseRowImageUrls(row);
  const selectedText = row.selectedText?.trim() || '';
  const displayText = (row.selectedText || row.variant1 || '').trim();

  const columns = [
    { text: row.variant1, columnImageUrl: row.imageLink1 },
    { text: row.variant2, columnImageUrl: row.imageLink2 },
    { text: row.variant3, columnImageUrl: row.imageLink3 },
    { text: row.variant4, columnImageUrl: row.imageLink4 },
  ] as const;

  if (displayText) {
    for (const col of columns) {
      const vt = col.text?.trim() || '';
      if (vt !== displayText) continue;
      const useSavedMedia = rowUrls.length > 0 && selectedText.length > 0 && vt === selectedText;
      if (useSavedMedia) {
        return rowUrls.slice(0, MAX_IMAGES_PER_POST);
      }
      const u = (col.columnImageUrl || '').trim();
      return u ? [u] : [];
    }
  }

  if (rowUrls.length > 0) {
    return rowUrls;
  }

  for (const col of columns) {
    const u = (col.columnImageUrl || '').trim();
    if (u) return [u];
  }
  return [];
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
  return { selectedImageId: cleaned[0], selectedImageUrlsJson: JSON.stringify(cleaned) };
}
