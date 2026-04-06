// worker/src/db/socialIntegrations.ts

export interface DbSocialIntegration {
  id: string;
  user_id: string;
  provider: string;
  internal_id: string;
  display_name: string;
  profile_picture: string;
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: string;
  needs_reauth: number;
  scopes: string;
  created_at: string;
  updated_at: string;
}

/** Public shape returned to the frontend — no tokens. */
export interface PublicIntegration {
  provider: string;
  internalId: string;
  displayName: string;
  profilePicture: string;
  needsReauth: boolean;
  connectedAt: string;
}

function makeId(): string {
  return crypto.randomUUID();
}

/** Upsert (insert or replace) a social integration row. */
export async function upsertSocialIntegration(
  db: D1Database,
  opts: {
    userId: string;
    provider: string;
    internalId: string;
    displayName: string;
    profilePicture: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    tokenExpiresAt: string;
    scopes: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO social_integrations
         (id, user_id, provider, internal_id, display_name, profile_picture,
          access_token_enc, refresh_token_enc, token_expires_at, needs_reauth, scopes)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         internal_id      = excluded.internal_id,
         display_name     = excluded.display_name,
         profile_picture  = excluded.profile_picture,
         access_token_enc = excluded.access_token_enc,
         refresh_token_enc = excluded.refresh_token_enc,
         token_expires_at = excluded.token_expires_at,
         needs_reauth     = 0,
         scopes           = excluded.scopes,
         updated_at       = datetime('now')`,
    )
    .bind(
      makeId(),
      opts.userId,
      opts.provider,
      opts.internalId,
      opts.displayName,
      opts.profilePicture,
      opts.accessTokenEnc,
      opts.refreshTokenEnc,
      opts.tokenExpiresAt,
      opts.scopes,
    )
    .run();
}

/** Delete a social integration row. */
export async function deleteSocialIntegration(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM social_integrations WHERE user_id = ?1 AND provider = ?2')
    .bind(userId, provider)
    .run();
}

/** Get all integrations for a user (sanitized — no tokens). */
export async function listSocialIntegrations(
  db: D1Database,
  userId: string,
): Promise<PublicIntegration[]> {
  const rows = await db
    .prepare('SELECT * FROM social_integrations WHERE user_id = ?1 ORDER BY created_at ASC')
    .bind(userId)
    .all<DbSocialIntegration>();

  return (rows.results ?? []).map((r) => ({
    provider: r.provider,
    internalId: r.internal_id,
    displayName: r.display_name,
    profilePicture: r.profile_picture,
    needsReauth: r.needs_reauth === 1,
    connectedAt: r.created_at,
  }));
}

/** Get a single integration row including encrypted tokens (for publishing). */
export async function getSocialIntegration(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<DbSocialIntegration | null> {
  return db
    .prepare('SELECT * FROM social_integrations WHERE user_id = ?1 AND provider = ?2')
    .bind(userId, provider)
    .first<DbSocialIntegration>();
}

/** Mark an integration as needing re-auth (e.g. after a 401 that refresh couldn't fix). */
export async function markSocialIntegrationNeedsReauth(
  db: D1Database,
  userId: string,
  provider: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE social_integrations SET needs_reauth = 1, updated_at = datetime('now')
       WHERE user_id = ?1 AND provider = ?2`,
    )
    .bind(userId, provider)
    .run();
}
