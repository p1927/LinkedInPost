// worker/src/db/feedArticles.ts
// DB helpers for feed article cache and per-user article feedback.
// Feed snapshots are stored in news_snapshots with spreadsheet_id = 'feed:<userId>'
// so they stay isolated from research-scoped snapshots.

import { insertNewsSnapshotAndPrune } from '../persistence/pipeline-db/news';

export const FEED_SPREADSHEET_PREFIX = 'feed:';

export function feedSpreadsheetId(userId: string): string {
  return `${FEED_SPREADSHEET_PREFIX}${userId}`;
}

export interface FeedArticlesResult {
  articles: unknown[];
  fetchedAt: string | null;
  stale: boolean;
}

/**
 * Returns the most recent news_snapshot for the given topics within windowHours.
 * stale=true when no snapshot exists OR the snapshot is older than 24h.
 */
export async function getLatestFeedSnapshot(
  db: D1Database,
  userId: string,
  topics: string[],
  windowHours = 48,
): Promise<FeedArticlesResult> {
  if (topics.length === 0) {
    return { articles: [], fetchedAt: null, stale: true };
  }

  const spreadsheetId = feedSpreadsheetId(userId);
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  // Find the most recent snapshot for any of the group's topics within the window
  const placeholders = topics.map((_, i) => `?${i + 3}`).join(', ');
  const row = await db
    .prepare(
      `SELECT articles, fetched_at FROM news_snapshots
       WHERE spreadsheet_id = ?1
         AND topic_id IN (${placeholders})
         AND fetched_at > ?2
       ORDER BY fetched_at DESC
       LIMIT 1`,
    )
    .bind(spreadsheetId, cutoff, ...topics)
    .first<{ articles: string; fetched_at: string }>();

  if (!row) {
    return { articles: [], fetchedAt: null, stale: true };
  }

  let articles: unknown[] = [];
  try {
    const parsed = JSON.parse(row.articles) as unknown;
    articles = Array.isArray(parsed) ? parsed : [];
  } catch {
    articles = [];
  }

  const ageMs = Date.now() - new Date(row.fetched_at).getTime();
  const stale = ageMs > 24 * 60 * 60 * 1000;

  return { articles, fetchedAt: row.fetched_at, stale };
}

// ── Article feedback ──────────────────────────────────────────────────────────

export type FeedVote = 'up' | 'down';

/**
 * Upserts a vote. If the user already voted the same way, removes it (toggle off).
 * Returns the new vote or null if toggled off.
 */
export async function upsertArticleFeedback(
  db: D1Database,
  userId: string,
  articleUrl: string,
  vote: FeedVote,
): Promise<FeedVote | null> {
  const existing = await db
    .prepare('SELECT vote FROM article_feedback WHERE user_id = ?1 AND article_url = ?2')
    .bind(userId, articleUrl)
    .first<{ vote: string }>();

  if (existing?.vote === vote) {
    // Same vote → toggle off
    await db
      .prepare('DELETE FROM article_feedback WHERE user_id = ?1 AND article_url = ?2')
      .bind(userId, articleUrl)
      .run();
    return null;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO article_feedback (id, user_id, article_url, vote, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(user_id, article_url) DO UPDATE SET vote = ?4, created_at = ?5`,
    )
    .bind(id, userId, articleUrl, vote, now)
    .run();

  return vote;
}

/**
 * Returns a map of articleUrl → vote for the given user.
 */
export async function listArticleFeedback(
  db: D1Database,
  userId: string,
): Promise<Record<string, FeedVote>> {
  const rows = await db
    .prepare('SELECT article_url, vote FROM article_feedback WHERE user_id = ?1')
    .bind(userId)
    .all<{ article_url: string; vote: string }>();

  const result: Record<string, FeedVote> = {};
  for (const r of rows.results ?? []) {
    result[r.article_url] = r.vote as FeedVote;
  }
  return result;
}

/**
 * Persists a fresh fetch result to news_snapshots under the feed namespace.
 * Keeps the 3 most recent snapshots per topic.
 */
export async function saveFeedSnapshot(
  db: D1Database,
  userId: string,
  topic: string,
  articles: unknown[],
  meta: {
    windowStart: string;
    windowEnd: string;
    providersSummary?: string;
    dedupeRemoved?: string;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await insertNewsSnapshotAndPrune(db, {
    spreadsheetId: feedSpreadsheetId(userId),
    topicId: topic,
    fetchedAt: now,
    windowStart: meta.windowStart,
    windowEnd: meta.windowEnd,
    customQuery: '',
    providersSummary: meta.providersSummary ?? '',
    articlesJson: JSON.stringify(articles),
    dedupeRemoved: meta.dedupeRemoved ?? '',
    maxPerTopic: 3,
  });
}
