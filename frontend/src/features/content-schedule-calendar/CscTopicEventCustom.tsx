import type { CalendarEvent } from '@schedule-x/calendar';
import { cn } from '@/lib/cn';

const CHANNEL_COLOR_MAP: Record<string, string> = {
  linkedin: '#0A66C2',
  instagram: '#E1306C',
  telegram: '#2CA5E0',
  whatsapp: '#25D366',
  gmail: '#EA4335',
};

const KNOWN_CALENDAR_COLORS = new Set([
  'pending',
  'drafted',
  'approved',
  'published',
  'blocked',
]);

function calendarColorName(calendarId?: string): string {
  const id = (calendarId ?? 'pending').toLowerCase();
  return KNOWN_CALENDAR_COLORS.has(id) ? id : 'pending';
}

function formatZonedTime24(zdt: Temporal.ZonedDateTime): string {
  const t = zdt.toPlainTime();
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

function formatTimeRange24(
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
): string {
  const a = formatZonedTime24(start);
  const b = formatZonedTime24(end);
  if (a === b) return a;
  return `${a}–${b}`;
}

type InnerProps = {
  calendarEvent: CalendarEvent;
  variant: 'month' | 'time' | 'date';
};

function CscTopicEventInner({ calendarEvent, variant }: InnerProps) {
  const color = calendarColorName(calendarEvent.calendarId);
  const title = (calendarEvent.title ?? '').trim() || '(no title)';
  const channels = (calendarEvent as unknown as { channels?: string[] }).channels;
  const primaryChannel = channels?.[0]?.toLowerCase();

  let timeLabel: string | null = null;
  if (
    calendarEvent.start instanceof Temporal.ZonedDateTime &&
    calendarEvent.end instanceof Temporal.ZonedDateTime
  ) {
    if (variant === 'time') {
      timeLabel = formatTimeRange24(calendarEvent.start, calendarEvent.end);
    } else if (variant === 'date') {
      timeLabel = formatZonedTime24(calendarEvent.start);
    }
  }

  return (
    <div
      className={cn(
        'csc-topic-event-root box-border flex h-full min-h-0 min-w-0 flex-1 items-center gap-1 rounded-[inherit] border-l-[3px] px-1 py-px',
        variant === 'time' && 'py-0.5',
      )}
      style={{
        borderLeftColor: `var(--sx-color-${color})`,
        backgroundColor: `var(--sx-color-${color}-container)`,
        color: `var(--sx-color-on-${color}-container)`,
      }}
    >
      {timeLabel ? (
        <span
          className={cn(
            'shrink-0 font-mono text-[0.65rem] font-semibold tabular-nums leading-none opacity-75',
            variant === 'time' && 'text-[0.7rem]',
          )}
        >
          {timeLabel}
        </span>
      ) : null}
      {variant === 'month' && primaryChannel && CHANNEL_COLOR_MAP[primaryChannel] ? (
        <span
          className="shrink-0 inline-block rounded-full mr-1"
          style={{ width: 7, height: 7, backgroundColor: CHANNEL_COLOR_MAP[primaryChannel], display: 'inline-block', verticalAlign: 'middle' }}
        />
      ) : null}
      {(variant === 'time' || variant === 'date') && primaryChannel && CHANNEL_COLOR_MAP[primaryChannel] ? (
        <span
          className="shrink-0 rounded px-0.5 text-[0.55rem] font-bold leading-none text-white"
          style={{ backgroundColor: CHANNEL_COLOR_MAP[primaryChannel] }}
        >
          {primaryChannel.slice(0, 2).toUpperCase()}
        </span>
      ) : null}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-left text-[0.65rem] font-semibold leading-tight',
          variant === 'time' && 'text-[0.7rem]',
        )}
        title={title}
      >
        {title}
      </span>
    </div>
  );
}

/** Schedule-X `monthGridEvent` custom component. */
export function CscMonthGridTopicEvent({
  calendarEvent,
}: {
  calendarEvent: CalendarEvent;
  hasStartDate?: boolean;
}) {
  return <CscTopicEventInner calendarEvent={calendarEvent} variant="month" />;
}

/** Schedule-X `timeGridEvent` custom component. */
export function CscTimeGridTopicEvent({ calendarEvent }: { calendarEvent: CalendarEvent }) {
  return <CscTopicEventInner calendarEvent={calendarEvent} variant="time" />;
}

/** Schedule-X `dateGridEvent` custom component. */
export function CscDateGridTopicEvent({ calendarEvent }: { calendarEvent: CalendarEvent }) {
  return <CscTopicEventInner calendarEvent={calendarEvent} variant="date" />;
}
