import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WORKSPACE_PATHS } from '@/features/topic-navigation/utils/workspaceRoutes';

const GO_MAP: Record<string, string> = {
  t: WORKSPACE_PATHS.topics,
  f: WORKSPACE_PATHS.feed,
  n: WORKSPACE_PATHS.campaign,
  s: WORKSPACE_PATHS.settings,
};

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

export function useGlobalShortcuts(onToggleHelp: () => void) {
  const navigate = useNavigate();
  const gPending = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      if (key === '?') {
        onToggleHelp();
        return;
      }

      if (key === 'Escape') {
        gPending.current = false;
        return;
      }

      const lower = key.toLowerCase();

      if (lower === 'g') {
        gPending.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          gPending.current = false;
        }, 1000);
        return;
      }

      if (gPending.current && GO_MAP[lower]) {
        gPending.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        navigate(GO_MAP[lower]);
      }
    },
    [navigate, onToggleHelp],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [handleKeyDown]);
}
