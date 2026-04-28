import { fetchImageAsset } from '../media';
import { fetchWithRetry } from '../_shared/fetchWithRetry';

/** Pinned LinkedIn REST API product version (required for `rest/posts` MultiImage). See Microsoft Learn versioning. */
export const LINKEDIN_REST_API_VERSION = '202502';

export interface LinkedInPublishRequest {
  accessToken: string;
  personUrn: string;
  text: string;
  /** Single image (legacy) — prefer {@link imageUrls} when multiple. */
  imageUrl?: string;
  /** Multiple images: uses Posts API `multiImage` (2–20). Single image still uses `ugcPosts`. */
  imageUrls?: string[];
}

interface LinkedInPublishResponse {
  id?: string;
  message?: string;
  errors?: Array<{ message?: string }>;
}

interface LinkedInRegisterUploadResponse {
  value?: {
    asset?: string;
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
      };
    };
  };
  message?: string;
}

function normalizeImageList(imageUrl: string | undefined, imageUrls: string[] | undefined): string[] {
  const fromArray = (imageUrls || []).map((u) => String(u || '').trim()).filter(Boolean);
  if (fromArray.length > 0) {
    return fromArray;
  }
  const single = String(imageUrl || '').trim();
  return single ? [single] : [];
}

export async function publishLinkedInPost(request: LinkedInPublishRequest): Promise<{ postId: string | null }> {
  const urls = normalizeImageList(request.imageUrl, request.imageUrls);

  if (urls.length > 1) {
    const assets = await Promise.all(
      urls.map((url) => uploadLinkedInImage(request.accessToken, request.personUrn, url)),
    );

    const response = await fetchWithRetry('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Linkedin-Version': LINKEDIN_REST_API_VERSION,
      },
      body: JSON.stringify({
        author: request.personUrn,
        commentary: request.text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
        content: {
          multiImage: {
            images: assets.map((a) => ({
              id: a.asset,
              altText: request.text.slice(0, 120),
            })),
          },
        },
      }),
    });

    const postIdHeader = response.headers.get('x-restli-id');
    const payload = (await response.json().catch(() => null)) as LinkedInPublishResponse | null;
    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.errors?.[0]?.message ||
        response.statusText ||
        String(response.status);
      throw new Error(`LinkedIn publish failed: ${message}`);
    }

    const postId = postIdHeader ? decodeURIComponent(postIdHeader.trim()) : payload?.id || null;
    return { postId: postId || null };
  }

  const media = urls.length === 1 ? await uploadLinkedInImage(request.accessToken, request.personUrn, urls[0]!) : null;

  const response = await fetchWithRetry('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: request.personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: request.text,
          },
          shareMediaCategory: media ? 'IMAGE' : 'NONE',
          ...(media
            ? {
                media: [
                  {
                    status: 'READY',
                    media: media.asset,
                    title: {
                      text: 'Approved image',
                    },
                    description: {
                      text: request.text.slice(0, 200),
                    },
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as LinkedInPublishResponse | null;
  if (!response.ok) {
    const message = payload?.message || response.statusText || response.status;
    throw new Error(`LinkedIn publish failed: ${message}`);
  }

  return {
    postId: payload?.id || null,
  };
}

async function uploadLinkedInImage(accessToken: string, personUrn: string, imageUrl: string): Promise<{ asset: string }> {
  const registerResponse = await fetchWithRetry('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: personUrn,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    }),
  });

  const registerPayload = (await registerResponse.json().catch(() => null)) as LinkedInRegisterUploadResponse | null;
  if (!registerResponse.ok) {
    throw new Error(`LinkedIn image registration failed: ${registerPayload?.message || registerResponse.status}`);
  }

  const asset = registerPayload?.value?.asset || '';
  const uploadUrl = registerPayload?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl || '';
  if (!asset || !uploadUrl) {
    throw new Error('LinkedIn image registration did not return an upload URL or asset URN.');
  }

  const imageAsset = await fetchImageAsset(imageUrl);
  let uploadResponse = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': imageAsset.contentType,
    },
    body: imageAsset.bytes,
  });

  if (uploadResponse.status === 401 || uploadResponse.status === 403) {
    uploadResponse = await fetchWithRetry(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': imageAsset.contentType,
      },
      body: imageAsset.bytes,
    });
  }

  if (!uploadResponse.ok) {
    const message = await uploadResponse.text();
    throw new Error(`LinkedIn image upload failed: ${message || uploadResponse.status}`);
  }

  return { asset };
}