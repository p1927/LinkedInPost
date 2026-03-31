export interface ImageMultimodalPromptInput {
  topic: string;
  postText: string;
  channel: string;
  imageIndex: number;
}

export function buildImageMultimodalPrompt(input: ImageMultimodalPromptInput): string {
  const { topic, postText, channel, imageIndex } = input;
  return `Analyze this image (image ${imageIndex + 1}). Perform ALL three steps and respond as JSON.

Step 1 — Extract all visible text in the image verbatim.
Step 2 — Identify the key visual elements (objects, people, logos, symbols, colours, scene).
Step 3 — Based on the text and visual elements, decide:
  a) What is the overall meaning or message of this image?
  b) Is this image relevant to the following context?

Context:
- Topic: ${topic}
- Post text: ${postText.slice(0, 500)}
- Distribution channel: ${channel || 'linkedin'}

Respond with this exact JSON schema:
{
  "visibleText": "all text extracted verbatim or empty string",
  "keyElements": "concise list of key visual elements",
  "meaning": "one to two sentence explanation of what the image conveys",
  "relevant": true or false,
  "verdict": "pass" or "flag" or "block",
  "verdictReason": "one sentence explaining the verdict"
}

Verdict guide:
- "pass" — image is on-topic, safe, and professional
- "flag" — minor concerns (off-topic, mildly misleading) worth human review
- "block" — serious violation (hate, explicit content, severe misinformation)`;
}
