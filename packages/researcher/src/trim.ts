import type { ResearchArticle, ResearchArticleRef } from './types';
import { MAX_SNIPPET_CHARS, MAX_TOTAL_RESEARCH_CHARS } from './types';

/**
 * Clips a string to a maximum character limit, appending an ellipsis if truncation occurs.
 *
 * @param s - The string to clip.
 * @param max - The maximum allowed character count.
 * @returns The original string if it fits within the limit, otherwise the string truncated
 *          to max - 1 characters with an ellipsis appended.
 */
function clip(s: string, max: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}

/**
 * Clips the title and snippet of a research article to maximum character limits.
 *
 * @param a - The research article to trim.
 * @returns A new {@link ResearchArticle} object with clipped title and snippet.
 */
export function trimArticleSnippet(a: ResearchArticle): ResearchArticle {
  return {
    ...a,
    title: clip(a.title, 200),
    snippet: clip(a.snippet, MAX_SNIPPET_CHARS),
  };
}

/**
 * Trims research articles to fit within the prompt token budget and returns a list of references.
 *
 * Each article's title and snippet are clipped to max lengths, then articles are added in order
 * until the accumulated character count would exceed the total research budget. Articles that
 * would exceed the budget are excluded.
 *
 * @param articles - The full list of research articles to consider for inclusion.
 * @returns An array of {@link ResearchArticleRef} objects representing the articles that fit
 *          within the total character budget, each with clipped title/snippet and a URL.
 */
export function trimForPrompt(articles: ResearchArticle[]): ResearchArticleRef[] {
  const refs: ResearchArticleRef[] = [];
  let used = 0;
  for (const raw of articles) {
    const a = trimArticleSnippet(raw);
    const block = `${a.title}\n${a.snippet}\n${a.url}\n`;
    if (used + block.length > MAX_TOTAL_RESEARCH_CHARS) {
      break;
    }
    refs.push({
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt || undefined,
      snippet: a.snippet,
    });
    used += block.length;
  }
  return refs;
}
