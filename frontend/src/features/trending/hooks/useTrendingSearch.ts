import { useState, useEffect, useCallback } from 'react';
import type { BackendApi } from '@/services/backendApi';
import type { TrendingSearchResult } from '../types';

interface UseTrendingSearchResult {
  data: TrendingSearchResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrendingSearch(
  topic: string,
  region: string,
  genre: string,
  windowDays: number,
  idToken?: string,
  api?: BackendApi,
): UseTrendingSearchResult {
  const [data, setData] = useState<TrendingSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!topic.trim() || !api || !idToken) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function run() {
      try {
        const result = await api!.trendingSearch(idToken!, {
          topic,
          region,
          genre,
          windowDays,
        });
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch trending data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [topic, region, genre, windowDays, tick, api, idToken]);

  return { data, loading, error, refetch };
}
