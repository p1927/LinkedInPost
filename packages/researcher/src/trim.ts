import type { ResearchArticle, ResearchArticleRef } from './types';
import { MAX_SNIPPET_CHARS, MAX_TOTAL_RESEARCH_CHARS } from './types';

function clip(s: string, max: number): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}

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
