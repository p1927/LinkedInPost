import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem, PhantomBusterResponse } from '../types';

export class PhantomBusterAdapter extends BaseAdapter {
  platform = 'linkedin' as const;
  name = 'PhantomBuster';

  async search(_topic: string): Promise<TrendingItem[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('PhantomBuster API key not configured');
    }

    const containerId = this.config.options?.containerId as string;
    if (!containerId) {
      throw new Error('PhantomBuster container ID not configured');
    }

    // Get results from PhantomBuster container
    const response = await fetch(
      `https://api.phantombuster.com/api/v2/agent/result?containerId=${containerId}`,
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PhantomBuster API error: ${response.statusText}`);
    }

    const data: PhantomBusterResponse = await response.json();

    if (data.status !== 'success' || !data.result?.posts) {
      throw new Error('PhantomBuster fetch failed');
    }

    return data.result.posts.map((post) => {
      const item = {
        id: post.url || Math.random().toString(),
        title: post.text?.slice(0, 100) || 'LinkedIn Post',
        url: post.url,
        thumbnailUrl: undefined,
        viewCount: '0',
        likeCount: post.likes?.toString() || '0',
        commentsCount: post.comments?.toString() || '0',
        publishedAt: 'Recently',
        platform: 'linkedin' as const,
        authorName: post.authorName,
        authorHeadline: post.authorHeadline,
        hashtags: post.text?.match(/#[a-zA-Z]+/g) || [],
        engagement: post.likes + post.comments + post.shares,
      };
      return item;
    });
  }
}
