/** Placeholder replaced with the user’s topic ideas (one per line or free text). */
export const CAMPAIGN_PROMPT_TOPICS_PLACEHOLDER = '{{TOPICS}}';

export function buildCampaignClaudePrompt(userTopicsBlock: string): string {
  const block = userTopicsBlock.trim() || '(Add your topic ideas in the box above.)';
  return DEFAULT_CAMPAIGN_PROMPT_TEMPLATE.replace(CAMPAIGN_PROMPT_TOPICS_PLACEHOLDER, block);
}

const DEFAULT_CAMPAIGN_PROMPT_TEMPLATE = `You are helping import a content campaign into Channel Bot. Output a single JSON document (no markdown fences) that matches this shape exactly.

User topic ideas / themes to cover (expand into separate posts as appropriate):
${CAMPAIGN_PROMPT_TOPICS_PLACEHOLDER}

Required JSON shape:
{
  "version": 1,
  "posts": [
    {
      "topic": "Short queue title (unique per calendar day)",
      "date": "YYYY-MM-DD",
      "channels": ["linkedin"],
      "variants": ["Full post text for variant slot 1", "optional v2", "optional v3", "optional v4"],
      "postTime": "YYYY-MM-DD HH:mm optional — leave empty if unknown",
      "status": "Drafted",
      "topicGenerationRules": "optional per-post rules string",
      "generationTemplateId": "optional template id from workspace"
    }
  ]
}

Rules:
- "date" must be ISO date YYYY-MM-DD.
- "channels" must be an array of channel ids: instagram, linkedin, telegram, whatsapp, gmail (for planning; the app uses them in preview only).
- Use "variants" as an array of 1–4 strings; the first non-empty is the main body. You may use "body" instead of variants for a single variant.
- Each combination of topic + date must be unique in the file.
- Escape newlines inside strings as \\n in JSON.
`;

export const DEFAULT_CAMPAIGN_PROMPT = buildCampaignClaudePrompt('');
