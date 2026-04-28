import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Scissors } from 'lucide-react';

interface TooltipState {
  x: number;
  y: number;
  text: string;
}

interface UseSelectionClipperOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  onClip: (text: string) => void;
  enabled?: boolean;
}

export function useSelectionClipper({ containerRef, onClip, enabled = true }: UseSelectionClipperOptions) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const dismiss = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    if (!enabled) return;

    function handleMouseUp() {
      // Small delay so the selection is fully settled
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
          setTooltip(null);
          return;
        }
        const text = sel.toString().trim();
        if (!text || !containerRef.current) {
          setTooltip(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          setTooltip(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setTooltip({
          x: rect.left + rect.width / 2,
          y: rect.top,
          text,
        });
      }, 10);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }

    function handleMouseDown(e: MouseEvent) {
      // Dismiss if clicking outside the tooltip
      const target = e.target as HTMLElement;
      if (target.closest('[data-selection-clipper-tooltip]')) return;
      dismiss();
    }

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [containerRef, dismiss, enabled]);

  const handleClip = useCallback(() => {
    if (!tooltip) return;
    onClip(tooltip.text);
    window.getSelection()?.removeAllRanges();
    dismiss();
  }, [tooltip, onClip, dismiss]);

  return { tooltip, handleClip, dismiss };
}

interface SelectionClipTooltipProps {
  x: number;
  y: number;
  onClip: () => void;
}

export function SelectionClipTooltip({ x, y, onClip }: SelectionClipTooltipProps) {
  return createPortal(
    <div
      data-selection-clipper-tooltip
      style={{
        position: 'fixed',
        left: x,
        top: y - 8,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1.5 shadow-lg text-white"
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // prevent selection loss
        onClick={onClip}
        className="flex items-center gap-1.5 text-xs font-semibold hover:text-primary-fg/80 transition-colors whitespace-nowrap"
      >
        <Scissors size={11} />
        Clip passage
      </button>
    </div>,
    document.body,
  );
}
