import { useState } from 'react';
import { CalendarClock, PencilLine, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChannelId } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import type { BackendApi } from '@/services/backendApi';
import { ChannelPostPreview } from '@/components/channel-previews/ChannelPostPreview';
import { getTopicPreviewImageUrls } from '@/services/selectedImageUrls';
import { topicNeedsFullTooltip, truncateTopicForUi } from '@/lib/topicDisplay';
import { getNormalizedRowStatus } from '@/components/dashboard/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { WORKSPACE_PATHS, topicVariantsPathForRow } from '@/features/topic-navigation/utils/workspaceRoutes';

function firstNonEmptyDraftText(row: SheetRow): string {
  for (const p of [row.selectedText, row.variant1, row.variant2, row.variant3, row.variant4]) {
    const t = String(p ?? '').trim();
    if (t) return t;
  }
  return '';
}

export function TopicPostPreviewCard({
  row,
  previewChannel,
  previewAuthorName,
  compact = false,
  noVariantHeader = false,
  onOpenEditor,
  idToken,
  api,
}: {
  row: SheetRow;
  previewChannel: ChannelId;
  previewAuthorName?: string;
  compact?: boolean;
  noVariantHeader?: boolean;
  onOpenEditor?: () => void;
  idToken?: string;
  api?: BackendApi;
}) {
  const navigate = useNavigate();
  const [sendingToGeneration, setSendingToGeneration] = useState(false);
  const [generationError, setGenerationError] = useState('');

  const previewUrls = getTopicPreviewImageUrls(row);
  const body = firstNonEmptyDraftText(row);
  const normalizedStatus = getNormalizedRowStatus(row.status);
  const isDraft = normalizedStatus === 'draft';
  const isPublished = normalizedStatus === 'published';
  const isApproved = normalizedStatus === 'approved';
  const topicTitle = truncateTopicForUi(row.topic || '');
  const topicTooltip = topicNeedsFullTooltip(row.topic || '') ? (row.topic || '').trim() : undefined;
  const statusLabel = isPublished ? 'Published' : isApproved ? 'Approved' : row.status || 'Pending';

  const handleSendToGeneration = async () => {
    if (!idToken || !api || !row.topicId) return;
    setSendingToGeneration(true);
    setGenerationError('');
    try {
      const response = await api.sendTopicToGeneration(idToken, String(row.topicId).trim());
      if (response.ok) {
        navigate(topicVariantsPathForRow(row));
      } else {
        const msg = await response.text().catch(() => 'Failed to start generation.');
        setGenerationError(msg || 'Failed to start generation.');
      }
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to start generation.');
    } finally {
      setSendingToGeneration(false);
    }
  };

  if (!body && normalizedStatus === 'pending') {
    return (
      <div className="rounded-xl border border-violet-200/40 bg-white/50 px-4 py-5 text-sm text-muted">
        <p className="font-medium text-ink">No draft yet</p>
        <p className="mt-2 leading-relaxed">Generate a draft from the queue, then you will see a preview here.</p>
      </div>
    );
  }

  if (!body && isDraft) {
    return (
      <div className="rounded-xl border border-violet-200/40 bg-white/50 px-4 py-5 text-sm text-muted">
        <div className="mb-3 flex items-center gap-2">
          <p className="font-medium text-ink">Saved draft</p>
          <Badge variant="neutral" size="xs">
            <PencilLine className="h-3 w-3" aria-hidden />
            Draft
          </Badge>
        </div>
        <p className="leading-relaxed">This topic is saved as a draft. Send it to generation or continue editing.</p>
        {generationError && (
          <p className="mt-2 text-xs text-red-500">{generationError}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {idToken && api && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={sendingToGeneration}
              onClick={handleSendToGeneration}
            >
              {sendingToGeneration ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Starting…
                </>
              ) : (
                'Send to Generation'
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`${WORKSPACE_PATHS.addTopic}?topicId=${encodeURIComponent(row.topicId ?? '')}`)}
          >
            Continue editing
          </Button>
        </div>
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
      {!compact && !noVariantHeader && (
        <div>
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading text-sm font-semibold text-ink" title={topicTooltip}>
              {topicTitle}
            </h3>
            {isDraft && (
              <Badge variant="neutral" size="xs">
                <PencilLine className="h-3 w-3" aria-hidden />
                Draft
              </Badge>
            )}
          </div>
          {!isDraft && <p className="mt-1 text-xs text-muted">Status: {statusLabel}</p>}
        </div>
      )}

      <div className="flex justify-center overflow-hidden rounded-xl border border-white/50 bg-white/40 shadow-sm">
        <ChannelPostPreview
          optionNumber={1}
          text={firstNonEmptyDraftText(row)}
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
          layout={noVariantHeader ? 'sidebar' : compact ? 'sidebar' : 'default'}
          previewAuthorName={previewAuthorName}
        />
      </div>

      {isDraft && (
        <div className="rounded-xl border border-violet-200/35 bg-white/35 px-3 py-3">
          {generationError && (
            <p className="mb-2 text-xs text-red-500">{generationError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {idToken && api && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={sendingToGeneration}
                onClick={handleSendToGeneration}
              >
                {sendingToGeneration ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Starting…
                  </>
                ) : (
                  'Send to Generation'
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${WORKSPACE_PATHS.addTopic}?topicId=${encodeURIComponent(row.topicId ?? '')}`)}
            >
              Continue editing
            </Button>
          </div>
        </div>
      )}

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
