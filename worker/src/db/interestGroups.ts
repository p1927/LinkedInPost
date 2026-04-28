// worker/src/db/interestGroups.ts

export interface DbInterestGroup {
  id: string;
  user_id: string;
  name: string;
  topics_json: string;
  domains_json: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface PublicInterestGroup {
  id: string;
  name: string;
  topics: string[];
  domains: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

function toPublic(r: DbInterestGroup): PublicInterestGroup {
  return {
    id: r.id,
    name: r.name,
    topics: JSON.parse(r.topics_json) as string[],
    domains: JSON.parse(r.domains_json) as string[],
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listInterestGroups(
  db: D1Database,
  userId: string,
): Promise<PublicInterestGroup[]> {
  const rows = await db
    .prepare('SELECT * FROM interest_groups WHERE user_id = ?1 ORDER BY created_at ASC')
    .bind(userId)
    .all<DbInterestGroup>();

  return (rows.results ?? []).map(toPublic);
}

export async function createInterestGroup(
  db: D1Database,
  userId: string,
  data: { name: string; topics: string[]; domains: string[]; color: string },
): Promise<PublicInterestGroup> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO interest_groups (id, user_id, name, topics_json, domains_json, color, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      id,
      userId,
      data.name,
      JSON.stringify(data.topics),
      JSON.stringify(data.domains),
      data.color,
      now,
      now,
    )
    .run();

  const row = await db
    .prepare('SELECT * FROM interest_groups WHERE id = ?1')
    .bind(id)
    .first<DbInterestGroup>();

  if (!row) throw new Error('Failed to create interest group.');
  return toPublic(row);
}

export async function updateInterestGroup(
  db: D1Database,
  userId: string,
  id: string,
  data: { name?: string; topics?: string[]; domains?: string[]; color?: string },
): Promise<PublicInterestGroup> {
  const setClauses: string[] = [];
  const bindValues: (string)[] = [];

  if (data.name !== undefined) {
    bindValues.push(data.name);
    setClauses.push(`name = ?${bindValues.length}`);
  }
  if (data.topics !== undefined) {
    bindValues.push(JSON.stringify(data.topics));
    setClauses.push(`topics_json = ?${bindValues.length}`);
  }
  if (data.domains !== undefined) {
    bindValues.push(JSON.stringify(data.domains));
    setClauses.push(`domains_json = ?${bindValues.length}`);
  }
  if (data.color !== undefined) {
    bindValues.push(data.color);
    setClauses.push(`color = ?${bindValues.length}`);
  }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = ?${bindValues.length + 1}`);
    bindValues.push(new Date().toISOString());

    // user_id check appended as final bind
    const userIdIdx = bindValues.length + 1;
    const idIdx = bindValues.length + 2;

    await db
      .prepare(
        `UPDATE interest_groups SET ${setClauses.join(', ')} WHERE user_id = ?${userIdIdx} AND id = ?${idIdx}`,
      )
      .bind(...bindValues, userId, id)
      .run();
  }

  const row = await db
    .prepare('SELECT * FROM interest_groups WHERE id = ?1 AND user_id = ?2')
    .bind(id, userId)
    .first<DbInterestGroup>();

  if (!row) throw new Error('Interest group not found.');
  return toPublic(row);
}

export async function deleteInterestGroup(
  db: D1Database,
  userId: string,
  id: string,
): Promise<void> {
  const result = await db
    .prepare('DELETE FROM interest_groups WHERE id = ?1 AND user_id = ?2')
    .bind(id, userId)
    .run();
  if ((result.meta?.changes ?? 0) === 0) throw new Error('Interest group not found.');
}
