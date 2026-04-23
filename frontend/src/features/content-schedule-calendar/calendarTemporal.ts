/** Today's date in the runtime local timezone as `YYYY-MM-DD`. */
export function localDateIsoToday(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Plain calendar date for an event start (ZonedDateTime or PlainDate). */
export function eventStartToPlainDate(
  start: Temporal.ZonedDateTime | Temporal.PlainDate | unknown,
): Temporal.PlainDate | null {
  if (!start || typeof start !== 'object') return null;
  if ('toPlainDate' in start && typeof (start as Temporal.ZonedDateTime).toPlainDate === 'function') {
    return (start as Temporal.ZonedDateTime).toPlainDate();
  }
  const s = start as Temporal.PlainDate;
  if (
    'year' in s &&
    'month' in s &&
    'day' in s &&
    typeof (s as { year: unknown }).year === 'number'
  ) {
    return s;
  }
  return null;
}
