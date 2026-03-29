import { useCallback, useEffect, useRef, useState } from 'react';

type StackState = {
  value: string;
  past: string[];
  future: string[];
};

/**
 * Text field with local undo/redo. When `syncedValue` changes (e.g. after save), history resets.
 */
export function useTextUndoRedo(syncedValue: string) {
  const [st, setSt] = useState<StackState>(() => ({
    value: syncedValue,
    past: [],
    future: [],
  }));
  const lastExternal = useRef(syncedValue);

  useEffect(() => {
    if (syncedValue === lastExternal.current) return;
    lastExternal.current = syncedValue;
    setSt({ value: syncedValue, past: [], future: [] });
  }, [syncedValue]);

  const setValue = useCallback((next: string) => {
    setSt((s) => {
      if (next === s.value) return s;
      return { value: next, past: [...s.past, s.value], future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setSt((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1]!;
      return {
        value: prev,
        past: s.past.slice(0, -1),
        future: [s.value, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setSt((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return {
        value: next,
        past: [...s.past, s.value],
        future: s.future.slice(1),
      };
    });
  }, []);

  return {
    value: st.value,
    setValue,
    undo,
    redo,
    canUndo: st.past.length > 0,
    canRedo: st.future.length > 0,
  };
}
