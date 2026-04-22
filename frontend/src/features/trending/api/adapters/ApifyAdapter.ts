import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem } from '../types';

type ApifyPlatform = 'youtube' | 'linkedin';

export class ApifyAdapter extends BaseAdapter {
  platform: 'youtube' | 'linkedin';
  name = 'Apify';

  constructor(config: { name: string; enabled: boolean; apiKey?: string; options?: Record<string, unknown> }) {
    super(config);
    this.platform = (config.options?.platform as ApifyPlatform) || 'youtube';
  }

  async search(topic: string): Promise<TrendingItem[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('Apify API key not configured');
    }

    const actorId = this.platform === 'youtube'
      ? 'apify/youtube-scraper'  // YouTube trending scraper
      : 'apify/linkedin-viral-posts-finder';  // LinkedIn viral posts

    // Start the actor run
    const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerm: topic,
        maxItems: 10,
        language: 'en',
      }),
    });

    if (!startResponse.ok) {
      throw new Error(`Apify API error: ${startResponse.statusText}`);
    }

    const runData = await startResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      throw new Error('Apify run failed to start');
    }

    // Poll for completion
    let status = 'running';
    let attempts = 0;
    while (status === 'running' && attempts < 30) {
      await this.delay(2000);
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const statusData = await statusResponse.json();
      status = statusData.data?.status;
      attempts++;
    }

    if (status !== 'succeeded') {
      throw new Error(`Apify run ${status}`);
    }

    // Get dataset items
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) {
      throw new Error('Apify dataset not available');
    }

    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!datasetResponse.ok) {
      throw new Error(`Apify dataset error: ${datasetResponse.statusText}`);
    }

    const items = await datasetResponse.json();
    return this.transformItems(items);
  }

  private transformItems(items: unknown[]): TrendingItem[] {
    if (this.platform === 'youtube') {
      return items.map((item: any) => ({
        id: item.id || item.url || Math.random().toString(),
        title: item.title || 'YouTube Video',
        url: item.url || `https://youtube.com/watch?v=${item.videoId}`,
        thumbnailUrl: item.thumbnail,
        viewCount: this.formatCount(item.views || item.viewCount || '0'),
        likeCount: this.formatCount(item.likes || item.likeCount || '0'),
        publishedAt: this.formatDate(item.publishedAt || item.uploadDate),
        platform: 'youtube' as const,
        channelTitle: item.channelTitle || item.author,
        engagement: this.calculateEngagement({
          likeCount: item.likes || item.likeCount || '0',
          commentsCount: item.comments || '0',
        } as any),
      }));
    } else {
      // LinkedIn
      return items.map((item: any) => ({
        id: item.postId || item.url || Math.random().toString(),
        title: item.text?.slice(0, 100) || 'LinkedIn Post',
        url: item.url || item.postUrl,
        thumbnailUrl: item.image || item.media,
        likeCount: this.formatCount(item.likes || item.reactions || '0'),
        commentsCount: this.formatCount(item.comments || '0'),
        publishedAt: this.formatDate(item.date || item.createdAt),
        platform: 'linkedin' as const,
        authorName: item.authorName || item.author,
        authorHeadline: item.authorHeadline || item.authorDescription,
        hashtags: item.text?.match(/#[a-zA-Z]+/g) || [],
        engagement: this.calculateEngagement({
          likeCount: item.likes || item.reactions || '0',
          commentsCount: item.comments || '0',
        } as any),
      }));
    }
  }

  private formatCount(count: string | number): string {
    const num = typeof count === 'string' ? parseInt(count, 10) : count;
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
