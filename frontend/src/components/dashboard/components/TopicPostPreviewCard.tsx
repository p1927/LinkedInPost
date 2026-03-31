import { CalendarClock } from 'lucide-react';
import type { ChannelId } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import { LinkedInPostPreview } from '@/components/LinkedInPostPreview';
import { parseRowImageUrls } from '@/services/selectedImageUrls';
import { topicNeedsFullTooltip, truncateTopicForUi } from '@/lib/topicDisplay';
import { getNormalizedRowStatus } from '@/components/dashboard/utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export function TopicPostPreviewCard({
  row,
  previewChannel,
  previewAuthorName,
  compact = false,
  onOpenEditor,
}: {
  row: SheetRow;
  previewChannel: ChannelId;
  previewAuthorName?: string;
  compact?: boolean;
  onOpenEditor?: () => void;
}) {
  const previewUrls = parseRowImageUrls(row);
  const body = (row.selectedText || row.variant1 || '').trim();
  const normalizedStatus = getNormalizedRowStatus(row.status);
  const isPublished = normalizedStatus === 'published';
  const isApproved = normalizedStatus === 'approved';
  const topicTitle = truncateTopicForUi(row.topic || '');
  const topicTooltip = topicNeedsFullTooltip(row.topic || '') ? (row.topic || '').trim() : undefined;
  const statusLabel = isPublished ? 'Published' : isApproved ? 'Approved' : row.status || 'Pending';

  if (!body && normalizedStatus === 'pending') {
    return (
      <div className="rounded-xl border border-violet-200/40 bg-white/50 px-4 py-5 text-sm text-muted">
        <p className="font-medium text-ink">No draft yet</p>
        <p className="mt-2 leading-relaxed">Generate a draft from the queue, then you will see a preview here.</p>
      </div>
    );
  }

  if (!body && normalizedStatus === 'drafted' && onOpenEditor) {
    return (
      <div className="rounded-xl border border-violet-200/40 bg-white/50 px-4 py-5 text-sm text-muted">
        <p className="font-medium text-ink">Draft in editor</p>
        <p className="mt-2 leading-relaxed">Open the editor to write or pick variants — preview will show the selected text here.</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onOpenEditor}>
          Open editor
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <div>
        <h3 className="truncate font-heading text-sm font-semibold text-ink" title={topicTooltip}>
          {topicTitle}
        </h3>
        <p className="mt-1 text-xs text-muted">Status: {statusLabel}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/50 bg-white/40 shadow-sm">
        <LinkedInPostPreview
          optionNumber={1}
          text={row.selectedText || row.variant1}
          imageUrl={previewUrls[0]}
          imageUrls={previewUrls.length > 1 ? previewUrls : undefined}
          previewChannel={previewChannel}
          gmailTo={row.emailTo}
          gmailSubject={row.emailSubject}
          selected={true}
          expanded={true}
          onSelect={() => undefined}
          onToggleExpanded={() => undefined}
          mode="hero"
          layout={compact ? 'sidebar' : 'default'}
          previewAuthorName={previewAuthorName}
        />
      </div>

      {(isApproved || isPublished) && (
        <div className="rounded-xl border border-violet-200/35 bg-white/35 px-3 py-3 text-xs text-ink">
          <div className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <p className="leading-relaxed text-muted">
              {row.postTime?.trim()
                ? new Date(`${row.postTime.trim().replace(' ', 'T')}:00Z`).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'No scheduled time — publishes immediately when sent.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
