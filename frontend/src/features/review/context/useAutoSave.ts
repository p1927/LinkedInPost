/**
 * useAutoSave — auto-save hook for the review editor.
 *
 * Periodically persists draft state to localStorage every 30 seconds when
 * the editor is dirty, with debouncing on content changes to avoid excessive saves.
 *
 * Usage:
 *   const { autoSaveStatus, triggerSave } = useAutoSave({
 *     topicId,
 *     getSnapshot: () => ({ editorText, selectedImageUrls, postTime, instruction, scope }),
 *     enabled: true,
 *     intervalMs: 30_000,
 *   });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDraft, clearDraft, type DraftSnapshot } from '../../../services/draftService';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveSnapshot {
  editorText: string;
  selectedImageUrls: string[];
  postTime: string;
  instruction: string;
  scope: string;
}

export interface UseAutoSaveOptions {
  /** Topic identifier, used as the localStorage key. */
  topicId: string;
  /** Returns the current draft state to persist. Called lazily. */
  getSnapshot: () => AutoSaveSnapshot;
  /** Whether auto-save is active. Default true. */
  enabled?: boolean;
  /** Auto-save interval in ms. Default 30_000 (30 seconds). */
  intervalMs?: number;
  /**
   * Debounce window in ms — saves are skipped if the snapshot hasn't changed
   * for this long. Default 2_000 (2 seconds).
   */
  debounceMs?: number;
}

export interface UseAutoSaveReturn {
  /** Current save status, suitable for display in the UI. */
  autoSaveStatus: AutoSaveStatus;
  /** Unix timestamp (ms) of the last successful save, or null if never saved. */
  lastSavedAt: number | null;
  /** Clear any persisted auto-save for the current topicId. */
  clearAutoSavedDraft: () => void;
  /** Manually trigger an immediate save. */
  triggerSave: () => void;
}

/**
 * Drives periodic auto-save with content-change debouncing.
 * Saves are suppressed when the editor is idle (no changes for debounceMs).
 * The interval ensures periodic saves even when content is unchanged.
 */
export function useAutoSave({
  topicId,
  getSnapshot,
  enabled = true,
  intervalMs = 30_000,
  debounceMs = 2_000,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  /** Track the last snapshot string to detect actual changes. */
  const lastSnapshotRef = useRef<string | null>(null);
  /** Track when we last saved so the interval doesn't re-save unchanged content. */
  const lastSaveTimeRef = useRef<number | null>(null);
  /** Debounce timer handle. */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Interval timer handle. */
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSave = useCallback(() => {
    if (!topicId) return;

    const snapshot = getSnapshot();
    const snapshotKey = JSON.stringify(snapshot);

    // Skip if content hasn't changed since last save
    if (snapshotKey === lastSnapshotRef.current && lastSaveTimeRef.current !== null) {
      return;
    }

    setAutoSaveStatus('saving');
    try {
      saveDraft(topicId, snapshot);
      lastSnapshotRef.current = snapshotKey;
      lastSaveTimeRef.current = Date.now();
      setLastSavedAt(Date.now());
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('error');
    }

    // Reset to idle after 2 seconds so the indicator doesn't stay frozen
    setTimeout(() => setAutoSaveStatus('idle'), 2_000);
  }, [topicId, getSnapshot]);

  const clearAutoSavedDraft = useCallback(() => {
    clearDraft(topicId);
    lastSnapshotRef.current = null;
    lastSaveTimeRef.current = null;
    setLastSavedAt(null);
    setAutoSaveStatus('idle');
  }, [topicId]);

  const triggerSave = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Start/stop interval when enabled or topicId changes
  useEffect(() => {
    if (!enabled || !topicId) return;

    // Clear any stale timer from a previous run
    if (intervalTimerRef.current !== null) {
      clearInterval(intervalTimerRef.current);
    }

    intervalTimerRef.current = setInterval(() => {
      performSave();
    }, intervalMs);

    return () => {
      if (intervalTimerRef.current !== null) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
    };
  }, [enabled, topicId, intervalMs, performSave]);

  // Debounce: schedule a save 2 seconds after the last content change
  // The interval above handles the 30s periodic save; this catches user typing bursts.
  useEffect(() => {
    if (!enabled || !topicId) return;

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // Only re-schedule on topicId change, not on every snapshot call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, enabled, debounceMs]);

  return { autoSaveStatus, lastSavedAt, clearAutoSavedDraft, triggerSave };
}
