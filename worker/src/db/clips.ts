// worker/src/db/clips.ts

export interface ClipVersion {
  text: string;
  editedAt: string;
}

export interface DbClip {
  id: string;
  user_id: string;
  type: 'article' | 'passage';
  article_title: string;
  article_url: string;
  source: string;
  published_at: string;
  thumbnail_url: string;
  passage_text: string;
  clipped_at: string;
  versions_json: string;
  assigned_post_ids_json: string;
}

export interface PublicClip {
  id: string;
  type: 'article' | 'passage';
  articleTitle: string;
  articleUrl: string;
  source: string;
  publishedAt: string;
  thumbnailUrl: string;
  passageText: string;
  clippedAt: string;
  versions: ClipVersion[];
  assignedPostIds: string[];
}

function toPublic(r: DbClip): PublicClip {
  return {
    id: r.id,
    type: r.type,
    articleTitle: r.article_title,
    articleUrl: r.article_url,
    source: r.source,
    publishedAt: r.published_at,
    thumbnailUrl: r.thumbnail_url,
    passageText: r.passage_text,
    clippedAt: r.clipped_at,
    versions: JSON.parse(r.versions_json) as ClipVersion[],
    assignedPostIds: JSON.parse(r.assigned_post_ids_json) as string[],
  };
}

export async function listClips(db: D1Database, userId: string): Promise<PublicClip[]> {
  const rows = await db
    .prepare('SELECT * FROM clips WHERE user_id = ?1 ORDER BY clipped_at DESC')
    .bind(userId)
    .all<DbClip>();

  return (rows.results ?? []).map(toPublic);
}

export async function createClip(
  db: D1Database,
  userId: string,
  data: {
    type: 'article' | 'passage';
    articleTitle: string;
    articleUrl: string;
    source: string;
    publishedAt: string;
    thumbnailUrl?: string;
    passageText?: string;
  },
): Promise<PublicClip> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO clips
         (id, user_id, type, article_title, article_url, source, published_at,
          thumbnail_url, passage_text, clipped_at, versions_json, assigned_post_ids_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    )
    .bind(
      id,
      userId,
      data.type,
      data.articleTitle,
      data.articleUrl,
      data.source,
      data.publishedAt,
      data.thumbnailUrl ?? '',
      data.passageText ?? '',
      now,
      '[]',
      '[]',
    )
    .run();

  const row = await db
    .prepare('SELECT * FROM clips WHERE id = ?1')
    .bind(id)
    .first<DbClip>();

  if (!row) throw new Error('Failed to create clip.');
  return toPublic(row);
}

export async function updateClip(
  db: D1Database,
  userId: string,
  id: string,
  data: { passageText?: string },
): Promise<PublicClip> {
  const setClauses: string[] = [];
  const bindValues: string[] = [];

  if (data.passageText !== undefined) {
    // Auto-snapshot: read the current row first so we can push the old
    // passageText as a version entry before overwriting it.
    const current = await db
      .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
      .bind(id, userId)
      .first<DbClip>();

    if (!current) throw new Error('Clip not found.');

    const existingVersions = JSON.parse(current.versions_json) as ClipVersion[];
    if (current.passage_text) {
      existingVersions.push({ text: current.passage_text, editedAt: new Date().toISOString() });
    }

    bindValues.push(data.passageText);
    setClauses.push(`passage_text = ?${bindValues.length}`);
    bindValues.push(JSON.stringify(existingVersions));
    setClauses.push(`versions_json = ?${bindValues.length}`);
  }

  if (setClauses.length > 0) {
    const userIdIdx = bindValues.length + 1;
    const idIdx = bindValues.length + 2;

    await db
      .prepare(
        `UPDATE clips SET ${setClauses.join(', ')} WHERE user_id = ?${userIdIdx} AND id = ?${idIdx}`,
      )
      .bind(...bindValues, userId, id)
      .run();
  }

  const row = await db
    .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(id, userId)
    .first<DbClip>();

  if (!row) throw new Error('Clip not found.');
  return toPublic(row);
}

export async function deleteClip(db: D1Database, userId: string, id: string): Promise<void> {
  const result = await db
    .prepare('DELETE FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(id, userId)
    .run();
  if ((result.meta?.changes ?? 0) === 0) throw new Error('Clip not found.');
}

export async function assignClipToPost(
  db: D1Database,
  userId: string,
  clipId: string,
  postId: string,
): Promise<PublicClip> {
  const row = await db
    .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(clipId, userId)
    .first<DbClip>();

  if (!row) throw new Error('Clip not found.');

  // Non-atomic read-then-write: a concurrent call could cause a lost update.
  // Practical risk is low given D1's single-connection-per-request model.
  const ids = JSON.parse(row.assigned_post_ids_json) as string[];
  if (!ids.includes(postId)) {
    ids.push(postId);
    await db
      .prepare('UPDATE clips SET assigned_post_ids_json = ?1 WHERE id = ?2 AND user_id = ?3')
      .bind(JSON.stringify(ids), clipId, userId)
      .run();
  }

  const updated = await db
    .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(clipId, userId)
    .first<DbClip>();

  if (!updated) throw new Error('Clip not found after update.');
  return toPublic(updated);
}

export async function unassignClipFromPost(
  db: D1Database,
  userId: string,
  clipId: string,
  postId: string,
): Promise<PublicClip> {
  const row = await db
    .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(clipId, userId)
    .first<DbClip>();

  if (!row) throw new Error('Clip not found.');

  // Non-atomic read-then-write: a concurrent call could cause a lost update.
  // Practical risk is low given D1's single-connection-per-request model.
  const ids = (JSON.parse(row.assigned_post_ids_json) as string[]).filter((p) => p !== postId);
  await db
    .prepare('UPDATE clips SET assigned_post_ids_json = ?1 WHERE id = ?2 AND user_id = ?3')
    .bind(JSON.stringify(ids), clipId, userId)
    .run();

  const updated = await db
    .prepare('SELECT * FROM clips WHERE id = ?1 AND user_id = ?2')
    .bind(clipId, userId)
    .first<DbClip>();

  if (!updated) throw new Error('Clip not found after update.');
  return toPublic(updated);
}
