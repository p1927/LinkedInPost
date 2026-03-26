import type { GenerationScope, TextSelectionRange } from './types';

export function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart > -1 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart > -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

export function tryParseJson(text: string): unknown {
  const candidate = extractJsonCandidate(text);
  try {
    return JSON.parse(candidate);
  } catch {
    return candidate;
  }
}

export function normalizePlainTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizePlainTextValue(entry)).filter(Boolean).join('\n').trim();
  }

  if (value && typeof value === 'object') {
    for (const key of ['result', 'text', 'post', 'content', 'caption', 'value']) {
      const candidate = normalizePlainTextValue((value as Record<string, unknown>)[key]);
      if (candidate) {
        return candidate;
      }
    }

    return Object.values(value as Record<string, unknown>)
      .map((entry) => normalizePlainTextValue(entry))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

export function normalizeVariantList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizePlainTextValue(entry)).filter(Boolean).slice(0, 4);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.variants)) {
      return normalizeVariantList(record.variants);
    }

    const keyedVariants = ['variant1', 'variant2', 'variant3', 'variant4']
      .map((key) => normalizePlainTextValue(record[key]))
      .filter(Boolean);
    if (keyedVariants.length > 0) {
      return keyedVariants.slice(0, 4);
    }
  }

  const text = normalizePlainTextValue(value);
  if (!text) {
    return [];
  }

  const splitVariants = text
    .split(/(?:^|\n)\s*(?:variant\s*\d+[:.-]|\d+[.)])\s*/i)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (splitVariants.length >= 4) {
    return splitVariants.slice(0, 4);
  }

  return [text];
}

export function coerceVariantList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Missing preview variants payload.');
  }

  const variants = value
    .map((entry) => normalizePlainTextValue(entry))
    .filter((entry) => entry.trim())
    .slice(0, 4);

  if (variants.length !== 4) {
    throw new Error('Exactly four variants are required before saving them to Sheets.');
  }

  return variants;
}

export function coerceSelectionRange(value: unknown): TextSelectionRange | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const start = Number((value as TextSelectionRange).start);
  const end = Number((value as TextSelectionRange).end);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
    return null;
  }

  return {
    start,
    end,
    text: String((value as TextSelectionRange).text || ''),
  };
}

export function resolveGenerationTarget(editorText: string, requestedScope?: GenerationScope, rawSelection?: TextSelectionRange | null): {
  scope: GenerationScope;
  selection: TextSelectionRange | null;
} {
  const selection = rawSelection
    && rawSelection.end <= editorText.length
    && rawSelection.start >= 0
    && rawSelection.end > rawSelection.start
      ? {
        start: rawSelection.start,
        end: rawSelection.end,
        text: editorText.slice(rawSelection.start, rawSelection.end),
      }
      : null;

  if (requestedScope === 'selection' && selection && selection.text.trim()) {
    return {
      scope: 'selection',
      selection,
    };
  }

  return {
    scope: 'whole-post',
    selection: null,
  };
}

export function applyReplacement(editorText: string, scope: GenerationScope, selection: TextSelectionRange | null, replacementText: string): string {
  if (scope === 'selection' && selection) {
    return `${editorText.slice(0, selection.start)}${replacementText}${editorText.slice(selection.end)}`;
  }

  return replacementText;
}
