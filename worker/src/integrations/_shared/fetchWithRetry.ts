/**
 * `fetch` with retries on transient failures (network errors, 429, 5xx).
 *
 * Used by channel publish handlers (LinkedIn, Instagram, Gmail, WhatsApp) so a
 * single rate-limit blip or upstream 503 does not surface as a red toast in
 * the dashboard. Body is preserved on the final response — callers parse it
 * exactly like a regular `fetch`.
 *
 * Honours `Retry-After` (seconds or HTTP date). Backoff otherwise: 1s, 2s, 4s,
 * capped.
 */

interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  maxAttempts?: number;
  /** Base delay between retries in ms. Default 1000. */
  baseDelayMs?: number;
  /** Cap on backoff. Default 8000. */
  maxDelayMs?: number;
  /** Predicate over status code. Default: 429 || >=500. */
  shouldRetry?: (status: number) => boolean;
}

const DEFAULT_SHOULD_RETRY = (status: number): boolean =>
  status === 429 || status >= 500;

function parseRetryAfter(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds) && seconds >= 0 && String(seconds) === trimmed) {
    return seconds * 1000;
  }
  const date = Date.parse(trimmed);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, date - Date.now());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const max = options.maxAttempts ?? 3;
  const base = options.baseDelayMs ?? 1000;
  const cap = options.maxDelayMs ?? 8000;
  const shouldRetry = options.shouldRetry ?? DEFAULT_SHOULD_RETRY;

  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const response = await fetch(input, init);
      if (response.ok || !shouldRetry(response.status) || attempt >= max) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
      try {
        await response.body?.cancel();
      } catch {
        /* drop body to free socket */
      }
      const backoffMs = Math.min(cap, base * Math.pow(2, attempt - 1));
      await sleep(retryAfterMs ?? backoffMs);
    } catch (err) {
      if (attempt >= max) {
        throw err;
      }
      const backoffMs = Math.min(cap, base * Math.pow(2, attempt - 1));
      await sleep(backoffMs);
    }
  }
}
