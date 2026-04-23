import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem, InstagramMediaItem } from '../types';

export class InstagramAdapter extends BaseAdapter {
  platform = 'instagram' as const;
  name = 'Instagram Graph API';

  async search(topic: string): Promise<TrendingItem[]> {
    // Proxy through worker when configured (keeps API key server-side)
    if (this.config.workerProxyUrl && this.config.idToken) {
      return this.searchViaProxy(topic);
    }

    const apiKey = this.config.apiKey;
    const userId = this.config.options?.instagramUserId as string;

    if (!apiKey || !userId) {
      throw new Error('Instagram API key or user ID not configured');
    }

    // Step 1: Search for hashtag
    const hashtagUrl = new URL('https://graph.instagram.com/v18.0/ig_hashtag_search');
    hashtagUrl.searchParams.set('user_id', userId);
    hashtagUrl.searchParams.set('q', topic);

    const hashtagResponse = await fetch(hashtagUrl.toString(), {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!hashtagResponse.ok) {
      throw new Error(`Instagram API error: ${hashtagResponse.statusText}`);
    }

    const hashtagData = await hashtagResponse.json();
    const hashtagId = hashtagData.data?.[0]?.id;

    if (!hashtagId) {
      return [];
    }

    // Step 2: Get recent media for hashtag
    const mediaUrl = new URL(`https://graph.instagram.com/v18.0/${hashtagId}/recent_media`);
    mediaUrl.searchParams.set('user_id', userId);
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count');
    mediaUrl.searchParams.set('access_token', apiKey);

    const mediaResponse = await fetch(mediaUrl.toString());
    if (!mediaResponse.ok) {
      throw new Error(`Instagram API error: ${mediaResponse.statusText}`);
    }

    const mediaData = await mediaResponse.json();

    return mediaData.data?.map((item: InstagramMediaItem) => {
      const hashtags = item.caption?.match(/#[a-zA-Z]+/g) || [];
      const item_ = {
        id: item.id,
        title: item.caption?.slice(0, 100) || 'Instagram Post',
        caption: item.caption,
        url: item.permalink,
        thumbnailUrl: item.media_url,
        likeCount: item.like_count?.toString() || '0',
        commentsCount: item.comments_count?.toString() || '0',
        publishedAt: this.formatDate(item.timestamp),
        platform: 'instagram' as const,
        hashtags,
        engagement: (item.like_count || 0) + (item.comments_count || 0),
      };
      return item_;
    }) || [];
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  private async searchViaProxy(topic: string): Promise<TrendingItem[]> {
    const res = await fetch(this.config.workerProxyUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.idToken}`,
      },
      body: JSON.stringify({ action: 'trendingInstagram', idToken: this.config.idToken, payload: { query: topic } }),
    });
    if (!res.ok) throw new Error(`Instagram proxy error: ${res.status}`);
    const body = await res.json() as { ok: boolean; data?: { data?: unknown[] }; error?: string };
    if (!body.ok) throw new Error(body.error ?? 'Instagram proxy request failed');
    return (body.data?.data ?? []) as TrendingItem[];
  }
}
