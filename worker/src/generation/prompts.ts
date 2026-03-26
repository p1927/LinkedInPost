import { buildRulesPrefix } from './rules';
import type { GenerationScope, SheetRow, TextSelectionRange } from './types';

export function buildQuickChangePrompt(
  row: SheetRow,
  editorText: string,
  scope: GenerationScope,
  selection: TextSelectionRange | null,
  instruction: string,
  sharedRules: string,
): string {
  const rulesPrefix = buildRulesPrefix(sharedRules, instruction);
  if (scope === 'selection' && selection) {
    return [
      'You are editing a LinkedIn draft.',
      rulesPrefix,
      'Return strict JSON with the shape {"result":"..."}.',
      'Rewrite only the selected segment. Return only the replacement text for that segment, not the entire post.',
      'Keep the surrounding context coherent, plain-text safe, and ready for downstream posting.',
      `Topic: ${row.topic}`,
      `Date: ${row.date}`,
      '',
      'Full draft:',
      editorText,
      '',
      'Selected segment:',
      selection.text,
    ].join('\n');
  }

  return [
    'You are editing a LinkedIn draft.',
    rulesPrefix,
    'Return strict JSON with the shape {"result":"..."}.',
    'Rewrite the full draft. Return the full revised post text only.',
    'Keep the result plain-text safe and ready for downstream posting.',
    `Topic: ${row.topic}`,
    `Date: ${row.date}`,
    '',
    'Draft:',
    editorText,
  ].join('\n');
}

export function buildVariantsPrompt(
  row: SheetRow,
  editorText: string,
  scope: GenerationScope,
  selection: TextSelectionRange | null,
  instruction: string,
  sharedRules: string,
): string {
  const rulesPrefix = buildRulesPrefix(sharedRules, instruction);
  const promptLines = [
    'You are generating four distinct LinkedIn draft options.',
    rulesPrefix,
    'Return strict JSON with the shape {"variants":["...","...","...","..."]}.',
    'Return exactly four non-empty plain-text options.',
    'Each option should take a clearly different angle while staying on-topic and ready for downstream posting.',
    `Topic: ${row.topic}`,
    `Date: ${row.date}`,
    '',
  ];

  if (scope === 'selection' && selection) {
    return [
      ...promptLines,
      'Rewrite only the selected segment. Each variant must contain only the replacement text for that selected segment, not the entire post.',
      'Full draft:',
      editorText,
      '',
      'Selected segment:',
      selection.text,
    ].join('\n');
  }

  return [
    ...promptLines,
    'Rewrite the full draft. Each variant must contain the full revised post text.',
    'Draft:',
    editorText,
  ].join('\n');
}
