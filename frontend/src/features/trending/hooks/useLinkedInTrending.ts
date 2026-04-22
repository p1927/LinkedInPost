import { useState, useEffect, useCallback } from 'react';
import type { LinkedInPost } from '../types';
import type { TrendingItem } from '../api/types';
import { createLinkedInAdapter, type TrendingApiConfig } from '../api';

interface UseLinkedInTrendingResult {
  data: LinkedInPost[];
  loading: boolean;
  error: string | null;
  available: boolean;
  refetch: () => void;
}

function transformToLinkedInPost(item: TrendingItem): LinkedInPost {
  return {
    id: item.id,
    title: item.title,
    caption: item.hashtags ? item.title : undefined,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    viewCount: item.viewCount,
    likeCount: item.likeCount,
    commentsCount: item.commentsCount,
    publishedAt: item.publishedAt,
    platform: 'linkedin',
    hashtags: item.hashtags,
    authorName: item.authorName,
    authorHeadline: item.authorHeadline,
  };
}

export function useLinkedInTrending(
  topic: string,
  config: TrendingApiConfig
): UseLinkedInTrendingResult {
  const [data, setData] = useState<LinkedInPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const available = config.linkedin.config.enabled;

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
        const adapter = createLinkedInAdapter(config.linkedin);
        const items = await adapter.search(topic);
        if (!cancelled) {
          setData(items.map(transformToLinkedInPost));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch LinkedIn trends');
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
