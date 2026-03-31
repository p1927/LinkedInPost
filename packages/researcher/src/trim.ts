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
