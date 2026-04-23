import { useState, useEffect, useCallback } from 'react';
import type { YouTubeVideo } from '../types';
import type { TrendingItem } from '../api/types';
import { createYouTubeAdapter, type TrendingApiConfig } from '../api';

interface UseYouTubeTrendingResult {
  data: YouTubeVideo[];
  loading: boolean;
  error: string | null;
  available: boolean;
  refetch: () => void;
}

function transformToYouTubeVideo(item: TrendingItem): YouTubeVideo {
  return {
    id: item.id,
    title: item.title,
    channelTitle: item.channelTitle || '',
    viewCount: item.viewCount || '0',
    likeCount: item.likeCount,
    thumbnailUrl: item.thumbnailUrl || '',
    url: item.url,
    publishedAt: item.publishedAt,
    platform: 'youtube',
  };
}

export function useYouTubeTrending(
  topic: string,
  config: TrendingApiConfig
): UseYouTubeTrendingResult {
  const [data, setData] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const available = config.youtube.config.enabled;

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
        const adapter = createYouTubeAdapter(config.youtube);
        const items = await adapter.search(topic);
        if (!cancelled) {
          setData(items.map(transformToYouTubeVideo));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch YouTube trends');
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
