export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  viewCount: string;
  likeCount?: string;
  thumbnailUrl: string;
  url: string;
  publishedAt: string;
  platform: 'youtube';
}

export interface InstagramPost {
  id: string;
  caption: string;
  mediaUrl: string;
  likeCount: string;
  commentsCount?: string;
  hashtags: string[];
  url: string;
  platform: 'instagram';
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  platform: 'news';
}

export interface LinkedInPost {
  id: string;
  title: string;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  viewCount?: string;
  likeCount?: string;
  commentsCount?: string;
  publishedAt: string;
  platform: 'linkedin';
  hashtags?: string[];
  authorName?: string;
  authorHeadline?: string;
}

export interface TrendingData {
  youtube: YouTubeVideo[];
  instagram: InstagramPost[];
  linkedin: LinkedInPost[];
  news: NewsArticle[];
  recommendedTopics: string[];
  relatedNewsTopics: string[];
  timestamp: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'youtube' | 'instagram' | 'linkedin' | 'news';
  size: number;
  color: string;
  data: YouTubeVideo | InstagramPost | LinkedInPost | NewsArticle;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface TrendingSearchRequest {
  topic: string;
  region: string;
  genre: string;
  windowDays: number;
}

export interface TrendingWord {
  word: string;
  count: number;
  tier: 'high' | 'mid' | 'low';
}

export interface TrendingSearchResult {
  articles: NewsArticle[];
  relatedTopics: string[];
  trendingWords: TrendingWord[];
  keywords: string[];
  searchIntent: string;
  sources: string[];
}
