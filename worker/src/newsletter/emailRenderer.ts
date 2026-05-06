import type { Env } from '../index';
import type { ResearchArticle } from './types';
import { generateForRef } from '../llm';

interface RecurringSection {
  name: string;
  prompt: string;
}

interface EnrichmentConfig {
  processingNote: string;
  emotionTarget: string;
  colorEmotionTarget: string;
  storyFramework: string;
}

interface VoiceConfig {
  authorPersona: string;
  writingStyleExamples: string;
  newsletterIntro: string;
  newsletterOutro: string;
  recurringSections: RecurringSection[];
}

interface RenderOptions extends EnrichmentConfig, VoiceConfig {}

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
  options: RenderOptions,
): Promise<string> {
  const { processingNote, emotionTarget, colorEmotionTarget, storyFramework, authorPersona, writingStyleExamples, newsletterIntro, newsletterOutro, recurringSections } = options;

  const templateInstruction = NEWSLETTER_TEMPLATES[template] || NEWSLETTER_TEMPLATES['curated-digest'];

  const enrichmentNote = [
    processingNote,
    emotionTarget ? `Emotional tone: ${emotionTarget}` : null,
    colorEmotionTarget ? `Visual/mood guidance: ${colorEmotionTarget}` : null,
    storyFramework ? `Narrative structure: ${storyFramework}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const voiceSection = [
    authorPersona ? `## Author Voice\n${authorPersona}` : null,
    writingStyleExamples ? `## Writing Style Reference\n${writingStyleExamples}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const introBlock = newsletterIntro
    ? `<div style="border-left: 4px solid #6366f1; padding-left: 16px; margin-bottom: 24px; font-style: italic;">${newsletterIntro}</div>`
    : '';

  const outroBlock = newsletterOutro
    ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-style: italic;">${newsletterOutro}</div>`
    : '';

  const recurringSectionBlocks = await renderRecurringSections(env, recurringSections, articles);

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

${voiceSection ? `\n${voiceSection}\n` : ''}
${enrichmentNote ? `## Additional Guidance\n${enrichmentNote}` : ''}

Write the complete newsletter email content. Do not include a subject line. Return only the email body content in HTML (no complex formatting).
`.trim();

  try {
    const result = await generateForRef(
      env,
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      prompt,
    );
    const bodyContent = result.text || '';
    return injectNewsletterParts(bodyContent, introBlock, outroBlock, recurringSectionBlocks);
  } catch (err) {
    console.error('Failed to generate newsletter content via LLM:', err);
    return renderFallbackNewsletter(articles, introBlock, outroBlock, recurringSectionBlocks);
  }
}

async function renderRecurringSections(
  env: Env,
  sections: RecurringSection[],
  articles: ResearchArticle[],
): Promise<string[]> {
  if (!sections || sections.length === 0) return [];
  const blocks: string[] = [];
  for (const section of sections) {
    if (!section.name || !section.prompt) continue;
    try {
      const articleSummaries = articles
        .map((a, i) => `${i + 1}. ${a.title} — ${a.source}`)
        .join('\n');
      const sectionPrompt = `
${section.prompt}

Context — this week's articles:
${articleSummaries}
`.trim();
      const result = await generateForRef(env, { provider: 'gemini', model: 'gemini-2.0-flash' }, sectionPrompt);
      const content = result.text || '';
      blocks.push(`<div style="margin-top:24px;"><strong>${section.name}</strong><div style="margin-top:8px;">${content}</div></div>`);
    } catch (err) {
      console.error(`Failed to render recurring section "${section.name}":`, err);
    }
  }
  return blocks;
}

function injectNewsletterParts(
  bodyContent: string,
  introBlock: string,
  outroBlock: string,
  recurringBlocks: string[],
): string {
  const body = bodyContent.trim();
  const parts: string[] = [];
  if (introBlock) parts.push(introBlock);
  parts.push(body);
  parts.push(...recurringBlocks);
  if (outroBlock) parts.push(outroBlock);
  return parts.join('\n');
}

export function renderNewsletterPreview(
  articles: ResearchArticle[],
  options: RenderOptions & { processingTemplate: string },
): string {
  const {
    processingNote,
    emotionTarget,
    colorEmotionTarget,
    storyFramework,
    authorPersona,
    writingStyleExamples,
    newsletterIntro,
    newsletterOutro,
    processingTemplate,
  } = options;

  const introBlock = newsletterIntro
    ? `<div style="border-left: 4px solid #6366f1; padding-left: 16px; margin-bottom: 24px; font-style: italic; color: #4a5568;">${newsletterIntro}</div>`
    : '';

  const outroBlock = newsletterOutro
    ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-style: italic; color: #4a5568;">${newsletterOutro}</div>`
    : '';

  const enrichmentNote = [
    processingNote,
    emotionTarget ? `Emotional tone: ${emotionTarget}` : null,
    colorEmotionTarget ? `Visual/mood guidance: ${colorEmotionTarget}` : null,
    storyFramework ? `Narrative structure: ${storyFramework}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const voiceNote = [
    authorPersona ? `<strong>Voice:</strong> ${authorPersona}` : null,
    writingStyleExamples ? `<strong>Style:</strong> ${writingStyleExamples}` : null,
  ]
    .filter(Boolean)
    .join('<br/>');

  const templateInstruction = NEWSLETTER_TEMPLATES[processingTemplate] || NEWSLETTER_TEMPLATES['curated-digest'];

  const articleItems = articles
    .map(
      (a, i) => `
    <li style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="flex-shrink: 0; width: 24px; height: 24px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-top: 2px;">${i + 1}</span>
        <div style="flex: 1;">
          <a href="${a.url}" style="font-size: 15px; font-weight: 600; color: #1e293b; text-decoration: none; line-height: 1.4;">${a.title}</a>
          <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
            <span style="color: #6366f1; font-weight: 500;">${a.source}</span>
            ${a.publishedAt ? ` &middot; ${new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
          </div>
          ${a.snippet ? `<p style="margin-top: 8px; font-size: 13px; color: #475569; line-height: 1.6;">${a.snippet}</p>` : ''}
        </div>
      </div>
    </li>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f8fafc; }
    .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { margin-bottom: 24px; }
    .template-note { font-size: 12px; color: #64748b; background: #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 20px; line-height: 1.6; }
    .articles { list-style: none; padding: 0; margin: 0; }
    .articles li:last-child { border-bottom: none !important; padding-bottom: 0 !important; margin-bottom: 0 !important; }
    .enrichment { font-size: 12px; color: #64748b; margin-bottom: 16px; }
    .voice { font-size: 12px; color: #475569; background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px; line-height: 1.6; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      ${enrichmentNote ? `<div class="enrichment">${enrichmentNote}</div>` : ''}
      ${voiceNote ? `<div class="voice">${voiceNote}</div>` : ''}
      ${introBlock}
    </div>
    <div class="template-note">
      <strong style="color: #6366f1;">Template:</strong> ${templateInstruction}
    </div>
    <ol class="articles">${articleItems}</ol>
    ${outroBlock}
  </div>
  <div class="footer">
    This is a live preview &mdash; not a saved draft. Articles are fetched fresh from your configured sources.
  </div>
</body>
</html>`;
}

function renderFallbackNewsletter(
  articles: ResearchArticle[],
  introBlock: string,
  outroBlock: string,
  recurringBlocks: string[],
): string {
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
  ${introBlock}
  <div style="border-left: 4px solid #4a5568; padding-left: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 8px;">This Week's Top Stories</h2>
    <p style="color: #718096; margin: 0;">Curated highlights from your sources</p>
  </div>
  <ol style="padding-left: 24px;">
    ${items}
  </ol>
  ${recurringBlocks.join('\n')}
  ${outroBlock}
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;"/>
  <p style="font-size: 12px; color: #a0aec0;">
    You received this because you subscribed to the newsletter.
  </p>
</body>
</html>
`.trim();
}
