import { extractGoogleDriveFileId } from './imageUrls';

/**
 * External / hotlink URLs (e.g. image search) often break in previews or when Instagram
 * or our worker fetches them. Workspace GCS URLs and Google Drive references are treated
 * as already suitable to persist and deliver.
 */
export function shouldPromoteImageUrlBeforeDelivery(url: string): boolean {
  const t = url.trim();
  if (!t || !/^https?:\/\//i.test(t)) {
    return false;
  }
  const lowered = t.toLowerCase();
  if (lowered.includes('storage.googleapis.com')) {
    return false;
  }
  if (lowered.includes('drive.google.com')) {
    return false;
  }
  if (extractGoogleDriveFileId(t)) {
    return false;
  }
  return true;
}
