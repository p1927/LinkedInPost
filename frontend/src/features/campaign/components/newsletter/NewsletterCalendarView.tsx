import { useMemo } from 'react';
import { ContentScheduleCalendar } from '@/features/content-schedule-calendar';
import type { CalendarTopic } from '@/features/content-schedule-calendar';
import type { NewsletterRecord, NewsletterIssueRow } from '../../schema/newsletterTypes';
import type { SheetRow } from '@/services/sheets';

export interface CalendarIssueEvent {
  date: string; // YYYY-MM-DD
  newsletterIndex: number;
  newsletterName: string;
  issue: NewsletterIssueRow;
}

interface Props {
  newsletters: NewsletterRecord[];
  issueEvents: CalendarIssueEvent[];
  topicRows: SheetRow[];
  onIssueClick: (issue: NewsletterIssueRow) => void;
}

const ISSUE_STATUS_MAP: Record<string, string> = {
  draft: 'pending',
  pending_approval: 'drafted',
  approved: 'approved',
  sent: 'published',
  failed: 'failed',
};

export default function NewsletterCalendarView({
  newsletters: _newsletters,
  issueEvents,
  topicRows,
  onIssueClick,
}: Props) {
  const topics = useMemo<CalendarTopic[]>(() => {
    const issueTops: CalendarTopic[] = issueEvents
      .filter(e => Boolean(e.date))
      .map(e => ({
        id: e.issue.id,
        title: e.issue.subject || e.newsletterName || 'Newsletter Issue',
        date: e.date,
        startTime: e.issue.scheduled_for
          ? new Date(e.issue.scheduled_for).toTimeString().slice(0, 5)
          : undefined,
        status: ISSUE_STATUS_MAP[e.issue.status] ?? 'pending',
        channels: ['email'],
        payload: { __type: 'newsletter_issue', issue: e.issue },
      }));

    const topicTops: CalendarTopic[] = topicRows
      .filter(r => Boolean(r.postTime))
      .map(r => ({
        id: r.topicId || r.topic,
        title: r.topic,
        date: new Date(r.postTime).toISOString().slice(0, 10),
        startTime: new Date(r.postTime).toTimeString().slice(0, 5),
        status: (r.status as string) ?? 'pending',
        channels: r.topicDeliveryChannel ? [r.topicDeliveryChannel] : [],
        payload: { __type: 'topic', row: r },
      }));

    return [...issueTops, ...topicTops];
  }, [issueEvents, topicRows]);

  return (
    <ContentScheduleCalendar
      topics={topics}
      canDrag={false}
      disableInternalDrawer
      initialView="month-grid"
      onTopicActivate={(topic) => {
        if (topic.payload?.__type === 'newsletter_issue') {
          onIssueClick(topic.payload.issue as NewsletterIssueRow);
        }
      }}
    />
  );
}
