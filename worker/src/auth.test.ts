import { describe, it, expect, vi } from 'vitest';
import { checkUserAccess, checkTokenBudget } from './auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a D1Database mock whose prepare().bind().first() returns `row`. */
function makeDbReturningFirst(row: unknown): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(row),
        run: vi.fn().mockResolvedValue({}),
      }),
    }),
  } as unknown as D1Database;
}

/** Build a D1Database mock that returns different values for successive first() calls. */
function makeDbReturningFirstSequence(...rows: unknown[]): D1Database {
  const firstMock = vi.fn();
  rows.forEach((row) => firstMock.mockResolvedValueOnce(row));
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: firstMock,
        run: vi.fn().mockResolvedValue({}),
      }),
    }),
  } as unknown as D1Database;
}

// ---------------------------------------------------------------------------
// checkUserAccess
// ---------------------------------------------------------------------------

describe('checkUserAccess', () => {
  it('returns allowed:false suspended:false for unknown user (db returns null)', async () => {
    const db = makeDbReturningFirst(null);
    const result = await checkUserAccess(db, 'unknown@example.com', []);
    expect(result).toEqual({ allowed: false, suspended: false, isAdmin: false });
  });

  it('returns allowed:false suspended:true when user status is suspended', async () => {
    const db = makeDbReturningFirst({ status: 'suspended' });
    const result = await checkUserAccess(db, 'user@example.com', []);
    expect(result).toEqual({ allowed: false, suspended: true, isAdmin: false });
  });

  it('returns allowed:true suspended:false when user status is active', async () => {
    const db = makeDbReturningFirst({ status: 'active' });
    const result = await checkUserAccess(db, 'user@example.com', []);
    expect(result).toEqual({ allowed: true, suspended: false, isAdmin: false });
  });

  it('returns allowed:false for pending status', async () => {
    const db = makeDbReturningFirst({ status: 'pending' });
    const result = await checkUserAccess(db, 'user@example.com', []);
    expect(result.allowed).toBe(false);
    expect(result.suspended).toBe(false);
  });

  it('returns allowed:true isAdmin:true for admin email without hitting db', async () => {
    const db = makeDbReturningFirst(null);
    const result = await checkUserAccess(db, 'admin@example.com', ['admin@example.com']);
    expect(result).toEqual({ allowed: true, suspended: false, isAdmin: true });
    // Admins bypass DB — prepare should NOT be called
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it('non-admin email is not granted admin access even if db returns active', async () => {
    const db = makeDbReturningFirst({ status: 'active' });
    const result = await checkUserAccess(db, 'user@example.com', ['admin@example.com']);
    expect(result.isAdmin).toBe(false);
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkTokenBudget
// ---------------------------------------------------------------------------

describe('checkTokenBudget', () => {
  it('returns allowed:true with Infinity budget when deploymentMode is selfHosted', async () => {
    const db = makeDbReturningFirst(null);
    const result = await checkTokenBudget(db, 'user-1', 'selfHosted');
    expect(result).toEqual({ allowed: true, used: 0, budget: Infinity });
  });

  it('does not call db when deploymentMode is selfHosted', async () => {
    const db = makeDbReturningFirst(null);
    await checkTokenBudget(db, 'user-1', 'selfHosted');
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it('returns allowed:true when used tokens are below budget in saas mode', async () => {
    // First call: getMonthlyTokenUsage → { used: 100 }
    // Second call: getUserBudget → { monthly_token_budget: 500000 }
    const db = makeDbReturningFirstSequence({ used: 100 }, { monthly_token_budget: 500000 });
    const result = await checkTokenBudget(db, 'user-1', 'saas');
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(100);
    expect(result.budget).toBe(500000);
  });

  it('returns allowed:false when used tokens equal budget in saas mode', async () => {
    const db = makeDbReturningFirstSequence({ used: 500000 }, { monthly_token_budget: 500000 });
    const result = await checkTokenBudget(db, 'user-1', 'saas');
    expect(result.allowed).toBe(false);
  });

  it('returns allowed:false when used tokens exceed budget in saas mode', async () => {
    const db = makeDbReturningFirstSequence({ used: 600000 }, { monthly_token_budget: 500000 });
    const result = await checkTokenBudget(db, 'user-1', 'saas');
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(600000);
  });

  it('uses default budget of 500000 when no budget row is found', async () => {
    // getUserBudget returns null → defaults to 500000
    const db = makeDbReturningFirstSequence({ used: 100 }, null);
    const result = await checkTokenBudget(db, 'user-1', 'saas');
    expect(result.budget).toBe(500000);
    expect(result.allowed).toBe(true);
  });
});
