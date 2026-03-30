/** Per-topic rules replace global workspace rules when non-empty (trimmed). */
export function resolveEffectiveGenerationRules(topicRules: string | undefined, globalRules: string): string {
  const local = (topicRules || '').trim();
  return local ? local : (globalRules || '').trim();
}

/**
 * Column S (topic rules) wins; else template body from PostTemplates; else global workspace rules.
 */
export function resolveEffectiveGenerationRulesWithTemplate(
  topicRules: string | undefined,
  templateRules: string | undefined,
  globalRules: string,
): string {
  const local = (topicRules || '').trim();
  if (local) return local;
  const tpl = (templateRules || '').trim();
  if (tpl) return tpl;
  return (globalRules || '').trim();
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
