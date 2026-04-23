import { useState, useEffect, useCallback } from 'react';
import type { ContentPattern } from './types';

export interface UseTemplateSelectionOptions {
  /** Fetch the list of patterns from the backend. */
  loadPatterns: () => Promise<ContentPattern[]>;
  /** Initial selected pattern id (e.g. from sheetRow.generationTemplateId). */
  initialPatternId?: string;
  /** Called when the user selects a new pattern (for persistence). */
  onSelect?: (patternId: string) => Promise<void> | void;
}

export interface UseTemplateSelectionResult {
  patterns: ContentPattern[];
  patternsLoading: boolean;
  selectedPattern: ContentPattern | null;
  selectPattern: (patternId: string) => Promise<void>;
  clearPattern: () => void;
}

export function useTemplateSelection({
  loadPatterns,
  initialPatternId,
  onSelect,
}: UseTemplateSelectionOptions): UseTemplateSelectionResult {
  const [patterns, setPatterns] = useState<ContentPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    initialPatternId?.trim() || null,
  );

  useEffect(() => {
    let cancelled = false;
    setPatternsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    void loadPatterns()
      .then((list) => {
        if (!cancelled) setPatterns(list);
      })
      .catch(() => {
        if (!cancelled) setPatterns([]);
      })
      .finally(() => {
        if (!cancelled) setPatternsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPatterns]);

  // Sync when the parent row's generationTemplateId changes (e.g. after save).
  useEffect(() => {
    setSelectedPatternId(initialPatternId?.trim() || null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [initialPatternId]);

  const selectedPattern =
    patterns.find((p) => p.id === selectedPatternId) ?? null;

  const selectPattern = useCallback(
    async (patternId: string) => {
      setSelectedPatternId(patternId);
      await onSelect?.(patternId);
    },
    [onSelect],
  );

  const clearPattern = useCallback(() => {
    setSelectedPatternId(null);
  }, []);

  return { patterns, patternsLoading, selectedPattern, selectPattern, clearPattern };
}
