export { runNewsResearch, trimForPrompt } from './search';
export { normalizeNewsResearchStored, collectEnabledRssUrls } from './config';
export { dedupeArticles, canonicalizeUrl } from './dedupe';
export { trimArticleSnippet } from './trim';
export type { ResearcherEnv } from './env';
export type {
  ResearchArticle,
  ResearchArticleRef,
  NewsResearchStored,
  NewsResearchSearchPayload,
  NewsResearchSearchResult,
  NewsApiProviderId,
  NewsResearchFeedEntry,
} from './types';
