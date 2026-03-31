export interface TextGuardrailsPromptInput {
  topic: string;
  postText: string;
  channel: string;
}

export function buildTextGuardrailsPrompt(input: TextGuardrailsPromptInput): string {
  const { topic, postText, channel } = input;
  return `Review the following ${channel || 'linkedin'} post draft for content policy compliance.

Topic: ${topic}
Post text:
"""
${postText}
"""

Evaluate from the perspective of a professional content moderation system. Check for:
1. Guardrails violations (hate speech, harassment, explicit content, dangerous advice, spam)
2. Double meanings or ambiguous phrasing that could be misread negatively
3. Overall severity if any issues are found

Respond with this exact JSON schema:
{
  "guardrailsOk": true or false,
  "doubleMeanings": ["list of any ambiguous phrases, or empty array"],
  "severityTier": "none" or "low" or "medium" or "high",
  "summary": "one to two sentence summary of findings",
  "verdict": "pass" or "flag" or "block",
  "verdictReason": "one sentence explaining the verdict"
}

Verdict guide:
- "pass" — content is compliant and professional
- "flag" — minor issues that benefit from human review before publishing
- "block" — content violates policy and must not be published`;
}
