/**
 * Status → palette + display config.
 *
 * Colors preserved from the original Schedule-X build so the rest of the
 * app (legend in CampaignPage, status chips elsewhere) stays consistent.
 *
 * `dot`        — used as the 2px left stripe on event pills and the dot
 *                in the legend.
 * `container`  — used as the soft fill on event pills.
 * `onContainer`— text color on container.
 */

export type StatusKey = 'pending' | 'drafted' | 'approved' | 'published' | 'blocked';

export interface StatusStyle {
  key: StatusKey;
  label: string;
  dot: string;
  container: string;
  onContainer: string;
}

export const STATUS_STYLES: Record<StatusKey, StatusStyle> = {
  pending:   { key: 'pending',   label: 'Pending',   dot: '#6366F1', container: '#EEF2FF', onContainer: '#3730A3' },
  drafted:   { key: 'drafted',   label: 'Drafted',   dot: '#F97316', container: '#FFF7ED', onContainer: '#9A3412' },
  approved:  { key: 'approved',  label: 'Approved',  dot: '#22C55E', container: '#F0FDF4', onContainer: '#14532D' },
  published: { key: 'published', label: 'Published', dot: '#94A3B8', container: '#F8FAFC', onContainer: '#334155' },
  blocked:   { key: 'blocked',   label: 'Blocked',   dot: '#EF4444', container: '#FEF2F2', onContainer: '#7F1D1D' },
};

export function normalizeStatus(raw?: string): StatusKey {
  const k = (raw ?? '').toLowerCase();
  if (k === 'published' || k === 'approved' || k === 'drafted' || k === 'pending' || k === 'blocked') {
    return k;
  }
  return 'pending';
}

export function statusStyle(raw?: string): StatusStyle {
  return STATUS_STYLES[normalizeStatus(raw)];
}

/**
 * Back-compat: callers historically used `STATUS_CALENDARS` for legend rendering.
 * Re-exported for any external consumer that imported it.
 */
export const STATUS_CALENDARS = STATUS_STYLES;

/** Back-compat: the Schedule-X version exposed this helper. */
export function statusToCalendarId(status?: string): StatusKey {
  return normalizeStatus(status);
}
