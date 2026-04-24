import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TrendingData } from '../types';
import { DEFAULT_CONFIG, isAnyApiEnabled } from '../api/config';
import type { TrendingApiConfig } from '../api';
import { useYouTubeTrending } from './useYouTubeTrending';
import { useInstagramTrending } from './useInstagramTrending';
import { useLinkedInTrending } from './useLinkedInTrending';
import { useNewsTrending } from './useNewsTrending';
import type { BackendApi } from '@/services/backendApi';

// Mock data for development when no APIs are configured
const MOCK_TRENDING_DATA: TrendingData = {
  youtube: [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Introduction to AI Content Creation - Must Watch Tutorial',
      channelTitle: 'Tech Creator',
      viewCount: '1.2M',
      likeCount: '45K',
      thumbnailUrl: 'https://picsum.photos/seed/yt1/320/180',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      publishedAt: '2 days ago',
      platform: 'youtube',
    },
    {
      id: 'abc123',
      title: 'How to Build a Successful LinkedIn Strategy in 2024',
      channelTitle: 'Growth Hacks',
      viewCount: '890K',
      likeCount: '32K',
      thumbnailUrl: 'https://picsum.photos/seed/yt2/320/180',
      url: 'https://youtube.com/watch?v=abc123',
      publishedAt: '5 days ago',
      platform: 'youtube',
    },
    {
      id: 'xyz789',
      title: 'Viral Content Secrets Revealed - Behind the Scenes',
      channelTitle: 'Content King',
      viewCount: '2.1M',
      likeCount: '78K',
      thumbnailUrl: 'https://picsum.photos/seed/yt3/320/180',
      url: 'https://youtube.com/watch?v=xyz789',
      publishedAt: '1 week ago',
      platform: 'youtube',
    },
  ],
  instagram: [
    {
      id: 'ig1',
      caption: 'Just launched my new course! Check the link in bio. #AI #learning #growth',
      mediaUrl: 'https://picsum.photos/seed/ig1/400/400',
      likeCount: '12.5K',
      commentsCount: '342',
      hashtags: ['#AI', '#learning', '#growth', '#success'],
      url: 'https://instagram.com/p/ig1',
      platform: 'instagram',
    },
    {
      id: 'ig2',
      caption: 'Behind the scenes of our viral campaign. The secret is simpler than you think! #marketing #viral',
      mediaUrl: 'https://picsum.photos/seed/ig2/400/400',
      likeCount: '8.3K',
      commentsCount: '156',
      hashtags: ['#marketing', '#viral', '#behindthescenes'],
      url: 'https://instagram.com/p/ig2',
      platform: 'instagram',
    },
    {
      id: 'ig3',
      caption: 'Top 5 tips for content that converts. Save this for later! #contentcreator #tips',
      mediaUrl: 'https://picsum.photos/seed/ig3/400/400',
      likeCount: '15.2K',
      commentsCount: '421',
      hashtags: ['#contentcreator', '#tips', '#conversion'],
      url: 'https://instagram.com/p/ig3',
      platform: 'instagram',
    },
  ],
  news: [
    {
      id: 'news1',
      title: 'AI Tools Revolutionizing Content Creation in 2024',
      description: 'New AI tools are making it easier than ever for creators to produce viral content.',
      source: 'Tech Daily',
      publishedAt: '3 hours ago',
      url: 'https://example.com/news/ai-tools-content',
      imageUrl: 'https://picsum.photos/seed/news1/200/120',
      platform: 'news',
    },
    {
      id: 'news2',
      title: 'LinkedIn Algorithm Update: What Creators Need to Know',
      description: 'LinkedIn has released a major algorithm update affecting content visibility.',
      source: 'Social Media Today',
      publishedAt: '5 hours ago',
      url: 'https://example.com/news/linkedin-algorithm',
      imageUrl: 'https://picsum.photos/seed/news2/200/120',
      platform: 'news',
    },
    {
      id: 'news3',
      title: 'The Rise of Short-Form Video Content',
      description: 'Short-form video continues to dominate social media engagement metrics.',
      source: 'Marketing Weekly',
      publishedAt: '8 hours ago',
      url: 'https://example.com/news/short-form-video',
      imageUrl: 'https://picsum.photos/seed/news3/200/120',
      platform: 'news',
    },
  ],
  linkedin: [
    {
      id: 'li1',
      title: 'How AI is Transforming Content Creation in 2024',
      caption: 'The future of content creation is here. Here is my analysis of how AI tools are changing the game for creators everywhere.',
      url: 'https://linkedin.com/posts/activity-123',
      likeCount: '2.5K',
      commentsCount: '156',
      publishedAt: '3 days ago',
      platform: 'linkedin',
      authorName: 'Sarah Chen',
      authorHeadline: 'Content Strategy Lead',
      hashtags: ['#AI', '#ContentCreation', '#FutureOfWork'],
    },
    {
      id: 'li2',
      title: 'My LinkedIn Growth Strategy Revealed',
      caption: 'I grew my LinkedIn following by 300% in 6 months using these simple tactics. Let me share my journey...',
      url: 'https://linkedin.com/posts/activity-456',
      likeCount: '4.1K',
      commentsCount: '312',
      publishedAt: '1 week ago',
      platform: 'linkedin',
      authorName: 'Marcus Johnson',
      authorHeadline: 'Growth Specialist',
      hashtags: ['#LinkedIn', '#Growth', '#CareerAdvice'],
    },
  ],
  recommendedTopics: ['AI Tools', 'Content Marketing', 'LinkedIn Growth', 'Viral Strategies', 'Productivity Tips'],
  relatedNewsTopics: ['Social Media Trends', 'Digital Marketing', 'Creator Economy'],
  timestamp: Date.now(),
};

interface UseTrendingResult {
  data: TrendingData | null;
  loading: boolean;
  error: string | null;
  config: TrendingApiConfig;
  setConfig: (updater: TrendingApiConfig | ((prev: TrendingApiConfig) => TrendingApiConfig)) => void;
  enabledPlatforms: {
    youtube: boolean;
    instagram: boolean;
    linkedin: boolean;
    news: boolean;
  };
  refetch: () => void;
}

/**
 * Main trending hook that coordinates all platform-specific hooks.
 * Falls back to mock data when no APIs are configured.
 */
export function useTrending(topic: string, idToken?: string, api?: BackendApi): UseTrendingResult {
  const [config, setConfig] = useState<TrendingApiConfig>(DEFAULT_CONFIG);
  const [mockLoading, setMockLoading] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  // Auto-enable news when worker API is available — news goes through the worker, not a third-party key
  const effectiveConfig = useMemo((): TrendingApiConfig => {
    if (!api) return config;
    return {
      ...config,
      news: { ...config.news, config: { ...config.news.config, enabled: true } },
    };
  }, [config, api]);

  const useRealApis = isAnyApiEnabled(effectiveConfig);

  // Inject worker proxy credentials into each platform config when idToken is available
  const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined;
  const enrichedConfig = useMemo((): TrendingApiConfig => {
    if (!idToken || !workerUrl) return effectiveConfig;
    const inject = <T>(cfg: { config: { workerProxyUrl?: string; idToken?: string } } & T) => ({
      ...cfg,
      config: { ...cfg.config, workerProxyUrl: workerUrl, idToken },
    });
    return {
      youtube: inject(effectiveConfig.youtube),
      instagram: inject(effectiveConfig.instagram),
      linkedin: inject(effectiveConfig.linkedin),
      news: effectiveConfig.news,
    };
  }, [effectiveConfig, idToken, workerUrl]);

  // Platform-specific hooks (only active when their API is enabled)
  const youtube = useYouTubeTrending(topic, enrichedConfig);
  const instagram = useInstagramTrending(topic, enrichedConfig);
  const linkedin = useLinkedInTrending(topic, enrichedConfig);
  const news = useNewsTrending(topic, enrichedConfig, api, idToken);

  // Aggregate data based on what's enabled
  const data = useMemo((): TrendingData | null => {
    if (!topic.trim()) {
      return null;
    }

    if (!useRealApis) {
      // Return mock data with topic injected
      return {
        ...MOCK_TRENDING_DATA,
        youtube: MOCK_TRENDING_DATA.youtube.map((v) => ({
          ...v,
          title: `${topic}: ${v.title}`,
        })),
        recommendedTopics: [topic, ...MOCK_TRENDING_DATA.recommendedTopics.slice(0, 4)],
        timestamp: Date.now(),
      };
    }

    // Aggregate real data from enabled platforms
    const enabled = {
      youtube: effectiveConfig.youtube.config.enabled,
      instagram: effectiveConfig.instagram.config.enabled,
      linkedin: effectiveConfig.linkedin.config.enabled,
      news: effectiveConfig.news.config.enabled,
    };

    const recommendedTopics = new Set<string>();
    if (enabled.youtube && youtube.data.length > 0) {
      youtube.data.forEach(v => {
        // Extract keywords from titles as recommendations
        const words = v.title.split(' ').filter(w => w.length > 4);
        words.slice(0, 3).forEach(w => recommendedTopics.add(w));
      });
    }

    return {
      youtube: enabled.youtube ? youtube.data : [],
      instagram: enabled.instagram ? instagram.data : [],
      news: enabled.news ? news.data : [],
      linkedin: enabled.linkedin ? linkedin.data : [],
      recommendedTopics: Array.from(recommendedTopics).slice(0, 10),
      relatedNewsTopics: [],
      timestamp: Date.now(),
    };
  }, [topic, useRealApis, effectiveConfig, youtube.data, instagram.data, linkedin.data, news.data]);

  const loading = useRealApis
    ? (youtube.loading || instagram.loading || linkedin.loading || news.loading)
    : (topic.trim() ? mockLoading : false);

  const error = useRealApis
    ? (youtube.error || instagram.error || linkedin.error || news.error)
    : mockError;

  // Mock loading effect
  useEffect(() => {
    if (!topic.trim() || useRealApis) {
      return;
    }

    setMockLoading(true);
    setMockError(null);

    const timer = setTimeout(() => {
      setMockLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [topic, useRealApis]);

  const refetch = useCallback(() => {
    news.refetch();
  }, [news.refetch]);

  return {
    data,
    loading,
    error,
    config,
    setConfig,
    enabledPlatforms: {
      youtube: config.youtube.config.enabled,
      instagram: config.instagram.config.enabled,
      linkedin: config.linkedin.config.enabled,
      news: config.news.config.enabled,
    },
    refetch,
  };
}
