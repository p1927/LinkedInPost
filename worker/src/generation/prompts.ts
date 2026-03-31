import { buildRulesPrefix } from './rules';
import type { GenerationScope, ResearchArticleRef, SheetRow, TextSelectionRange } from './types';

function buildResearchContextAppendix(articles: ResearchArticleRef[] | undefined): string {
  if (!articles || articles.length === 0) {
    return '';
  }
  const lines = [
    '',
    'External news context (use only these sources; do not invent facts). If you cite a claim, add a short "Sources:" line at the end of the post with the URLs you used.',
    '',
  ];
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    lines.push(`Source ${i + 1}: ${a.title}`);
    lines.push(`URL: ${a.url}`);
    lines.push(`Publisher: ${a.source}`);
    if (a.publishedAt) {
      lines.push(`Published: ${a.publishedAt}`);
    }
    lines.push(`Summary: ${a.snippet}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Author context precedes numbered “Critical instructions” when both are present. */
function prependAuthorToRulesPrefix(authorProfileBlock: string, rulesPrefix: string): string {
  const author = authorProfileBlock.trim();
  if (!author) {
    return rulesPrefix;
  }
  if (!rulesPrefix.trim()) {
    return author;
  }
  return `${author}\n${rulesPrefix}`;
}

export function buildQuickChangePrompt(
  row: SheetRow,
  editorText: string,
  scope: GenerationScope,
  selection: TextSelectionRange | null,
  instruction: string,
  sharedRules: string,
  authorProfileBlock: string,
  researchArticles?: ResearchArticleRef[],
): string {
  const rulesPrefix = prependAuthorToRulesPrefix(authorProfileBlock, buildRulesPrefix(sharedRules, instruction));
  const researchBlock = buildResearchContextAppendix(researchArticles);
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
      researchBlock,
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
    researchBlock,
  ].join('\n');
}

export function buildVariantsPrompt(
  row: SheetRow,
  editorText: string,
  scope: GenerationScope,
  selection: TextSelectionRange | null,
  instruction: string,
  sharedRules: string,
  authorProfileBlock: string,
  researchArticles?: ResearchArticleRef[],
): string {
  const rulesPrefix = prependAuthorToRulesPrefix(authorProfileBlock, buildRulesPrefix(sharedRules, instruction));
  const researchBlock = buildResearchContextAppendix(researchArticles);
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
      researchBlock,
    ].join('\n');
  }

  return [
    ...promptLines,
    'Rewrite the full draft. Each variant must contain the full revised post text.',
    'Draft:',
    editorText,
    researchBlock,
  ].join('\n');
}
