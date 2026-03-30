import { type SheetRow } from '../../../services/sheets';
import { type ImageAssetOption } from '../../../components/ImageAssetManager';
import { parseRowImageUrls } from '../../../services/selectedImageUrls';

export function getInitialEditorText(row: SheetRow): string {
  return [row.selectedText, row.variant1, row.variant2, row.variant3, row.variant4].find((value) => value?.trim()) || '';
}

export type SheetVariantForReview = {
  text: string;
  imageUrl: string;
  /** Present when the row’s saved selection (JSON / selectedImageId) overrides column image links for this variant. */
  imageUrls?: string[];
  originalIndex: number;
};

/**
 * Variant pick previews and editor routing use per-column image links. Saved approve/save flows persist
 * the chosen media in selectedImageId / selectedImageUrlsJson; those can differ after upload while columns
 * still hold older links — use the row-level selection when it matches this variant’s text.
 */
export function buildSheetVariants(row: SheetRow): SheetVariantForReview[] {
  const rowUrls = parseRowImageUrls(row);
  const selectedText = row.selectedText?.trim() || '';

  const columns = [
    { text: row.variant1, columnImageUrl: row.imageLink1, originalIndex: 0 },
    { text: row.variant2, columnImageUrl: row.imageLink2, originalIndex: 1 },
    { text: row.variant3, columnImageUrl: row.imageLink3, originalIndex: 2 },
    { text: row.variant4, columnImageUrl: row.imageLink4, originalIndex: 3 },
  ] as const;

  return columns
    .filter((v) => v.text?.trim())
    .map((v) => {
      const vt = v.text.trim();
      const useSavedMedia =
        rowUrls.length > 0 && selectedText.length > 0 && vt === selectedText;
      const imageUrl = useSavedMedia
        ? rowUrls[0]!
        : (v.columnImageUrl || '').trim();
      const imageUrls = useSavedMedia && rowUrls.length > 1 ? rowUrls : undefined;
      return {
        text: v.text,
        imageUrl,
        originalIndex: v.originalIndex,
        ...(imageUrls ? { imageUrls } : {}),
      };
    });
}

export function buildGeneratedImages(row: SheetRow): ImageAssetOption[] {
  return [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
    .map((imageUrl, originalIndex) => ({
      id: `generated-${originalIndex}`,
      imageUrl,
      originalIndex,
      label: `Generated ${originalIndex + 1}`,
      kind: 'generated' as const,
    }))
    .filter((option) => option.imageUrl?.trim());
}

export function mergeUniqueImageOptions(nextOptions: ImageAssetOption[]): ImageAssetOption[] {
  const seen = new Set<string>();
  return nextOptions.filter((option) => {
    const key = option.imageUrl?.trim() || '';
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
