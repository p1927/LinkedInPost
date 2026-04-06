export interface DbUser {
  id: string;
  display_name: string;
  avatar_url: string;
  spreadsheet_id: string;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a user row on every login. Returns the stored row.
 * id = Google email (lowercase). display_name and avatar_url are updated each login.
 */
export async function upsertUser(
  db: D1Database,
  id: string,
  displayName: string,
  avatarUrl: string,
): Promise<DbUser> {
  await db
    .prepare(
      `INSERT INTO users (id, display_name, avatar_url)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         avatar_url   = excluded.avatar_url,
         updated_at   = datetime('now')`,
    )
    .bind(id, displayName, avatarUrl)
    .run();

  const row = await db
    .prepare('SELECT * FROM users WHERE id = ?1')
    .bind(id)
    .first<DbUser>();

  if (!row) {
    throw new Error('Failed to upsert user.');
  }
  return row;
}

/** Update the spreadsheet_id for a user (optional content source). */
export async function setUserSpreadsheetId(
  db: D1Database,
  userId: string,
  spreadsheetId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET spreadsheet_id = ?1, updated_at = datetime('now') WHERE id = ?2`,
    )
    .bind(spreadsheetId, userId)
    .run();
}

export interface UserTenantSettingsRow {
  id: string;
  display_name: string;
  avatar_url: string;
  user_rules: string;
  user_who_am_i: string;
}

/** Update per-user generation rules and/or "who am I" author profile. */
export async function setUserTenantSettings(
  db: D1Database,
  userId: string,
  settings: { userRules?: string; userWhoAmI?: string },
): Promise<void> {
  const setClauses: string[] = [];
  const bindValues: string[] = [];

  if (typeof settings.userRules === 'string') {
    bindValues.push(settings.userRules.trim());
    setClauses.push(`user_rules = ?${bindValues.length}`);
  }
  if (typeof settings.userWhoAmI === 'string') {
    bindValues.push(settings.userWhoAmI.trim());
    setClauses.push(`user_who_am_i = ?${bindValues.length}`);
  }
  if (setClauses.length === 0) return;

  setClauses.push("updated_at = datetime('now')");
  bindValues.push(userId);

  await db
    .prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?${bindValues.length}`)
    .bind(...bindValues)
    .run();
}

/** List all users with their per-tenant settings (admin use only). */
export async function listAllUserTenantSettings(db: D1Database): Promise<UserTenantSettingsRow[]> {
  const { results } = await db
    .prepare('SELECT id, display_name, avatar_url, user_rules, user_who_am_i FROM users ORDER BY created_at ASC')
    .all<UserTenantSettingsRow>();
  return results ?? [];
}

/** Mark onboarding complete. */
export async function completeUserOnboarding(
  db: D1Database,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET onboarding_completed = 1, updated_at = datetime('now') WHERE id = ?1`,
    )
    .bind(userId)
    .run();
}
