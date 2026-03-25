import { normalizeDeliveryImageUrl } from '../media';

const INSTAGRAM_GRAPH_VERSION = 'v25.0';

export interface InstagramPublishRequest {
  accessToken: string;
  instagramUserId: string;
  caption: string;
  imageUrl: string;
  altText?: string;
}

interface InstagramCreateContainerResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

interface InstagramPublishResponse {
  id?: string;
  error?: {
    message?: string;
  };
}

interface InstagramContainerStatusResponse {
  status_code?: 'ERROR' | 'EXPIRED' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';
  error?: {
    message?: string;
  };
}

export async function publishInstagramPost(request: InstagramPublishRequest): Promise<{ postId: string | null }> {
  const normalizedImageUrl = normalizeDeliveryImageUrl(request.imageUrl);
  if (!normalizedImageUrl) {
    throw new Error('Instagram publishing requires a public image URL.');
  }

  const containerId = await createInstagramMediaContainer({
    accessToken: request.accessToken,
    instagramUserId: request.instagramUserId,
    caption: request.caption,
    imageUrl: normalizedImageUrl,
    altText: request.altText,
  });

  await waitForContainerReady(containerId, request.accessToken);

  const response = await fetch(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(request.instagramUserId)}/media_publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: request.accessToken,
    }),
  });

  const payload = (await response.json().catch(() => null)) as InstagramPublishResponse | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Instagram publish failed with status ${response.status}.`);
  }

  return {
    postId: payload?.id || null,
  };
}

async function createInstagramMediaContainer(request: InstagramPublishRequest): Promise<string> {
  const response = await fetch(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(request.instagramUserId)}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: request.imageUrl,
      caption: request.caption,
      ...(request.altText ? { alt_text: request.altText } : {}),
      access_token: request.accessToken,
    }),
  });

  const payload = (await response.json().catch(() => null)) as InstagramCreateContainerResponse | null;
  const containerId = String(payload?.id || '').trim();
  if (!response.ok || !containerId) {
    throw new Error(payload?.error?.message || `Instagram media container creation failed with status ${response.status}.`);
  }

  return containerId;
}

async function waitForContainerReady(containerId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(
      `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(containerId)}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`,
    );
    const payload = (await response.json().catch(() => null)) as InstagramContainerStatusResponse | null;
    if (!response.ok) {
      throw new Error(payload?.error?.message || `Instagram container status check failed with status ${response.status}.`);
    }

    const status = payload?.status_code;
    if (!status || status === 'FINISHED' || status === 'PUBLISHED') {
      return;
    }

    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(`Instagram media container is not publishable: ${status.toLowerCase()}.`);
    }

    await delay(1000);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}