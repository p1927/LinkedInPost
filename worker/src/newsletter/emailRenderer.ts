import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { generateForRef } from '../llm';

interface EnrichmentConfig {
  processingNote: string;
  emotionTarget: string;
  colorEmotionTarget: string;
  storyFramework: string;
}

const NEWSLETTER_TEMPLATES: Record<string, string> = {
  'personal-story': `Write this newsletter as a first-person narrative that weaves together multiple news items into a personal story. Start with a hook about how you encountered these stories, then guide the reader through each item, connecting them with your own reflections and observations. End with a thought-provoking question or call-to-action that invites the reader to share their perspective.`,
  'curated-digest': `Present each news item with a brief editorial introduction (1-2 sentences) that provides context or a unique angle. Use subheadings for each item. Keep the tone conversational but informed. End with an invitation for reader comments or a relevant resource.`,
  'theme-weekly': `Identify the common thread connecting these news items and write a unified narrative that explores this theme in depth. Start by introducing the theme and why it matters now. Weave the items together throughout the piece rather than treating them as separate entries. Conclude with implications or a forward-looking perspective.`,
  'expert-commentary': `Present each news item with 2-3 sentences of expert analysis. Frame yourself as a knowledgeable observer providing context that goes beyond the headlines. Use a semi-formal tone appropriate for industry professionals. Include relevant comparisons to historical events or broader trends where appropriate.`,
};

export async function renderNewsletterEmail(
  env: Env,
  articles: ResearchArticle[],
  template: string,
  enrichment: EnrichmentConfig,
): Promise<string> {
  const templateInstruction = NEWSLETTER_TEMPLATES[template] || NEWSLETTER_TEMPLATES['curated-digest'];

  const enrichmentNote = [
    enrichment.processingNote,
    enrichment.emotionTarget ? `Emotional tone: ${enrichment.emotionTarget}` : null,
    enrichment.colorEmotionTarget ? `Visual/mood guidance: ${enrichment.colorEmotionTarget}` : null,
    enrichment.storyFramework ? `Narrative structure: ${enrichment.storyFramework}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const articleSummaries = articles
    .map(
      (a, i) => `
## ${i + 1}. ${a.title}
Source: ${a.source} | Published: ${new Date(a.publishedAt).toLocaleDateString()}
${a.snippet || ''}
Link: ${a.url}
`,
    )
    .join('\n');

  const prompt = `
You are writing a newsletter email based on the following articles:

${articleSummaries}

## Template Instruction
${templateInstruction}

${enrichmentNote ? `## Additional Guidance\n${enrichmentNote}` : ''}

Write the complete newsletter email content. Do not include a subject line. Return only the email body content in plain text or basic HTML (no complex formatting).
`.trim();

  try {
    const result = await generateForRef(
      env,
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      prompt,
    );
    return result.text;
  } catch (err) {
    console.error('Failed to generate newsletter content via LLM:', err);
    return renderFallbackNewsletter(articles, template);
  }
}

function renderFallbackNewsletter(articles: ResearchArticle[], _template: string): string {
  const items = articles
    .map(
      (a, _i) => `
<li style="margin-bottom: 16px;">
  <strong><a href="${a.url}">${a.title}</a></strong><br/>
  <em>${a.source}</em> — ${a.snippet || 'No description available.'}
</li>
`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-left: 4px solid #4a5568; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px;">This Week's Top Stories</h2>
    <p style="color: #718096; margin: 0;">Curated highlights from your sources</p>
  </div>
  <ol style="padding-left: 24px;">
    ${items}
  </ol>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
  <p style="font-size: 12px; color: #a0aec0;">
    You received this because you subscribed to the newsletter.
  </p>
</body>
</html>
`.trim();
}
