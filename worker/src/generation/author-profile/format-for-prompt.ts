/**
 * Wraps saved author profile for LLM prompts. Empty when there is no usable content.
 */
export function formatAuthorProfileForPrompt(raw: string): string {
  const body = (raw || '').trim();
  if (!body) {
    return '';
  }

  return [
    'Author context — factual profile supplied by the user. Use relevant details when voice, perspective, or background matter.',
    'Do not invent employers, credentials, metrics, or personal facts beyond what appears below.',
    '',
    body,
    '',
  ].join('\n');
}
