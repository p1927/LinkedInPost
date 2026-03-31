import type { D1Database } from '@cloudflare/workers-types';
import type { ContentReviewNewsMode } from './types';

/**
 * Build a summarised news context string for the relevance review prompt.
 * - 'existing': read the most recent stored news snapshot for this topic from D1
 * - 'fresh': not yet implemented in v1; falls back to existing
 */
export async function buildNewsContext(
  db: D1Database,
  spreadsheetId: string,
  topicId: string,
  mode: ContentReviewNewsMode,
): Promise<string | null> {
  // v1: always use stored snapshots (fresh mode is a future enhancement)
  void mode;
  try {
    const result = await db
      .prepare(
        `SELECT articles, providers_summary FROM news_snapshots
         WHERE spreadsheet_id = ? AND topic_id = ?
         ORDER BY fetched_at DESC LIMIT 1`,
      )
      .bind(spreadsheetId, topicId)
      .first<{ articles: string; providers_summary: string }>();

    if (!result) return null;

    const articles = JSON.parse(result.articles || '[]') as Array<{
      title?: string;
      snippet?: string;
      source?: string;
    }>;
    if (!Array.isArray(articles) || articles.length === 0) return null;

    const lines = articles.slice(0, 8).map((a) => {
      const parts = [a.title, a.snippet].filter(Boolean).join(' — ');
      return a.source ? `[${a.source}] ${parts}` : parts;
    });
    return lines.join('\n');
  } catch {
    return null;
  }
}
