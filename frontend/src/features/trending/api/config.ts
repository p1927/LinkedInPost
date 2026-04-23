import type {
  TrendingApiConfig,
  PlatformConfig,
  YouTubeAdapterType,
  InstagramAdapterType,
  LinkedInAdapterType,
  NewsAdapterType,
} from './types';

// Default config - all disabled (use mock data)
export const DEFAULT_CONFIG: TrendingApiConfig = {
  youtube: {
    adapter: 'youtube-official',
    config: {
      name: 'YouTube',
      enabled: false,
      apiKey: undefined,
      options: {},
    },
  },
  instagram: {
    adapter: 'instagram-official',
    config: {
      name: 'Instagram',
      enabled: false,
      apiKey: undefined,
      options: {},
    },
  },
  linkedin: {
    adapter: 'linkedin-official',
    config: {
      name: 'LinkedIn',
      enabled: false,
      apiKey: undefined,
      options: {},
    },
  },
  news: {
    adapter: 'newsdata',
    config: {
      name: 'News',
      enabled: false,
      apiKey: undefined,
      options: {},
    },
  },
};

export interface ApiFeatureFlags {
  youtube: boolean;
  instagram: boolean;
  linkedin: boolean;
  news: boolean;
}

export function getEnabledPlatforms(config: TrendingApiConfig): ApiFeatureFlags {
  return {
    youtube: config.youtube.config.enabled,
    instagram: config.instagram.config.enabled,
    linkedin: config.linkedin.config.enabled,
    news: config.news.config.enabled,
  };
}

export function isAnyApiEnabled(config: TrendingApiConfig): boolean {
  const flags = getEnabledPlatforms(config);
  return Object.values(flags).some(Boolean);
}

// Adapter selection based on config
export function getYouTubeAdapterType(config: PlatformConfig<YouTubeAdapterType>): YouTubeAdapterType {
  return config.adapter;
}

export function getInstagramAdapterType(config: PlatformConfig<InstagramAdapterType>): InstagramAdapterType {
  return config.adapter;
}

export function getLinkedInAdapterType(config: PlatformConfig<LinkedInAdapterType>): LinkedInAdapterType {
  return config.adapter;
}

export function getNewsAdapterType(config: PlatformConfig<NewsAdapterType>): NewsAdapterType {
  return config.adapter;
}
