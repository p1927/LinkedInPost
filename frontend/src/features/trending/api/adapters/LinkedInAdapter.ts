import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem, LinkedInPostItem } from '../types';

export class LinkedInAdapter extends BaseAdapter {
  platform = 'linkedin' as const;
  name = 'LinkedIn Posts API';

  async search(_topic: string): Promise<TrendingItem[]> {
    const apiKey = this.config.apiKey;
    const orgId = this.config.options?.orgId as string;

    if (!apiKey || !orgId) {
      throw new Error('LinkedIn API key or organization ID not configured');
    }

    // LinkedIn API for organizational entity posts
    // Note: LinkedIn's API is restrictive - this works for company posts
    const url = new URL(`https://api.linkedin.com/v2/organizationalEntityShareStatistics`);
    url.searchParams.set('q', 'organizationalEntity');
    url.searchParams.set('organizationalEntity', `urn:li:organization:${orgId}`);
    url.searchParams.set('count', '10');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform LinkedIn posts
    return data.elements?.map((item: LinkedInPostItem) => {
      const item_ = {
        id: item.id,
        title: item.article?.title || item.commentary?.slice(0, 100) || 'LinkedIn Post',
        url: `https://linkedin.com/posts/${item.id}`,
        thumbnailUrl: item.article?.thumbnail,
        viewCount: item.statistics?.impressionCount?.toString() || '0',
        likeCount: item.statistics?.likeCount?.toString() || '0',
        commentsCount: item.statistics?.commentsTotalProposals?.toString() || '0',
        publishedAt: this.formatDate(item.created.time),
        platform: 'linkedin' as const,
        hashtags: item.commentary?.match(/#[a-zA-Z]+/g) || [],
        engagement: (item.statistics?.likeCount || 0) + (item.statistics?.commentsTotalProposals || 0),
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
}
