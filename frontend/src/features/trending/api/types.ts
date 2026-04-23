// API Configuration Types
export interface ApiConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  options?: Record<string, unknown>;
  /** When set, the adapter proxies calls through the worker at this URL instead of calling the external API directly. */
  workerProxyUrl?: string;
  /** Auth token for worker proxy requests. */
  idToken?: string;
}

export type YouTubeAdapterType = 'youtube-official' | 'apify-youtube';
export type InstagramAdapterType = 'instagram-official' | 'sociavault';
export type LinkedInAdapterType = 'linkedin-official' | 'apify-linkedin' | 'sociavault' | 'phantombuster';
export type NewsAdapterType = 'newsdata' | 'guardian' | 'gnews';

export interface PlatformConfig<T> {
  adapter: T;
  config: ApiConfig;
}

export interface TrendingApiConfig {
  youtube: PlatformConfig<YouTubeAdapterType>;
  instagram: PlatformConfig<InstagramAdapterType>;
  linkedin: PlatformConfig<LinkedInAdapterType>;
  news: PlatformConfig<NewsAdapterType>;
}

// Trending Item Types (unified across all APIs)
export interface TrendingItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  viewCount?: string;
  likeCount?: string;
  commentsCount?: string;
  publishedAt: string;
  platform: 'youtube' | 'instagram' | 'linkedin' | 'news';
  // Platform-specific fields
  channelTitle?: string;  // YouTube
  hashtags?: string[];   // Instagram, LinkedIn
  source?: string;       // News
  authorName?: string;    // LinkedIn, Instagram
  authorHeadline?: string; // LinkedIn
  engagement?: number;    // Calculated: likes + comments + shares
}

// API Response Types (raw from each API)
export interface YouTubeSearchResponse {
  items: YouTubeVideoItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    publishedAt: string;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export interface InstagramMediaItem {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface LinkedInPostItem {
  id: string;
  commentary: string;
  article?: {
    title: string;
    thumbnail?: string;
  };
  visibility: {
    memberNetworkVisibility: string;
  };
  created: {
    time: string;
  };
  statistics?: {
    likeCount: number;
    commentsTotalProposals: number;
    impressionCount: number;
  };
}

export interface ApifyResponse {
  status: string;
  data: unknown[];
  error?: string;
}

export interface SociaVaultResponse {
  success: boolean;
  posts: {
    id: string;
    content: string;
    platform: string;
    author: string;
    likes: number;
    shares: number;
    comments: number;
    url: string;
    media_url?: string;
    created_at: string;
  }[];
}

export interface PhantomBusterResponse {
  containerId: string;
  status: string;
  result?: {
    posts: {
      text: string;
      authorName: string;
      authorHeadline?: string;
      likes: number;
      comments: number;
      shares: number;
      url: string;
    }[];
  };
}
