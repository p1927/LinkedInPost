/**
 * Shared writing rules for LinkedIn post generation.
 * Applied as baseline rules for all generate requests.
 */
export const DEFAULT_RULES: string[] = [
  "Keep sentences under 20 words — short sentences punch harder than long ones.",
  "Use active voice — 'Shipped feature X' not 'Feature X was shipped by us'.",
  "No em-dashes — use commas, colons, or short sentences instead.",
  "Lead with the insight, not the context — open with what the reader learns or gains.",
  "End every post with an actionable takeaway — a concrete next step, not a vague conclusion.",
];