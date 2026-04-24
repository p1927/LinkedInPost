export type NewsApiProviderId =
  | 'rss'
  | 'newsapi'
  | 'gnews'
  | 'newsdata'
  | 'serpapi_news'
  | 'google_trends'
  | 'hackernews'
  | 'reddit';

export interface NewsResearchFeedEntry {
  id: string;
  url: string;
  label?: string;
  enabled: boolean;
}

export interface NewsResearchApis {
  newsapi: boolean;
  gnews: boolean;
  newsdata: boolean;
  serpapiNews: boolean;
}

export interface NewsResearchStored {
  enabled: boolean;
  apis: NewsResearchApis;
  rssFeeds: NewsResearchFeedEntry[];
}

export interface ResearchArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
  provider: NewsApiProviderId;
  imageUrl?: string;
}

export interface NewsResearchSearchPayload {
  /** Stable row id (Topics column C / D1). */
  topicId: string;
  topic: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  customQuery?: string;
}

export interface NewsResearchSearchResult {
  articles: ResearchArticle[];
  dedupedCount: number;
  providersUsed: NewsApiProviderId[];
  warnings: string[];
}

/** Subset safe to send to Gemini (trimmed snippets). */
export interface ResearchArticleRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

export const DEFAULT_NEWS_RESEARCH: NewsResearchStored = {
  enabled: false,
  apis: {
    newsapi: false,
    gnews: false,
    newsdata: false,
    serpapiNews: false,
  },
  rssFeeds: [],
};

export const MAX_RSS_FEEDS = 40;
export const MAX_URL_LEN = 2048;
export const MAX_SNIPPET_CHARS = 480;
export const MAX_TOTAL_RESEARCH_CHARS = 8000;

export interface TrendingSearchRequest {
  topic: string;
  region: string;
  genre: string;
  windowDays: number;
}

export interface TrendingArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  provider: NewsApiProviderId;
  platform: 'news';
}

export interface TrendingWord {
  word: string;
  count: number;
  tier: 'high' | 'mid' | 'low';
}

export interface TrendingSearchResponse {
  articles: TrendingArticle[];
  relatedTopics: string[];
  trendingWords: TrendingWord[];
  keywords: string[];
  searchIntent: string;
  sources: string[];
}
