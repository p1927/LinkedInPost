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
    default: return 'pending';
  }
}

/** Colors aligned with the app's glass/ink palette. */
export const STATUS_CALENDARS: Record<string, CalendarColorConfig> = {
  pending: {
    colorName: 'pending',
    lightColors: { main: '#7c3aed', container: '#ede9fe', onContainer: '#4c1d95' },
  },
  drafted: {
    colorName: 'drafted',
    lightColors: { main: '#2563eb', container: '#dbeafe', onContainer: '#1e3a8a' },
  },
  approved: {
    colorName: 'approved',
    lightColors: { main: '#059669', container: '#d1fae5', onContainer: '#064e3b' },
  },
  published: {
    colorName: 'published',
    lightColors: { main: '#6b7280', container: '#f3f4f6', onContainer: '#374151' },
  },
};
