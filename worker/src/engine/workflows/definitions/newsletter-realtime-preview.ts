import type { WorkflowDefinition } from '../../types';

/**
 * Newsletter Real-Time Preview workflow.
 *
 * Spec source: content_post_types_playbook.md § 8 "The Newsletter Real-Time Preview"
 * Arc pattern (STRUCTURE:):
 *   SUBJECT LINE → OPENING HOOK → ISSUE CONTEXT → ARTICLE PREVIEWS → VOICE SAMPLE → CLOSE → CTA
 *
 * The newsletter preview renders a live snapshot of an upcoming edition —
 * subject line, issue number, opening hook, article summaries, editorial voice,
 * and a CTA — in the same format the reader will receive in their inbox.
 * This builds trust and reduces the friction of committing to a subscription.
 */
export const newsletterRealtimePreviewWorkflow: WorkflowDefinition = {
  id: 'newsletter-realtime-preview',
  name: 'Newsletter Real-Time Preview',
  description:
    'A live preview of a newsletter edition showing the subject line, issue number, opening hook, article summaries, and call-to-action — rendered in the same format the reader will receive in their inbox.',
  optimizationTarget: 'subscription intent, preview quality, and reader trust',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'important',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'supporting',
      dependsOn: [],
    },
    {
      nodeId: 'vocabulary-selector',
      importance: 'important',
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'hook-designer',
      importance: 'critical',
      dependsOn: ['psychology-analyzer', 'research-context'],
    },
    {
      nodeId: 'narrative-arc',
      importance: 'important',
      dependsOn: ['hook-designer', 'psychology-analyzer'],
    },
    {
      nodeId: 'draft-generator',
      importance: 'critical',
      dependsOn: ['narrative-arc', 'hook-designer', 'vocabulary-selector'],
    },
    {
      nodeId: 'tone-calibrator',
      importance: 'critical',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'important',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  generationInstruction:
    "STRUCTURE: SUBJECT LINE → OPENING HOOK → ISSUE CONTEXT → ARTICLE PREVIEWS → VOICE SAMPLE → CLOSE → CTA. " +
    "SUBJECT LINE: compelling, specific, curiosity-driven (under 60 chars). " +
    "OPENING HOOK: 2–3 lines that make the reader feel this issue is for them. " +
    "ISSUE CONTEXT: brief note on what this edition covers and why it matters now. " +
    "ARTICLE PREVIEWS: 2–4 article summaries with a one-sentence 'why read this' each. " +
    "VOICE SAMPLE: a paragraph demonstrating the newsletter's editorial tone and expertise. " +
    "CLOSE: the implicit promise of what's in it for the subscriber. " +
    "CTA: invite the reader to subscribe, share, or forward. " +
    "Render the output exactly as the reader will see it in their inbox — this is the live preview, not a description of it.",
};

export default newsletterRealtimePreviewWorkflow;
