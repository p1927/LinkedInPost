import { BaseAdapter } from './BaseAdapter';
import type { TrendingItem, YouTubeVideoItem } from '../types';

export class YouTubeAdapter extends BaseAdapter {
  platform = 'youtube' as const;
  name = 'YouTube Data API v3';

  async search(topic: string): Promise<TrendingItem[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', topic);
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'viewCount');
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    // If we got video IDs, fetch statistics
    const videoIds = data.items?.map((item: YouTubeVideoItem) => item.id.videoId).join(',') || '';

    let stats: Record<string, { viewCount: string; likeCount: string }> = {};
    if (videoIds) {
      const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      statsUrl.searchParams.set('part', 'statistics');
      statsUrl.searchParams.set('id', videoIds);
      statsUrl.searchParams.set('key', apiKey);

      const statsResponse = await fetch(statsUrl.toString());
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        statsData.items?.forEach((item: { id: string; statistics: { viewCount: string; likeCount: string } }) => {
          stats[item.id] = item.statistics;
        });
      }
    }

    return data.items?.map((item: YouTubeVideoItem) => {
      const videoStats = stats[item.id.videoId] || {};
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        url: `https://youtube.com/watch?v=${item.id.videoId}`,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
        viewCount: this.formatCount(videoStats.viewCount || '0'),
        likeCount: this.formatCount(videoStats.likeCount || '0'),
        publishedAt: this.formatDate(item.snippet.publishedAt),
        platform: 'youtube' as const,
        channelTitle: item.snippet.channelTitle,
      };
    }) || [];
  }

  private formatCount(count: string): string {
    const num = parseInt(count, 10);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
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
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
