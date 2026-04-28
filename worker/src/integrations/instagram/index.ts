import { normalizeDeliveryImageUrl } from '../media';
import { fetchWithRetry } from '../_shared/fetchWithRetry';

const INSTAGRAM_GRAPH_VERSION = 'v25.0';

export interface InstagramPublishRequest {
  accessToken: string;
  instagramUserId: string;
  caption: string;
  /** Single image (same as `imageUrls` with one entry). */
  imageUrl?: string;
  /** Ordered public image URLs; 1 = single post, 2–10 = carousel. */
  imageUrls?: string[];
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

function resolveInstagramImageUrls(request: InstagramPublishRequest): string[] {
  const fromList = (request.imageUrls || []).map((u) => normalizeDeliveryImageUrl(String(u || '').trim())).filter(Boolean);
  if (fromList.length > 0) {
    return fromList.slice(0, 10);
  }
  const one = normalizeDeliveryImageUrl(String(request.imageUrl || '').trim());
  return one ? [one] : [];
}

export async function publishInstagramPost(request: InstagramPublishRequest): Promise<{ postId: string | null }> {
  const urls = resolveInstagramImageUrls(request);
  if (urls.length === 0) {
    throw new Error('Instagram publishing requires a public image URL.');
  }

  let containerId: string;
  if (urls.length === 1) {
    containerId = await createInstagramSingleImageContainer(
      request.accessToken,
      request.instagramUserId,
      request.caption,
      urls[0]!,
      request.altText,
    );
  } else {
    containerId = await createInstagramCarouselContainer(request, urls);
  }

  await waitForContainerReady(containerId, request.accessToken);

  const response = await fetchWithRetry(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(request.instagramUserId)}/media_publish`, {
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

async function createInstagramCarouselContainer(request: InstagramPublishRequest, imageUrls: string[]): Promise<string> {
  const childIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const response = await fetchWithRetry(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(request.instagramUserId)}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: request.accessToken,
      }),
    });
    const payload = (await response.json().catch(() => null)) as InstagramCreateContainerResponse | null;
    const id = String(payload?.id || '').trim();
    if (!response.ok || !id) {
      throw new Error(payload?.error?.message || `Instagram carousel item failed with status ${response.status}.`);
    }
    childIds.push(id);
  }

  const parentResponse = await fetchWithRetry(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(request.instagramUserId)}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: request.caption,
      access_token: request.accessToken,
    }),
  });

  const parentPayload = (await parentResponse.json().catch(() => null)) as InstagramCreateContainerResponse | null;
  const containerId = String(parentPayload?.id || '').trim();
  if (!parentResponse.ok || !containerId) {
    throw new Error(parentPayload?.error?.message || `Instagram carousel container failed with status ${parentResponse.status}.`);
  }

  return containerId;
}

async function createInstagramSingleImageContainer(
  accessToken: string,
  instagramUserId: string,
  caption: string,
  imageUrl: string,
  altText?: string,
): Promise<string> {
  const response = await fetchWithRetry(`https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}/${encodeURIComponent(instagramUserId)}/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      ...(altText ? { alt_text: altText } : {}),
      access_token: accessToken,
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
    const response = await fetchWithRetry(
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