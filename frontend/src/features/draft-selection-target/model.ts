import type { GenerationScope, TextSelectionRange } from '@/services/backendApi';

export type FormattingAction = 'tighten-spacing' | 'bulletize' | 'emphasize';

const BOLD_MAP: Record<string, string> = {
  a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣',
  k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭',
  u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳',
  A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉',
  K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓',
  U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙',
  0: '𝟎', 1: '𝟏', 2: '𝟐', 3: '𝟑', 4: '𝟒', 5: '𝟓', 6: '𝟔', 7: '𝟕', 8: '𝟖', 9: '𝟗',
};

export function normalizeSelection(value: string, start: number, end: number): TextSelectionRange | null {
  if (start < 0 || end <= start || end > value.length) {
    return null;
  }

  const text = value.slice(start, end);
  if (!text.trim()) {
    return null;
  }

  return { start, end, text };
}

export function getEffectiveScope(scope: GenerationScope, selection: TextSelectionRange | null): GenerationScope {
  return scope === 'selection' && selection?.text.trim() ? 'selection' : 'whole-post';
}

/** User chose Selection mode but has not selected non-whitespace text yet — AI should not fall back to whole draft silently. */
export function isSelectionScopeWaitingForRange(scope: GenerationScope, selection: TextSelectionRange | null): boolean {
  return scope === 'selection' && !selection?.text.trim();
}

export function getTargetText(value: string, scope: GenerationScope, selection: TextSelectionRange | null): string {
  return getEffectiveScope(scope, selection) === 'selection' && selection
    ? value.slice(selection.start, selection.end)
    : value;
}

export function replaceTargetText(value: string, scope: GenerationScope, selection: TextSelectionRange | null, replacement: string): string {
  if (getEffectiveScope(scope, selection) === 'selection' && selection) {
    return `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`;
  }

  return replacement;
}

function tightenSpacing(input: string): string {
  return input
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function bulletize(input: string): string {
  return input
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '';
      }

      return trimmed.startsWith('• ') ? trimmed : `• ${trimmed}`;
    })
    .join('\n');
}

function emphasize(input: string): string {
  return Array.from(input).map((character) => BOLD_MAP[character] || character).join('');
}

function formatTarget(value: string, action: FormattingAction): string {
  switch (action) {
    case 'tighten-spacing':
      return tightenSpacing(value);
    case 'bulletize':
      return bulletize(value);
    case 'emphasize':
      return emphasize(value);
    default:
      return value;
  }
}

export function applyFormattingAction(
  value: string,
  scope: GenerationScope,
  selection: TextSelectionRange | null,
  action: FormattingAction,
): { value: string; selection: TextSelectionRange | null } {
  const effectiveScope = getEffectiveScope(scope, selection);
  if (effectiveScope === 'selection' && selection) {
    const nextTarget = formatTarget(value.slice(selection.start, selection.end), action);
    const nextValue = `${value.slice(0, selection.start)}${nextTarget}${value.slice(selection.end)}`;
    return {
      value: nextValue,
      selection: {
        start: selection.start,
        end: selection.start + nextTarget.length,
        text: nextTarget,
      },
    };
  }

  return {
    value: formatTarget(value, action),
    selection: null,
  };
}

/** Clamped range for highlight overlay when `value` length changed. */
export function getClampedSelectionForHighlight(
  value: string,
  selection: TextSelectionRange | null,
): { start: number; end: number } | null {
  if (!selection || !selection.text.trim()) return null;
  const len = value.length;
  const start = Math.max(0, Math.min(selection.start, len));
  const end = Math.max(start, Math.min(selection.end, len));
  if (end <= start) return null;
  return { start, end };
}
