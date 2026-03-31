export interface RelevanceWithContextPromptInput {
  topic: string;
  postText: string;
  channel: string;
  newsContext: string | null;
}

export function buildRelevanceWithContextPrompt(input: RelevanceWithContextPromptInput): string {
  const { topic, postText, channel, newsContext } = input;
  const newsSection = newsContext
    ? `\nRecent news context about this topic:\n"""\n${newsContext.slice(0, 1500)}\n"""`
    : '';

  return `Evaluate the relevance and timeliness of the following ${channel || 'linkedin'} post draft against its intended topic.${newsSection}

Topic: ${topic}
Post text:
"""
${postText}
"""

Assess:
1. Is the post content clearly relevant to the stated topic?
2. Are any factual claims consistent with the news context provided (if any)?
3. Is the post appropriately timed or does it reference outdated information?

Respond with this exact JSON schema:
{
  "topicRelevant": true or false,
  "factsConsistent": true or false,
  "timeliness": "current" or "neutral" or "outdated",
  "concerns": ["list of specific concerns, or empty array"],
  "summary": "one to two sentence overall assessment",
  "verdict": "pass" or "flag" or "block",
  "verdictReason": "one sentence explaining the verdict"
}`;
}
