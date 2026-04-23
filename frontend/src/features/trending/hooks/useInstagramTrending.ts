import { useState, useEffect, useCallback } from 'react';
import type { InstagramPost } from '../types';
import type { TrendingItem } from '../api/types';
import { createInstagramAdapter, type TrendingApiConfig } from '../api';

interface UseInstagramTrendingResult {
  data: InstagramPost[];
  loading: boolean;
  error: string | null;
  available: boolean;
  refetch: () => void;
}

function transformToInstagramPost(item: TrendingItem): InstagramPost {
  return {
    id: item.id,
    caption: item.title || '',
    mediaUrl: item.thumbnailUrl || '',
    likeCount: item.likeCount || '0',
    commentsCount: item.commentsCount,
    hashtags: item.hashtags || [],
    url: item.url,
    platform: 'instagram',
  };
}

export function useInstagramTrending(
  topic: string,
  config: TrendingApiConfig
): UseInstagramTrendingResult {
  const [data, setData] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const available = config.instagram.config.enabled;

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!topic.trim() || !available) {
      setData([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const adapter = createInstagramAdapter(config.instagram);
        const items = await adapter.search(topic);
        if (!cancelled) {
          setData(items.map(transformToInstagramPost));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch Instagram trends');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [topic, available, tick, config]);

  return { data, loading, error, available, refetch };
}
