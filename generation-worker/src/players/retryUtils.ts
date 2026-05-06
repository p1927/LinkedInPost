/**
 * Retry utilities for LLM calls and external API calls.
 * Provides exponential backoff with jitter and circuit breaker pattern.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryIf: (err: unknown) => boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailure: number | null;
  state: 'closed' | 'open' | 'half-open';
}

export interface RetryResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
  attempts: number;
  circuitState?: CircuitBreakerState;
}

const DEFAULT_RETRY_IF = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const m = err.message;
  return /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable|empty generation|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(m);
};

function jitter(delay: number): number {
  return Math.floor(delay * (0.5 + Math.random()));
}

function exponentialDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  return Math.min(maxDelayMs, jitter(baseDelayMs * Math.pow(2, attempt)));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<T> {
  const options: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 8000,
    retryIf: DEFAULT_RETRY_IF,
    ...opts,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === options.maxAttempts - 1) break;
      if (!options.retryIf(err)) throw err;
      const delay = exponentialDelay(attempt, options.baseDelayMs, options.maxDelayMs);
      console.warn(`[Retry] attempt ${attempt + 1} failed, retrying in ${delay}ms: ${String(err).slice(0, 100)}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export function createCircuitBreaker(failureThreshold = 3, resetTimeoutMs = 30000): {
  recordFailure: () => CircuitBreakerState;
  recordSuccess: () => CircuitBreakerState;
  getState: () => CircuitBreakerState;
  execute<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T>;
} {
  let failures = 0;
  let lastFailure: number | null = null;
  let state: 'closed' | 'open' | 'half-open' = 'closed';

  function getState(): CircuitBreakerState {
    if (state === 'open' && lastFailure !== null && Date.now() - lastFailure > resetTimeoutMs) {
      state = 'half-open';
    }
    return { failures, lastFailure, state };
  }

  function recordFailure(): CircuitBreakerState {
    failures++;
    lastFailure = Date.now();
    if (failures >= failureThreshold) state = 'open';
    return getState();
  }

  function recordSuccess(): CircuitBreakerState {
    failures = 0;
    state = 'closed';
    return getState();
  }

  async function execute<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    const current = getState();
    if (current.state === 'open') {
      console.warn('[CircuitBreaker] open — calling fallback');
      return fallback();
    }
    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (err) {
      recordFailure();
      if (state === 'open') return fallback();
      throw err;
    }
  }

  return { recordFailure, recordSuccess, getState, execute };
}

export async function retryWithCircuit<T>(
  fn: () => Promise<T>,
  fallback: () => Promise<T>,
  opts?: Partial<RetryOptions>,
): Promise<RetryResult<T>> {
  const breaker = createCircuitBreaker();
  let attempts = 0;

  try {
    const value = await withRetry(async () => {
      attempts++;
      return breaker.execute(fn, fallback);
    }, opts);
    return { ok: true, value, attempts, circuitState: breaker.getState() };
  } catch (err) {
    return {
      ok: false,
      error: String(err),
      attempts,
      circuitState: breaker.getState()
    };
  }
}