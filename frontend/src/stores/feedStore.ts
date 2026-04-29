import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NewsArticle } from '@/features/trending/types';

const SESSION_KEY = 'feed_session_fetched';

interface FeedState {
  articles: NewsArticle[];
  fetchedAt: string | null;
  groupId: string | null;
}

interface FeedStore extends FeedState {
  setArticles: (articles: NewsArticle[], groupId: string | null, fetchedAt: string | null) => void;
  clear: () => void;
  /** True if we've already fetched during this browser session (survives tab navigation, not page refresh) */
  isSessionFetched: () => boolean;
  markSessionFetched: () => void;
  /** True if stored data is stale (> 23 hours old) */
  isStale: () => boolean;
}

export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      articles: [],
      fetchedAt: null,
      groupId: null,

      setArticles: (articles, groupId, fetchedAt) =>
        set({ articles, groupId, fetchedAt }),

      clear: () => set({ articles: [], fetchedAt: null, groupId: null }),

      isSessionFetched: () => {
        try {
          return sessionStorage.getItem(SESSION_KEY) === '1';
        } catch {
          return false;
        }
      },

      markSessionFetched: () => {
        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch { /* noop */ }
      },

      isStale: () => {
        const { fetchedAt } = get();
        if (!fetchedAt) return true;
        return Date.now() - new Date(fetchedAt).getTime() > 23 * 60 * 60 * 1000;
      },
    }),
    {
      name: 'feed-store-v1',
      // Only persist articles + metadata, not methods
      partialize: (state) => ({
        articles: state.articles,
        fetchedAt: state.fetchedAt,
        groupId: state.groupId,
      }),
    },
  ),
);
