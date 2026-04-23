import type { RequirementReport, ReviewResult, TextVariant } from '../types';

const MAX_LINKEDIN_CHARS = 3000;
const MIN_HOOK_WORDS = 3;

function hasHook(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  return firstLine.split(/\s+/).length >= MIN_HOOK_WORDS;
}

function checkLength(text: string, channel: string): string | null {
  if (channel === 'linkedin' && text.length > MAX_LINKEDIN_CHARS) {
    return `Post exceeds LinkedIn limit (${text.length}/${MAX_LINKEDIN_CHARS} chars)`;
  }
  return null;
}

function checkMustInclude(text: string, mustInclude: string[]): string[] {
  return mustInclude.filter((term) => !text.toLowerCase().includes(term.toLowerCase()))
    .map((term) => `Missing required term: "${term}"`);
}

function checkMustAvoid(text: string, mustAvoid: string[]): string[] {
  return mustAvoid.filter((term) => text.toLowerCase().includes(term.toLowerCase()))
    .map((term) => `Banned term present: "${term}"`);
}

export function reviewContent(
  variants: TextVariant[],
  report: RequirementReport,
): ReviewResult {
  const issues: string[] = [];

  for (const v of variants) {
    const lengthIssue = checkLength(v.text, report.channel);
    if (lengthIssue) issues.push(`[${v.label}] ${lengthIssue}`);

    if (!hasHook(v.text)) issues.push(`[${v.label}] Hook is missing or too short`);

    issues.push(...checkMustInclude(v.text, report.mustInclude).map((s) => `[${v.label}] ${s}`));
    issues.push(...checkMustAvoid(v.text, report.mustAvoid).map((s) => `[${v.label}] ${s}`));
  }

  // All 3 variants must fail the same check before we block
  const blockingIssues = issues.filter((i) =>
    i.includes('Banned term'),
  );

  const verdict: ReviewResult['verdict'] = blockingIssues.length > 0
    ? 'block'
    : issues.length > 0
    ? 'flag'
    : 'pass';

  return {
    passed: verdict === 'pass',
    verdict,
    issues,
    summary: verdict === 'pass'
      ? 'All checks passed'
      : `${issues.length} issue(s) found: ${issues[0]}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}`,
  };
}
