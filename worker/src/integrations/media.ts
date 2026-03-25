function extractGoogleDriveFileId(url?: string): string | null {
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

export function normalizeDeliveryImageUrl(url?: string): string {
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

export async function fetchImageAsset(url: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const response = await fetch(normalizeDeliveryImageUrl(url), {
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch selected image for delivery: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`Selected image URL did not return image content. Received ${contentType}.`);
  }

  return {
    bytes: await response.arrayBuffer(),
    contentType,
  };
}