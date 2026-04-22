import type { ApiConfig, TrendingItem } from '../types';

export abstract class BaseAdapter {
  abstract readonly platform: 'youtube' | 'instagram' | 'linkedin' | 'news';
  abstract readonly name: string;
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  abstract search(topic: string): Promise<TrendingItem[]>;

  getAvailable(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  protected calculateEngagement(item: TrendingItem): number {
    const likes = parseInt(item.likeCount || '0', 10);
    const comments = parseInt(item.commentsCount || '0', 10);
    const views = parseInt(item.viewCount || '0', 10);
    return likes + comments + (views * 0.01);
  }
}
