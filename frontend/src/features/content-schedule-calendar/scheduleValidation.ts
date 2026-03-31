/**
 * Whether a local calendar date (and optional HH:MM) is strictly before "now" in the browser local timezone.
 * Used to block scheduling in the past (including today's date with an earlier time).
 */
export function isLocalScheduleInPast(dateIso: string, timeHm: string | undefined): boolean {
  const d = dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = (timeHm ?? '').trim();
  let h = 0;
  let m = 0;
  if (t) {
    const match = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;
    h = parseInt(match[1]!, 10);
    m = parseInt(match[2]!, 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return false;
  }
  const [Y, M, D] = d.split('-').map((x) => parseInt(x, 10));
  const candidate = new Date(Y!, M! - 1, D!, h, m, 0, 0);
  return candidate.getTime() < Date.now();
}
