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

function readUInt16BE(u8: Uint8Array, offset: number): number {
  return (u8[offset]! << 8) | u8[offset + 1]!;
}

function readUInt32BE(u8: Uint8Array, offset: number): number {
  return (u8[offset]! << 24) | (u8[offset + 1]! << 16) | (u8[offset + 2]! << 8) | u8[offset + 3]!;
}

/** Best-effort width/height from raster bytes (JPEG / PNG / GIF / WebP). */
export function readRasterImageDimensions(bytes: ArrayBuffer): { width: number; height: number } | null {
  const u8 = new Uint8Array(bytes);
  if (u8.length < 24) {
    return null;
  }

  // PNG
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
    const width = readUInt32BE(u8, 16);
    const height = readUInt32BE(u8, 20);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  // GIF
  if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
    const width = u8[6]! | (u8[7]! << 8);
    const height = u8[8]! | (u8[9]! << 8);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  // JPEG
  if (u8[0] === 0xff && u8[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < u8.length) {
      if (u8[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = u8[offset + 1]!;
      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      ) {
        const height = readUInt16BE(u8, offset + 5);
        const width = readUInt16BE(u8, offset + 7);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      const segLen = readUInt16BE(u8, offset + 2);
      if (segLen < 2) {
        break;
      }
      offset += 2 + segLen;
    }
    return null;
  }

  // WebP (RIFF)
  if (
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    let pos = 12;
    while (pos + 8 <= u8.length) {
      const chunkId = String.fromCharCode(u8[pos]!, u8[pos + 1]!, u8[pos + 2]!, u8[pos + 3]!);
      const chunkSize = u8[pos + 4]! | (u8[pos + 5]! << 8) | (u8[pos + 6]! << 16) | (u8[pos + 7]! << 24);
      const dataStart = pos + 8;
      if (chunkSize < 0 || dataStart + chunkSize > u8.length) {
        break;
      }

      if (chunkId === 'VP8X' && chunkSize >= 10) {
        const width = 1 + u8[dataStart + 4]! + (u8[dataStart + 5]! << 8) + (u8[dataStart + 6]! << 16);
        const height = 1 + u8[dataStart + 7]! + (u8[dataStart + 8]! << 8) + (u8[dataStart + 9]! << 16);
        return width > 0 && height > 0 ? { width, height } : null;
      }

      if (chunkId === 'VP8 ' && chunkSize >= 10) {
        const i = dataStart;
        if (u8[i + 3] === 0x9d && u8[i + 4] === 0x01 && u8[i + 5] === 0x2a) {
          const width = u8[i + 6]! | ((u8[i + 7]! & 0x3f) << 8);
          const height = (u8[i + 7]! >> 6) | (u8[i + 8]! << 2) | ((u8[i + 9]! & 0x0f) << 10);
          return width > 0 && height > 0 ? { width, height } : null;
        }
      }

      if (chunkId === 'VP8L' && chunkSize >= 5) {
        const i = dataStart + 1;
        const bits = u8[i]! | (u8[i + 1]! << 8) | (u8[i + 2]! << 16) | (u8[i + 3]! << 24);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return width > 0 && height > 0 ? { width, height } : null;
      }

      pos = dataStart + chunkSize + (chunkSize % 2);
    }
    return null;
  }

  return null;
}

/**
 * Telegram sendPhoto: each side ≤ 10000px; long/short aspect ratio ≤ 20.
 * @see https://core.telegram.org/bots/api#sendphoto
 */
export function isTelegramCompatiblePhotoDimensions(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return false;
  }
  if (width > 10000 || height > 10000) {
    return false;
  }
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  return longEdge / shortEdge <= 20;
}

export function rasterBytesQualifyForTelegramPhoto(bytes: ArrayBuffer): boolean {
  const dim = readRasterImageDimensions(bytes);
  if (!dim) {
    return false;
  }
  return isTelegramCompatiblePhotoDimensions(dim.width, dim.height);
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