import type { AutomationRule } from './types';

const RULE_PREFIX = 'automation:rule:';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function runAutomationCleanup(kv: KVNamespace): Promise<{ removed: number }> {
  const now = Date.now();
  const listed = await kv.list({ prefix: RULE_PREFIX });
  let removed = 0;

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

  return { removed };
}
