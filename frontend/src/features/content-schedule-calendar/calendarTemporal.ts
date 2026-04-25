/** Today's date in the runtime local timezone as `YYYY-MM-DD`. */
export function localDateIsoToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Add `days` to an ISO date string, returning a new ISO date string. */
export function isoPlusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Monday of the ISO-week that contains the given date. */
export function mondayOfWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay(); // 0=Sun
  const offset = (dow + 6) % 7; // Mon=0
  return isoPlusDays(iso, -offset);
}

/** First-of-month for the ISO date. */
export function firstOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

/** Last-of-month for the ISO date. */
export function lastOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  const dt = new Date(y, m, 0); // day 0 of next month
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export interface WeekDay {
  iso: string;
  day: number;
  dow: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  weekend: boolean;
  today: boolean;
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Returns 7 days starting Monday for the week containing `anchorIso`. */
export function weekDaysFor(anchorIso: string, todayIso: string = localDateIsoToday()): WeekDay[] {
  const monday = mondayOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i): WeekDay => {
    const iso = isoPlusDays(monday, i);
    const d = Number(iso.split('-')[2]);
    return {
      iso,
      day: d,
      dow: DOW_LABELS[i]!,
      weekend: i >= 5,
      today: iso === todayIso,
    };
  });
}

export interface MonthCell {
  iso: string;
  day: number;
  outside: boolean;
  weekend: boolean;
  today: boolean;
  /** Day-of-week column: 0=Mon..6=Sun. */
  dow: number;
  /** Row index in the displayed grid (0..5). */
  row: number;
}

/**
 * Returns Mon-first month grid (5 or 6 rows × 7 cols). Includes leading days
 * from the previous month and trailing days from the next month so the grid
 * is always rectangular.
 */
export function monthGridFor(anchorIso: string, todayIso: string = localDateIsoToday()): MonthCell[] {
  const first = firstOfMonth(anchorIso);
  const [y, m] = anchorIso.split('-').map(Number) as [number, number];
  const startMon = mondayOfWeek(first);
  // Always 6 rows so dialog/popups don't jump as months change shape.
  const totalDays = 42;
  const cells: MonthCell[] = [];
  for (let i = 0; i < totalDays; i++) {
    const iso = isoPlusDays(startMon, i);
    const [cy, cm, cd] = iso.split('-').map(Number) as [number, number, number];
    const dow = i % 7;
    const row = Math.floor(i / 7);
    cells.push({
      iso,
      day: cd,
      outside: !(cy === y && cm === m),
      weekend: dow >= 5,
      today: iso === todayIso,
      dow,
      row,
    });
    // Stop early if we've completed 5 rows AND the last row is fully outside the month.
    if (i === 34 && cells.slice(28, 35).every((c) => c.outside) === false) {
      // keep going to row 6
    }
  }
  // Trim trailing all-outside row(s) so we render 5 or 6 rows depending on month length.
  while (cells.length > 28) {
    const lastRowStart = cells.length - 7;
    const lastRow = cells.slice(lastRowStart);
    if (lastRow.every((c) => c.outside)) {
      cells.length = lastRowStart;
    } else {
      break;
    }
  }
  return cells;
}

/** Compact "Apr 21 — Apr 27, 2026" style label for a 7-day week. */
export function weekLabel(week: WeekDay[]): string {
  if (week.length === 0) return '';
  const first = week[0]!;
  const last = week[6]!;
  const [fy, fm, fd] = first.iso.split('-').map(Number) as [number, number, number];
  const [ly, lm, ld] = last.iso.split('-').map(Number) as [number, number, number];
  const fmt = (m: number) => MONTH_NAMES_SHORT[m - 1]!;
  if (fy === ly && fm === lm) {
    return `${fmt(fm)} ${fd} – ${ld}, ${fy}`;
  }
  if (fy === ly) {
    return `${fmt(fm)} ${fd} – ${fmt(lm)} ${ld}, ${fy}`;
  }
  return `${fmt(fm)} ${fd}, ${fy} – ${fmt(lm)} ${ld}, ${ly}`;
}

/** Long "April 2026" month label. */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number) as [number, number];
  return `${MONTH_NAMES[m - 1]!} ${y}`;
}

/** "Tuesday, Apr 22, 2026". */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** ISO week number (1..53) for the Monday-of-week containing `iso`. */
export function isoWeekNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (dt.getUTCDay() + 6) % 7; // Mon=0
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3); // Thu of this week
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((dt.getTime() - firstThu.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** Parse "HH:MM" → minutes-since-midnight, or null if invalid. */
export function parseTimeHm(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Format minutes-since-midnight → "HH:MM". */
export function formatTimeHm(minutes: number): string {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Snap a minute count to the nearest `step` minutes. */
export function snapTo(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}
