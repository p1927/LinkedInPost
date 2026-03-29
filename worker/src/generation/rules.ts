/** Per-topic rules replace global workspace rules when non-empty (trimmed). */
export function resolveEffectiveGenerationRules(topicRules: string | undefined, globalRules: string): string {
  const local = (topicRules || '').trim();
  return local ? local : (globalRules || '').trim();
}

export function buildRulesPrefix(sharedRules: string, instruction: string): string {
  const rules = [sharedRules.trim(), instruction.trim()].filter(Boolean);
  if (rules.length === 0) {
    return '';
  }

  return [
    'Critical instructions — follow exactly unless they conflict with safety constraints:',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
  ].join('\n');
}
