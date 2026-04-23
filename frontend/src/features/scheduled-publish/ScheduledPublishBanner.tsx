import { Button } from '@/components/ui/button';
import { getChannelLabel } from '@/integrations/channels';
import type { PendingScheduledPublish } from './types';

export function ScheduledPublishBanner({
  pending,
  onCancel,
  cancelBusy,
  onDismiss,
}: {
  pending: PendingScheduledPublish | null;
  onCancel: () => void | Promise<void>;
  cancelBusy: boolean;
  onDismiss?: () => void;
}) {
  if (!pending) {
    return null;
  }

  return (
    <div
      role="status"
      className="rounded-2xl border border-sky-200/90 bg-sky-50/95 p-4 text-sky-950 shadow-sm"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-900/80">Scheduled publish</p>
      <p className="mt-2 text-sm leading-6 text-sky-950">
        <span className="font-medium">Scheduled at</span>{' '}
        <span className="font-mono tabular-nums">{pending.scheduledTime}</span>
        {' · '}
        {getChannelLabel(pending.channel)}
      </p>
      <p className="mt-1 text-xs leading-5 text-sky-900/85">
        The worker will publish at that time unless you cancel below.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-sky-300/90 bg-white/95 text-sky-950 hover:bg-white"
          disabled={cancelBusy}
          onClick={() => void onCancel()}
        >
          {cancelBusy ? 'Cancelling…' : 'Cancel schedule'}
        </Button>
        {onDismiss ? (
          <Button type="button" variant="ghost" size="sm" className="text-sky-900 hover:bg-sky-100/80" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}
