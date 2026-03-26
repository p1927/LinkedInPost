export function buildRulesPrefix(sharedRules: string, instruction: string): string {
  const rules = [sharedRules.trim(), instruction.trim()].filter(Boolean);
  if (rules.length === 0) {
    return '';
  }

  return [
    'Follow these generation rules exactly unless they conflict with safety constraints:',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
  ].join('\n');
}
