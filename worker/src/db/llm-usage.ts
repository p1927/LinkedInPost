import { estimateCostUsd } from '../llm/pricing';

export interface UsageLogEntry {
  spreadsheetId: string;
  userId: string;
  provider: string;
  model: string;
  settingKey: string;
  promptTokens: number;
  completionTokens: number;
}

function nanoid16(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  for (const byte of arr) result += chars[byte % chars.length];
  return result;
}

export async function logLlmUsage(db: D1Database, entry: UsageLogEntry): Promise<void> {
  const cost = estimateCostUsd(entry.provider, entry.model, entry.promptTokens, entry.completionTokens);
  await db
    .prepare(
      `INSERT INTO llm_usage_log (id, spreadsheet_id, user_id, provider, model, setting_key, prompt_tokens, completion_tokens, estimated_cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      nanoid16(),
      entry.spreadsheetId,
      entry.userId,
      entry.provider,
      entry.model,
      entry.settingKey,
      entry.promptTokens,
      entry.completionTokens,
      cost,
    )
    .run();
}

export interface UsageSummaryRow {
  date: string;
  provider: string;
  model: string;
  user_id: string;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
}

/**
 * Get usage summary for the last N days, optionally filtered to one spreadsheet.
 * Admins pass spreadsheetId='' to get cross-tenant data.
 */
export async function getUsageSummary(
  db: D1Database,
  opts: { spreadsheetId?: string; userId?: string; days?: number },
): Promise<UsageSummaryRow[]> {
  const days = opts.days ?? 30;
  const conditions: string[] = [`created_at >= datetime('now', '-${days} days')`];
  const binds: (string | number)[] = [];

  if (opts.spreadsheetId) {
    conditions.push('spreadsheet_id = ?');
    binds.push(opts.spreadsheetId);
  }
  if (opts.userId) {
    conditions.push('user_id = ?');
    binds.push(opts.userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT
      date(created_at) AS date,
      provider,
      model,
      user_id,
      COUNT(*) AS calls,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(estimated_cost_usd) AS estimated_cost_usd
    FROM llm_usage_log
    ${where}
    GROUP BY date(created_at), provider, model, user_id
    ORDER BY date DESC, estimated_cost_usd DESC
  `;

  const result = await db.prepare(sql).bind(...binds).all<UsageSummaryRow>();
  return result.results;
}
