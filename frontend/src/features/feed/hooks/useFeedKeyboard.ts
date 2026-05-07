import { useEffect, useCallback } from 'react';
import type { NewsArticle } from '../../trending/types';

export interface FeedKeyboardActions {
  onNext: () => void;
  onPrev: () => void;
  onOpenHighlighted: () => void;
  onClipHighlighted: () => void;
  onToggleHelp: () => void;
}

function isEditable(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

export function useFeedKeyboard(
  articles: NewsArticle[],
  highlightedIndex: number,
  actions: FeedKeyboardActions,
) {
  const { onNext, onPrev, onOpenHighlighted, onClipHighlighted, onToggleHelp } = actions;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Never intercept when typing in an input/textarea
      if (isEditable(e.target)) return;
      // Never intercept modifier-key combos
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          onNext();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          onPrev();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onOpenHighlighted();
          break;
        case 'c':
          e.preventDefault();
          onClipHighlighted();
          break;
        case '?':
          e.preventDefault();
          onToggleHelp();
          break;
      }
    },
    [articles, highlightedIndex, onNext, onPrev, onOpenHighlighted, onClipHighlighted, onToggleHelp],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}