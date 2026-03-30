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
    topicKey: row.topic_key,
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
    topicKey: string;
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
  const insert = db
    .prepare(
      `INSERT INTO news_snapshots (
        id, spreadsheet_id, topic_key, fetched_at, window_start, window_end,
        custom_query, providers_summary, articles, dedupe_removed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.spreadsheetId,
      input.topicKey,
      input.fetchedAt,
      input.windowStart,
      input.windowEnd,
      input.customQuery,
      input.providersSummary,
      input.articlesJson,
      input.dedupeRemoved,
    );

  const prune = db.prepare(
    `WITH ranked AS (
      SELECT id,
        ROW_NUMBER() OVER (PARTITION BY spreadsheet_id, topic_key ORDER BY fetched_at DESC) AS rn
      FROM news_snapshots
      WHERE spreadsheet_id = ?1 AND topic_key = ?2
    )
    DELETE FROM news_snapshots
    WHERE id IN (SELECT id FROM ranked WHERE rn > ?3)`,
  ).bind(input.spreadsheetId, input.topicKey, input.maxPerTopic);

  await db.batch([insert, prune]);
}

export async function listNewsResearchHistory(
  db: D1Database,
  spreadsheetId: string,
  options: { topicKey?: string; limit: number },
): Promise<NewsSnapshotListItem[]> {
  let stmt: D1PreparedStatement;
  if (options.topicKey) {
    stmt = db
      .prepare(
        `SELECT * FROM news_snapshots
         WHERE spreadsheet_id = ?1 AND topic_key = ?2
         ORDER BY fetched_at DESC
         LIMIT ?3`,
      )
      .bind(spreadsheetId, options.topicKey, options.limit);
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

/** Cron / scheduled: drop snapshots older than maxAgeDays (if set) and enforce max per topic. */
export async function pruneOldNewsSnapshots(
  db: D1Database,
  maxPerTopic: number,
  maxAgeDays?: number,
): Promise<void> {
  if (maxAgeDays !== undefined && maxAgeDays > 0) {
    await db
      .prepare(`DELETE FROM news_snapshots WHERE fetched_at < datetime('now', ?)`)
      .bind(`-${maxAgeDays} days`)
      .run();
  }

  const { results = [] } = await db
    .prepare(`SELECT DISTINCT spreadsheet_id, topic_key FROM news_snapshots`)
    .all<{ spreadsheet_id: string; topic_key: string }>();

  const pruneStmts = results.map((t) =>
    db
      .prepare(
        `WITH ranked AS (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY spreadsheet_id, topic_key ORDER BY fetched_at DESC) AS rn
          FROM news_snapshots
          WHERE spreadsheet_id = ?1 AND topic_key = ?2
        )
        DELETE FROM news_snapshots
        WHERE id IN (SELECT id FROM ranked WHERE rn > ?3)`,
      )
      .bind(t.spreadsheet_id, t.topic_key, maxPerTopic),
  );

  for (let i = 0; i < pruneStmts.length; i += 128) {
    await db.batch(pruneStmts.slice(i, i + 128));
  }
}
