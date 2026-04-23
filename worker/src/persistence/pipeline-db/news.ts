import type { NewsSnapshotDbRow, NewsSnapshotListItem } from './types';

function parseArticleCount(articlesJson: string): number {
  try {
    const parsed = JSON.parse(articlesJson) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function newsSnapshotRowToListItem(row: NewsSnapshotDbRow): NewsSnapshotListItem {
  return {
    id: row.id,
    topicId: row.topic_id,
    fetchedAt: row.fetched_at,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    customQuery: row.custom_query,
    providersSummary: row.providers_summary,
    articleCount: parseArticleCount(row.articles),
    dedupeRemoved: row.dedupe_removed,
  };
}

export async function insertNewsSnapshotAndPrune(
  db: D1Database,
  input: {
    spreadsheetId: string;
    topicId: string;
    fetchedAt: string;
    windowStart: string;
    windowEnd: string;
    customQuery: string;
    providersSummary: string;
    articlesJson: string;
    dedupeRemoved: string;
    maxPerTopic: number;
  },
): Promise<void> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const insert = db
    .prepare(
      `INSERT INTO news_snapshots (
        id, spreadsheet_id, topic_id, fetched_at, window_start, window_end,
        custom_query, providers_summary, articles, dedupe_removed, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.spreadsheetId,
      input.topicId,
      input.fetchedAt,
      input.windowStart,
      input.windowEnd,
      input.customQuery,
      input.providersSummary,
      input.articlesJson,
      input.dedupeRemoved,
      expiresAt,
    );

  const prune = db
    .prepare(
      `WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY spreadsheet_id, topic_id ORDER BY fetched_at DESC) AS rn
      FROM news_snapshots
      WHERE spreadsheet_id = ?1 AND topic_id = ?2
    )
    DELETE FROM news_snapshots
    WHERE id IN (SELECT id FROM ranked WHERE rn > ?3)`,
    )
    .bind(input.spreadsheetId, input.topicId, input.maxPerTopic);

  await db.batch([insert, prune]);
}

export async function listNewsResearchHistory(
  db: D1Database,
  spreadsheetId: string,
  options: { topicId?: string; limit: number },
): Promise<NewsSnapshotListItem[]> {
  let stmt: D1PreparedStatement;
  if (options.topicId) {
    stmt = db
      .prepare(
        `SELECT * FROM news_snapshots
         WHERE spreadsheet_id = ?1 AND topic_id = ?2
         ORDER BY fetched_at DESC
         LIMIT ?3`,
      )
      .bind(spreadsheetId, options.topicId, options.limit);
  } else {
    stmt = db
      .prepare(
        `SELECT * FROM news_snapshots
         WHERE spreadsheet_id = ?1
         ORDER BY fetched_at DESC
         LIMIT ?2`,
      )
      .bind(spreadsheetId, options.limit);
  }
  const res = await stmt.all<NewsSnapshotDbRow>();
  const rows = (res.results ?? []) as NewsSnapshotDbRow[];
  return rows.map(newsSnapshotRowToListItem);
}

export async function getNewsResearchSnapshotById(
  db: D1Database,
  spreadsheetId: string,
  id: string,
): Promise<NewsSnapshotDbRow | null> {
  const row = await db
    .prepare(`SELECT * FROM news_snapshots WHERE id = ?1 AND spreadsheet_id = ?2 LIMIT 1`)
    .bind(id, spreadsheetId)
    .first<NewsSnapshotDbRow>();
  return row ?? null;
}

/** Cron / scheduled: drop snapshots older than maxAgeDays (if set) or expired TTL, and enforce max per topic. */
export async function pruneOldNewsSnapshots(
  db: D1Database,
  maxPerTopic: number,
  maxAgeDays?: number,
): Promise<void> {
  // Always enforce 30-day TTL first (expires_at column)
  await db
    .prepare(`DELETE FROM news_snapshots WHERE expires_at < datetime('now')`)
    .run();

  // Additional maxAgeDays cleanup if configured (uses fetched_at for backward compat)
  if (maxAgeDays !== undefined && maxAgeDays > 0) {
    await db
      .prepare(`DELETE FROM news_snapshots WHERE fetched_at < datetime('now', ?)`)
      .bind(`-${maxAgeDays} days`)
      .run();
  }

  const { results = [] } = await db
    .prepare(`SELECT DISTINCT spreadsheet_id, topic_id FROM news_snapshots`)
    .all<{ spreadsheet_id: string; topic_id: string }>();

  const pruneStmts = results.map((t) =>
    db
      .prepare(
        `WITH ranked AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY spreadsheet_id, topic_id ORDER BY fetched_at DESC) AS rn
          FROM news_snapshots
          WHERE spreadsheet_id = ?1 AND topic_id = ?2
        )
        DELETE FROM news_snapshots
        WHERE id IN (SELECT id FROM ranked WHERE rn > ?3)`,
      )
      .bind(t.spreadsheet_id, t.topic_id, maxPerTopic),
  );

  for (let i = 0; i < pruneStmts.length; i += 128) {
    await db.batch(pruneStmts.slice(i, i + 128));
  }
}

/** Delete all news snapshots for a specific topic (called when a topic is deleted). */
export async function deleteNewsSnapshotsByTopicId(
  db: D1Database,
  spreadsheetId: string,
  topicId: string,
): Promise<void> {
  const id = String(topicId || '').trim();
  if (!id) return;
  await db
    .prepare(`DELETE FROM news_snapshots WHERE spreadsheet_id = ? AND topic_id = ?`)
    .bind(spreadsheetId, id)
    .run();
}
