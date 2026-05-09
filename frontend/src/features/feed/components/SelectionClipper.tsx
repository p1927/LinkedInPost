import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, Check } from 'lucide-react';

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
  const [clippedToast, setClippedToast] = useState(false);

  const dismiss = useCallback(() => setTooltip(null), []);

  const showClippedToast = useCallback(() => {
    setClippedToast(true);
    setTimeout(() => setClippedToast(false), 1500);
  }, []);

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
    showClippedToast();
  }, [tooltip, onClip, dismiss, showClippedToast]);

  return { tooltip, handleClip, dismiss, clippedToast, ClippedToastComponent };
}

function ClippedToastComponent({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!visible) return null;
  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'clipped-toast-in 0.2s ease-out',
      }}
      className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 shadow-lg text-white text-xs font-semibold"
    >
      <Check size={12} className="text-green-400" />
      Clipped!
    </div>,
    document.body,
  );
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
