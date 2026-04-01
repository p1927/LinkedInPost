import type { CalendarEvent } from '@schedule-x/calendar';
import { Camera, Check, Mail, MessageCircle, Send, Share2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';

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

function parseChannelIdsFromDescription(description?: string): ChannelId[] {
  if (!description?.trim()) return [];
  const seen = new Set<ChannelId>();
  for (const part of description.split(',')) {
    const raw = part.trim().toLowerCase();
    if (!raw) continue;
    const byValue = CHANNEL_OPTIONS.find((o) => o.value === raw);
    if (byValue) {
      seen.add(byValue.value);
      continue;
    }
    const byLabel = CHANNEL_OPTIONS.find((o) => o.label.toLowerCase() === raw);
    if (byLabel) seen.add(byLabel.value);
  }
  return [...seen];
}

/** Lucide build here has no brand icons; use small semantic stand-ins. */
const CHANNEL_ICONS: Record<ChannelId, LucideIcon> = {
  linkedin: Share2,
  instagram: Camera,
  telegram: Send,
  whatsapp: MessageCircle,
  gmail: Mail,
};

type InnerProps = {
  calendarEvent: CalendarEvent;
  variant: 'month' | 'time' | 'date';
};

function CscTopicEventInner({ calendarEvent, variant }: InnerProps) {
  const color = calendarColorName(calendarEvent.calendarId);
  const published = color === 'published';
  const title = (calendarEvent.title ?? '').trim() || '(no title)';

  let timeLabel: string | null = null;
  if (
    calendarEvent.start instanceof Temporal.ZonedDateTime &&
    calendarEvent.end instanceof Temporal.ZonedDateTime
  ) {
    if (variant === 'time') {
      timeLabel = formatTimeRange24(calendarEvent.start, calendarEvent.end);
    } else {
      timeLabel = formatZonedTime24(calendarEvent.start);
    }
  }

  const channelIds = parseChannelIdsFromDescription(calendarEvent.description);
  const channelIdsShown = channelIds.slice(0, 3);

  return (
    <div
      className={cn(
        'csc-topic-event-root box-border flex h-full min-h-0 min-w-0 flex-1 items-center gap-0.5 rounded-[inherit] border-l-[3px] px-1 py-px',
        variant === 'time' && 'py-0.5',
      )}
      style={{
        borderLeftColor: `var(--sx-color-${color})`,
        backgroundColor: `var(--sx-color-${color}-container)`,
        color: `var(--sx-color-on-${color}-container)`,
      }}
    >
      <span
        className="csc-topic-event-status flex h-3 w-3 shrink-0 items-center justify-center"
        aria-hidden
      >
        {published ? (
          <Check className="size-3 text-emerald-600" strokeWidth={2.5} aria-hidden />
        ) : (
          <span className="block size-3" />
        )}
      </span>
      {channelIdsShown.length > 0 ? (
        <span className="flex shrink-0 items-center gap-px">
          {channelIdsShown.map((id) => {
            const Icon = CHANNEL_ICONS[id];
            return (
              <Icon
                key={id}
                className="size-3 opacity-90"
                strokeWidth={2}
                aria-hidden
              />
            );
          })}
        </span>
      ) : null}
      {timeLabel ? (
        <span
          className={cn(
            'shrink-0 font-mono text-[0.65rem] font-semibold tabular-nums leading-none',
            variant === 'time' && 'text-[0.7rem]',
          )}
        >
          {timeLabel}
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
