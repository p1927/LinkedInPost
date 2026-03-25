export function extractGoogleDriveFileId(url?: string): string | null {
  const value = url?.trim();

  if (!value) {
    return null;
  }

  if (!value.includes('/') && /^[a-zA-Z0-9_-]{20,}$/.test(value)) {
    return value;
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/thumbnail\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function normalizePreviewImageUrl(url?: string): string {
  const value = url?.trim() || '';

  if (!value) {
    return '';
  }

  const driveFileId = extractGoogleDriveFileId(value);
  if (driveFileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1600`;
  }

  return value;
}