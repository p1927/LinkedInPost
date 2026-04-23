import type { AutomationRule } from './types';
import { RULE_KEY_PREFIX } from './kv';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function runAutomationCleanup(kv: KVNamespace): Promise<{ removed: number }> {
  const now = Date.now();
  let removed = 0;
  let cursor: string | undefined;

  do {
    const listed: KVNamespaceListResult<unknown, string> = cursor
      ? await kv.list({ prefix: RULE_KEY_PREFIX, cursor })
      : await kv.list({ prefix: RULE_KEY_PREFIX });

    for (const { name } of listed.keys) {
    const rule = await kv.get<AutomationRule>(name, 'json');

    if (!rule) {
      await kv.delete(name);
      removed++;
      continue;
    }

    if (!rule.enabled) {
      const age = now - (rule.updatedAt ? new Date(rule.updatedAt).getTime() : 0);
      if (age > SEVEN_DAYS_MS) {
        await kv.delete(name);
        removed++;
      }
    }
    }

    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);

  return { removed };
}
