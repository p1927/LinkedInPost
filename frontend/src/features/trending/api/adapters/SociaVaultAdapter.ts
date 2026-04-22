import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem, SociaVaultResponse } from '../types';

type SociaVaultPlatform = 'youtube' | 'instagram' | 'linkedin';

export class SociaVaultAdapter extends BaseAdapter {
  platform: 'youtube' | 'instagram' | 'linkedin';
  name = 'SociaVault';

  constructor(config: { name: string; enabled: boolean; apiKey?: string; options?: Record<string, unknown> }) {
    super(config);
    this.platform = (config.options?.platform as SociaVaultPlatform) || 'youtube';
  }

  async search(topic: string): Promise<TrendingItem[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('SociaVault API key not configured');
    }

    const response = await fetch('https://api.sociavault.com/v1/social/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: this.platform,
        query: topic,
        limit: 20,
        sortBy: 'engagement',
      }),
    });

    if (!response.ok) {
      throw new Error(`SociaVault API error: ${response.statusText}`);
    }

    const data: SociaVaultResponse = await response.json();

    if (!data.success || !data.posts) {
      throw new Error('SociaVault request failed');
    }

    return data.posts.map((post) => {
      const item = {
        id: post.id,
        title: post.content?.slice(0, 100) || `${this.platform} Post`,
        url: post.url,
        thumbnailUrl: post.media_url,
        viewCount: '0', // SociaVault doesn't always provide views
        likeCount: post.likes?.toString() || '0',
        commentsCount: post.comments?.toString() || '0',
        publishedAt: this.formatDate(post.created_at),
        platform: this.platform,
        hashtags: post.content?.match(/#[a-zA-Z]+/g) || [],
        engagement: post.likes + post.comments + post.shares,
      };
      return item;
    });
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return 'Recently';
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
