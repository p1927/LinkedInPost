import { useCallback, useState } from 'react';
import type { BackendApi, PublishContentResult } from '@/services/backendApi';
import type { SheetRow } from '@/services/sheets';
import type { PendingScheduledPublish } from './types';

export function usePendingScheduledPublish({
  idToken,
  api,
  onError,
}: {
  idToken: string;
  api: BackendApi;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState<PendingScheduledPublish | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const applyQueuedPublishResult = useCallback((result: PublishContentResult, row: SheetRow) => {
    if (result.deliveryMode !== 'queued' || !result.scheduledTime?.trim()) {
      return;
    }
    setPending({
      topicId: row.topicId,
      topic: row.topic,
      date: row.date,
      channel: result.channel,
      scheduledTime: result.scheduledTime.trim(),
    });
  }, []);

  const clearPendingIfMatchesRow = useCallback((row: SheetRow) => {
    setPending((p) => {
      if (!p) return null;
      if (p.topicId.trim() === row.topicId.trim()) {
        return null;
      }
      return p;
    });
  }, []);

  const cancelPendingScheduledPublish = useCallback(async () => {
    if (!pending) return;
    setCancelBusy(true);
    try {
      await api.cancelScheduledPublish(idToken, {
        topicId: pending.topicId,
        channel: pending.channel,
        scheduledTime: pending.scheduledTime,
      });
      setPending(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel scheduled publish.';
      onError(message);
    } finally {
      setCancelBusy(false);
    }
  }, [pending, api, idToken, onError]);

  return {
    pendingScheduledPublish: pending,
    scheduledPublishCancelBusy: cancelBusy,
    applyQueuedPublishResult,
    cancelPendingScheduledPublish,
    clearPendingIfMatchesRow,
  };
}
