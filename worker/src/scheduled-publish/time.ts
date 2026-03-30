export function parseScheduledTimeToTimestamp(value: string): number | null {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || !Number.isInteger(hour)
    || !Number.isInteger(minute)
    || month < 1
    || month > 12
    || day < 1
    || day > 31
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    return null;
  }

  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

export function buildScheduledPublishTaskName(topicId: string, channel?: string): string {
  const id = topicId.trim();
  const ch = (channel || 'linkedin').trim();
  return `${id}::${ch}`;
}
