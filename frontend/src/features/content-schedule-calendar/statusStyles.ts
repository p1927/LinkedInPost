/** Maps lifecycle status → Schedule-X calendar color config + CSS class suffix. */

export type CalendarColorConfig = {
  colorName: string;
  lightColors: { main: string; container: string; onContainer: string };
};

/** calendarId values assigned to events based on their status. */
export function statusToCalendarId(status?: string): string {
  switch ((status ?? '').toLowerCase()) {
    case 'published': return 'published';
    case 'approved': return 'approved';
    case 'drafted': return 'drafted';
    case 'pending': return 'pending';
    case 'blocked': return 'blocked';
    default: return 'pending';
  }
}

/** Colors aligned with the app's indigo/emerald palette. */
export const STATUS_CALENDARS: Record<string, CalendarColorConfig> = {
  pending: {
    colorName: 'pending',
    lightColors: { main: '#6366F1', container: '#EEF2FF', onContainer: '#3730A3' },
  },
  drafted: {
    colorName: 'drafted',
    lightColors: { main: '#F97316', container: '#FFF7ED', onContainer: '#9A3412' },
  },
  approved: {
    colorName: 'approved',
    lightColors: { main: '#22C55E', container: '#F0FDF4', onContainer: '#14532D' },
  },
  published: {
    colorName: 'published',
    lightColors: { main: '#94A3B8', container: '#F8FAFC', onContainer: '#334155' },
  },
  blocked: {
    colorName: 'blocked',
    lightColors: { main: '#EF4444', container: '#FEF2F2', onContainer: '#7F1D1D' },
  },
};
