const ELLIPSIS = '…';

/** Short topic labels for headers, modals, and breadcrumbs (total length including ellipsis). */
export const TOPIC_UI_TITLE_MAX = 42;

function topicFirstLine(topic: string): string {
  return (topic || '').trim().split(/\r?\n/)[0]?.trim().replace(/\s+/g, ' ') ?? '';
}

/**
 * Single-line topic for dense UI: first line only, then a short cap with ellipsis.
 */
export function truncateTopicForUi(topic: string, maxTotal = TOPIC_UI_TITLE_MAX): string {
  const firstLine = topicFirstLine(topic);
  if (!firstLine) return '';
  if (firstLine.length <= maxTotal) return firstLine;
  const maxBody = maxTotal - ELLIPSIS.length;
  const slice = firstLine.slice(0, Math.max(1, maxBody)).trimEnd();
  return `${slice || firstLine.slice(0, maxBody)}${ELLIPSIS}`;
}

export function topicNeedsTruncation(topic: string, maxTotal = TOPIC_UI_TITLE_MAX): boolean {
  const raw = (topic || '').trim();
  if (!raw) return false;
  if (raw.split(/\r?\n/).filter((l) => l.trim()).length > 1) return true;
  return topicFirstLine(raw).length > maxTotal;
}

/** Use native tooltip when the full topic is not fully shown in the title. */
export function topicNeedsFullTooltip(topic: string, maxTotal = TOPIC_UI_TITLE_MAX): boolean {
  return topicNeedsTruncation(topic, maxTotal);
}
