// worker/src/auth.ts
import { getUserStatus, getMonthlyTokenUsage, getUserBudget } from './db/users';

/**
 * Check if a user is allowed to access the app based on their DB status.
 * Admins always pass regardless of DB status (they bootstrapped the system).
 */
export async function checkUserAccess(
  db: D1Database,
  email: string,
  adminEmails: string[],
): Promise<{ allowed: boolean; suspended: boolean; isAdmin: boolean }> {
  const isAdmin = adminEmails.includes(email);
  if (isAdmin) {
    return { allowed: true, suspended: false, isAdmin: true };
  }

  const status = await getUserStatus(db, email);

  if (status === null) {
    // Unknown user — not yet in the system
    return { allowed: false, suspended: false, isAdmin: false };
  }
  if (status === 'suspended') {
    return { allowed: false, suspended: true, isAdmin: false };
  }
  return { allowed: status === 'active', suspended: false, isAdmin: false };
}

/**
 * Check if the user has remaining token budget for this month.
 * In selfHosted mode, budgets are disabled and all requests are allowed.
 */
export async function checkTokenBudget(db: D1Database, userId: string, deploymentMode: string): Promise<{ allowed: boolean; used: number; budget: number }> {
  if (deploymentMode !== 'saas') {
    return { allowed: true, used: 0, budget: Infinity };
  }
  const [used, budget] = await Promise.all([
    getMonthlyTokenUsage(db, userId),
    getUserBudget(db, userId),
  ]);
  return { allowed: used < budget, used, budget };
}
