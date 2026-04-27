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

export async function getUserStatus(db: D1Database, userId: string): Promise<'active' | 'pending' | 'suspended' | null> {
  const row = await db.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first<{ status: string }>();
  return row ? (row.status as 'active' | 'pending' | 'suspended') : null;
}

export async function setUserStatus(db: D1Database, userId: string, status: 'active' | 'suspended'): Promise<void> {
  await db.prepare('UPDATE users SET status = ? WHERE id = ?').bind(status, userId).run();
}

export async function setUserBudget(db: D1Database, userId: string, monthlyTokenBudget: number): Promise<void> {
  await db.prepare('UPDATE users SET monthly_token_budget = ? WHERE id = ?').bind(monthlyTokenBudget, userId).run();
}

export async function getMonthlyTokenUsage(db: D1Database, userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(total_tokens), 0) as used
       FROM llm_usage_log
       WHERE user_id = ? AND created_at >= ?`
    )
    .bind(userId, start.toISOString())
    .first<{ used: number }>();
  return row?.used ?? 0;
}

export async function getUserBudget(db: D1Database, userId: string): Promise<number> {
  const row = await db.prepare('SELECT monthly_token_budget FROM users WHERE id = ?').bind(userId).first<{ monthly_token_budget: number }>();
  return row?.monthly_token_budget ?? 500000;
}

export async function createAccessRequest(db: D1Database, id: string, email: string, name: string | null, reason: string | null): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO access_requests (id, email, name, reason) VALUES (?, ?, ?, ?)')
    .bind(id, email, name, reason)
    .run();
}

export async function listAccessRequests(db: D1Database, status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return db.prepare('SELECT * FROM access_requests WHERE status = ? ORDER BY created_at DESC').bind(status).all();
}

export async function resolveAccessRequest(db: D1Database, email: string, decision: 'approved' | 'rejected', reviewedBy: string): Promise<void> {
  await db
    .prepare("UPDATE access_requests SET status = ?, reviewed_at = datetime('now'), reviewed_by = ? WHERE email = ?")
    .bind(decision, reviewedBy, email)
    .run();
}

export async function listAllUsers(db: D1Database) {
  return db.prepare('SELECT id, display_name, avatar_url, status, monthly_token_budget, created_at FROM users ORDER BY created_at DESC').all();
}
