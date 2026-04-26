// worker/src/generation/nodeInsightSummary.ts
/**
 * Converts a node's typed output JSON into a short human-readable insight
 * string for display in the frontend EnrichmentProgressPanel.
 *
 * Returns null for nodes that don't produce summarisable output (e.g. validators).
 * Never throws — malformed output just returns null.
 */

export function buildNodeInsightSummary(nodeId: string, outputJson: string): string | null {
  try {
    const output = JSON.parse(outputJson) as Record<string, unknown>;
    switch (nodeId) {
      case 'psychology-analyzer': {
        const emotion = output.dominantEmotion as string | undefined;
        const triggers = (output.triggers as Array<{ type: string }> | undefined)
          ?.slice(0, 2)
          .map(t => t.type)
          .join(', ');
        if (emotion || triggers) {
          return [emotion && `Dominant emotion: ${emotion}`, triggers && `Triggers: ${triggers}`]
            .filter(Boolean)
            .join('. ');
        }
        return null;
      }

      case 'research-context': {
        const facts = output.keyFacts as string[] | undefined;
        const trends = output.trends as string[] | undefined;
        const first = facts?.[0] ?? trends?.[0];
        if (!first) return null;
        return `Found: ${first}`;
      }

      case 'vocabulary-selector': {
        const words = (output.powerWords as string[] | undefined)?.slice(0, 3).join(', ');
        return words ? `Power words: ${words}` : null;
      }

      case 'hook-designer': {
        const hooks = output.hooks as Array<{ type: string; text: string }> | undefined;
        const rec = hooks?.[output.recommendedIndex as number ?? 0];
        return rec ? `Hook (${rec.type}): "${rec.text.slice(0, 60)}…"` : null;
      }

      case 'narrative-arc': {
        const arc = (output as { arc?: string }).arc;
        const cta = (output as { ctaType?: string }).ctaType;
        if (!arc) return null;
        return cta ? `Arc: ${arc} · CTA: ${cta}` : `Arc: ${arc}`;
      }

      case 'draft-generator': {
        const variants = output.variants as Array<{ hookType?: string }> | undefined;
        if (!variants?.length) return null;
        return `${variants.length} variants generated`;
      }

      case 'tone-calibrator':
        return 'Tone adjusted to author voice';

      case 'constraint-validator':
        return null; // not summarisable

      default:
        return null;
    }
  } catch {
    return null;
  }
}
