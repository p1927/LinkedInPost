import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle } from '../types';
import type { TrendingApiConfig } from '../api';

interface UseNewsTrendingResult {
  data: NewsArticle[];
  loading: boolean;
  error: string | null;
  available: boolean;
  refetch: () => void;
}

// Mock news implementation - can be extended with real APIs
export function useNewsTrending(
  topic: string,
  config: TrendingApiConfig
): UseNewsTrendingResult {
  const [data, setData] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const available = config.news.config.enabled;

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
        // Placeholder - implement news API adapter here
        // Options: NewsData.io, Guardian API, GNews, etc.
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data for now
        const mockArticles: NewsArticle[] = [
          {
            id: '1',
            title: `${topic}: Latest News and Updates`,
            description: `Recent developments around ${topic} that are trending across major news outlets.`,
            source: 'News',
            publishedAt: '2 hours ago',
            url: '#',
            imageUrl: undefined,
            platform: 'news',
          },
          {
            id: '2',
            title: `How ${topic} is Shaping the Industry`,
            description: `Analysis and insights on ${topic} and its growing impact.`,
            source: 'Industry Weekly',
            publishedAt: '5 hours ago',
            url: '#',
            imageUrl: undefined,
            platform: 'news',
          },
        ];

        if (!cancelled) {
          setData(mockArticles);
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

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [topic, available, tick, config]);

  return { data, loading, error, available, refetch };
}
