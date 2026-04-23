/**
 * Knowledge loader utility.
 *
 * In Cloudflare Workers we cannot do filesystem reads at runtime.
 * Each module imports its knowledge files as raw string constants at build time.
 * This utility provides a helper to concatenate multiple knowledge sections
 * with clear delimiters, keeping each module's prompt context focused.
 */

export function buildKnowledgeContext(sections: Record<string, string>): string {
  const parts: string[] = [];
  for (const [label, content] of Object.entries(sections)) {
    if (!content.trim()) continue;
    parts.push(`--- ${label} ---\n${content.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * Truncate knowledge to a token budget (rough: 1 token ≈ 4 chars).
 * Keeps the first `maxTokens` worth of characters.
 */
export function truncateKnowledge(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[...truncated to fit context budget]';
}
