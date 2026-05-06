/**
 * Tests for automation rule cleanup module.
 *
 * Verifies runAutomationCleanup behavior against the SPEC:
 *   - Iterates all KV keys with RULE_KEY_PREFIX
 *   - Deletes orphaned keys (null / invalid JSON)
 *   - Deletes disabled rules older than 7 days
 *   - Preserves active rules and recently-disabled rules
 *   - Returns the count of removed entries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAutomationCleanup } from './cleanup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock KV namespace that tracks deleted keys and controls list/get results. */
function makeKvStore(options: {
  /** Keys returned by the list() call. */
  listedKeys?: Array<{ name: string; expiration?: number; metadata?: unknown }>;
  /** Controls what kv.get() returns when { type: 'json' } is used. */
  getResult?: 'rule' | 'null';
  /** Controls kv.list() pagination cursor. */
  nextCursor?: string;
}): Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] } {
  const { listedKeys = [], getResult = 'rule', nextCursor } = options;
  const deletedNames: string[] = [];

  // Store raw JSON strings. When get() is called with { type: 'json' },
  // Workers KV parses the JSON and returns the object.
  const store = new Map<string, string>();
  if (getResult === 'rule') {
    listedKeys.forEach(({ name }) => {
      store.set(name, JSON.stringify({ enabled: true, updatedAt: new Date().toISOString() }));
    });
  }

  return {
    deletedNames,
    delete: vi.fn(async (name: string) => { deletedNames.push(name); }),
    list: vi.fn(async ({ cursor }: { prefix?: string; cursor?: string }) => {
      if (cursor && cursor === 'page2') {
        return { keys: [], list_complete: true, cursor: undefined };
      }
      return {
        keys: listedKeys,
        list_complete: nextCursor === undefined,
        cursor: nextCursor,
      };
    }),
    get: vi.fn(async (name: string) => {
      // Simulate { type: 'json' } option — Workers KV parses stored JSON
      if (getResult === 'null') return null;
      const raw = store.get(name);
      if (!raw) return null;
      return JSON.parse(raw); // Returns parsed object, matching Workers KV { type: 'json' }
    }),
  } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };
}

// ---------------------------------------------------------------------------
// runAutomationCleanup
// ---------------------------------------------------------------------------

describe('runAutomationCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'));
  });

  it('returns { removed: 0 } when no keys are stored', async () => {
    const kv = makeKvStore({ listedKeys: [] });
    const result = await runAutomationCleanup(kv as KVNamespace);
    expect(result).toEqual({ removed: 0 });
  });

  it('deletes orphaned keys (kv.get returns null)', async () => {
    const kv = makeKvStore({
      listedKeys: [
        { name: 'automation:rule:linkedin:channel-abc' },
        { name: 'automation:rule:instagram:channel-xyz' },
      ],
      getResult: 'null',
    });
    const result = await runAutomationCleanup(kv as KVNamespace);
    expect(result.removed).toBe(2);
    expect(kv.deletedNames).toContain('automation:rule:linkedin:channel-abc');
    expect(kv.deletedNames).toContain('automation:rule:instagram:channel-xyz');
  });

  it('deletes disabled rules older than 7 days', async () => {
    const oldDate = new Date('2026-04-20T12:00:00Z').toISOString(); // 11 days ago
    const recentDate = new Date('2026-05-01T12:00:00Z').toISOString(); // now
    const kvStore = new Map<string, string>([
      ['automation:rule:linkedin:channel-old', JSON.stringify({ enabled: false, updatedAt: oldDate })],
      ['automation:rule:telegram:channel-recent', JSON.stringify({ enabled: false, updatedAt: recentDate })],
    ]);

    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kvStore.delete(name); kv.deletedNames.push(name); }),
      list: vi.fn(async () => ({
        keys: [
          { name: 'automation:rule:linkedin:channel-old' },
          { name: 'automation:rule:telegram:channel-recent' },
        ],
        list_complete: true,
        cursor: undefined,
      })),
      // Simulate { type: 'json' } — Workers KV parses JSON
      get: vi.fn(async (name: string) => {
        const raw = kvStore.get(name);
        return raw ? JSON.parse(raw) : null;
      }),
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    expect(result.removed).toBe(1);
    expect(kv.deletedNames).toContain('automation:rule:linkedin:channel-old');
    expect(kv.deletedNames).not.toContain('automation:rule:telegram:channel-recent');
  });

  it('does NOT delete enabled rules even if they are old', async () => {
    const oldDate = new Date('2026-04-20T12:00:00Z').toISOString(); // 11 days ago
    const kvStore = new Map<string, string>([
      ['automation:rule:linkedin:channel-old-enabled', JSON.stringify({ enabled: true, updatedAt: oldDate })],
    ]);

    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kv.deletedNames.push(name); }),
      list: vi.fn(async () => ({
        keys: [{ name: 'automation:rule:linkedin:channel-old-enabled' }],
        list_complete: true,
        cursor: undefined,
      })),
      get: vi.fn(async (name: string) => {
        const raw = kvStore.get(name);
        return raw ? JSON.parse(raw) : null;
      }),
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    expect(result.removed).toBe(0);
    expect(kv.deletedNames).not.toContain('automation:rule:linkedin:channel-old-enabled');
  });

  it('does NOT delete disabled rules less than 7 days old', async () => {
    const recentDate = new Date('2026-04-29T12:00:00Z').toISOString(); // 2 days ago
    const kvStore = new Map<string, string>([
      ['automation:rule:gmail:channel-recent', JSON.stringify({ enabled: false, updatedAt: recentDate })],
    ]);

    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kv.deletedNames.push(name); }),
      list: vi.fn(async () => ({
        keys: [{ name: 'automation:rule:gmail:channel-recent' }],
        list_complete: true,
        cursor: undefined,
      })),
      get: vi.fn(async (name: string) => {
        const raw = kvStore.get(name);
        return raw ? JSON.parse(raw) : null;
      }),
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    expect(result.removed).toBe(0);
    expect(kv.deletedNames).not.toContain('automation:rule:gmail:channel-recent');
  });

  it('handles disabled rules with missing updatedAt gracefully', async () => {
    // updatedAt is undefined, so age defaults to 0 — should NOT be deleted
    const kvStore = new Map<string, string>([
      ['automation:rule:youtube:no-date', JSON.stringify({ enabled: false })],
    ]);

    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kv.deletedNames.push(name); }),
      list: vi.fn(async () => ({
        keys: [{ name: 'automation:rule:youtube:no-date' }],
        list_complete: true,
        cursor: undefined,
      })),
      get: vi.fn(async (name: string) => {
        const raw = kvStore.get(name);
        return raw ? JSON.parse(raw) : null;
      }),
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    expect(result.removed).toBe(0);
    expect(kv.deletedNames).not.toContain('automation:rule:youtube:no-date');
  });

  it('handles pagination — processes multiple pages of keys', async () => {
    const now = new Date('2026-05-01T12:00:00Z').toISOString();
    const oldDate = new Date('2026-04-20T12:00:00Z').toISOString();
    const kvStore = new Map<string, string>([
      ['automation:rule:linkedin:page1', JSON.stringify({ enabled: true, updatedAt: now })],
      ['automation:rule:instagram:page2', JSON.stringify({ enabled: false, updatedAt: oldDate })],
    ]);

    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kv.deletedNames.push(name); }),
      list: vi.fn(async ({ cursor }: { prefix?: string; cursor?: string }) => {
        if (!cursor) {
          return {
            keys: [{ name: 'automation:rule:linkedin:page1' }],
            list_complete: false,
            cursor: 'page2',
          };
        }
        return {
          keys: [{ name: 'automation:rule:instagram:page2' }],
          list_complete: true,
          cursor: undefined,
        };
      }),
      get: vi.fn(async (name: string) => {
        const raw = kvStore.get(name);
        return raw ? JSON.parse(raw) : null;
      }),
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    // page1: enabled, keep; page2: disabled + >7 days, delete
    expect(result.removed).toBe(1);
    expect(kv.deletedNames).toContain('automation:rule:instagram:page2');
    expect(kv.deletedNames).not.toContain('automation:rule:linkedin:page1');
  });

  it('returns total removed count across all pages', async () => {
    // All orphaned (kv.get returns null)
    const kv = {
      deletedNames: [] as string[],
      delete: vi.fn(async (name: string) => { kv.deletedNames.push(name); }),
      list: vi.fn(async ({ cursor }: { prefix?: string; cursor?: string }) => {
        if (!cursor) {
          return {
            keys: [{ name: 'automation:rule:linkedin:orphan1' }],
            list_complete: false,
            cursor: 'page2',
          };
        }
        return {
          keys: [{ name: 'automation:rule:telegram:orphan2' }],
          list_complete: true,
          cursor: undefined,
        };
      }),
      get: vi.fn(async () => null), // All null = orphaned
    } as unknown as Omit<KVNamespace, 'delete' | 'list' | 'get'> & { deletedNames: string[] };

    const result = await runAutomationCleanup(kv as unknown as KVNamespace);
    expect(result.removed).toBe(2);
    expect(kv.deletedNames).toContain('automation:rule:linkedin:orphan1');
    expect(kv.deletedNames).toContain('automation:rule:telegram:orphan2');
  });
});
