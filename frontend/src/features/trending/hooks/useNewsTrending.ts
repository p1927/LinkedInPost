import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle } from '../types';
import type { TrendingApiConfig } from '../api';
import type { BackendApi } from '@/services/backendApi';

interface UseNewsTrendingResult {
  data: NewsArticle[];
  loading: boolean;
  error: string | null;
  available: boolean;
  refetch: () => void;
}

export function useNewsTrending(
  topic: string,
  config: TrendingApiConfig,
  api?: BackendApi,
  idToken?: string,
): UseNewsTrendingResult {
  const [data, setData] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const available = config.news.config.enabled;

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!topic.trim() || !available || !api || !idToken) {
      setData([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const today = new Date();
        const windowStart = new Date(today);
        windowStart.setDate(today.getDate() - 7);
        const dateStr = today.toISOString().slice(0, 10);
        const windowStartStr = windowStart.toISOString().slice(0, 10);

        const result = await api!.searchNewsResearch(idToken!, {
          topicId: 'trending',
          topic,
          date: dateStr,
          windowStart: windowStartStr,
          windowEnd: dateStr,
        });

        if (!cancelled) {
          const articles: NewsArticle[] = (result.articles ?? []).map((a, i) => ({
            id: a.url || String(i),
            title: a.title,
            description: a.snippet ?? '',
            source: a.source ?? '',
            publishedAt: a.publishedAt ?? '',
            url: a.url,
            imageUrl: a.imageUrl,
            platform: 'news' as const,
          }));
          setData(articles);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch news');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [topic, available, tick, api, idToken]);

  return { data, loading, error, available, refetch };
}
