import { fetchImageAsset } from '../media';

export interface LinkedInPublishRequest {
  accessToken: string;
  personUrn: string;
  text: string;
  imageUrl?: string;
}

interface LinkedInPublishResponse {
  id?: string;
  message?: string;
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

export async function publishLinkedInPost(request: LinkedInPublishRequest): Promise<{ postId: string | null }> {
  const media = request.imageUrl
    ? await uploadLinkedInImage(request.accessToken, request.personUrn, request.imageUrl)
    : null;

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
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
  let uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': imageAsset.contentType,
    },
    body: imageAsset.bytes,
  });

  if (uploadResponse.status === 401 || uploadResponse.status === 403) {
    uploadResponse = await fetch(uploadUrl, {
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