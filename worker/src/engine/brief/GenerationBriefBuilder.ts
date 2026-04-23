import {
  type WorkflowContext,
  type BriefSection,
  type ImportanceLevel,
  type PsychologyAnalysis,
  type ResearchFindings,
  type VocabularySelection,
  type HookOptions,
  type NarrativeBlueprint,
} from '../types';

// ─────────────────────────────────────────────────────────────
// Section formatters
// ─────────────────────────────────────────────────────────────

function formatPsychologyAnalysis(a: PsychologyAnalysis): string {
  const lines: string[] = [
    `Audience: ${a.audienceDescription}`,
    `Awareness level: ${a.audienceAwarenessLevel}`,
    `Dominant emotion: ${a.dominantEmotion}`,
    '',
    'Pain points:',
    ...a.painPoints.map((p) => `  - ${p}`),
    '',
    'Aspirations:',
    ...a.aspirations.map((asp) => `  - ${asp}`),
    '',
    'Psychological triggers:',
    ...a.triggers.map(
      (t) => `  - [${t.type}] ${t.rationale} → ${t.applicationHint}`,
    ),
  ];
  return lines.join('\n');
}

function formatResearchFindings(f: ResearchFindings): string {
  const lines: string[] = [];

  if (f.keyFacts.length > 0) {
    lines.push('Key facts:', ...f.keyFacts.map((x) => `  - ${x}`), '');
  }
  if (f.statistics.length > 0) {
    lines.push('Statistics:', ...f.statistics.map((x) => `  - ${x}`), '');
  }
  if (f.trends.length > 0) {
    lines.push('Trends:', ...f.trends.map((x) => `  - ${x}`), '');
  }
  if (f.credibilityHooks.length > 0) {
    lines.push(
      'Credibility hooks:',
      ...f.credibilityHooks.map((x) => `  - ${x}`),
      '',
    );
  }
  if (f.recencySignals.length > 0) {
    lines.push(
      'Recency signals:',
      ...f.recencySignals.map((x) => `  - ${x}`),
    );
  }

  return lines.join('\n').trimEnd();
}

function formatVocabularySelection(v: VocabularySelection): string {
  const lines: string[] = [
    `Use: [${v.powerWords.join(', ')}]`,
    `Avoid: [${v.avoidWords.join(', ')}]`,
  ];
  if (v.industryTerms.length > 0) {
    lines.push(`Industry terms: [${v.industryTerms.join(', ')}]`);
  }
  if (v.toneMarkers.length > 0) {
    lines.push(`Tone markers: [${v.toneMarkers.join(', ')}]`);
  }
  if (v.signaturePhrases.length > 0) {
    lines.push(`Signature phrases: [${v.signaturePhrases.join(', ')}]`);
  }
  return lines.join('\n');
}

function formatHookOptions(h: HookOptions): string {
  const lines: string[] = [`Recommended hook index: ${h.recommendedIndex}`, ''];
  h.hooks.forEach((hook, i) => {
    lines.push(
      `Hook ${i} [${hook.type}] (stop-rate: ${hook.estimatedStopRate}):`,
      `  Text: ${hook.text}`,
      `  Rationale: ${hook.rationale}`,
    );
    if (i < h.hooks.length - 1) lines.push('');
  });
  return lines.join('\n');
}

function formatNarrativeBlueprint(b: NarrativeBlueprint): string {
  const lines: string[] = [
    `Arc: ${b.arc}`,
    `Target word count: ${b.targetWordCount}`,
    `Selected hook [${b.selectedHook.type}]: ${b.selectedHook.text}`,
    '',
    'Sections:',
    ...b.sections.map(
      (s) => `  [${s.name}] ${s.purpose}\n    Guidance: ${s.guidanceForWriter}`,
    ),
    '',
    `CTA (${b.ctaType}): ${b.ctaText}`,
  ];
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Importance ordering
// ─────────────────────────────────────────────────────────────

const IMPORTANCE_ORDER: Record<ImportanceLevel, number> = {
  critical:   0,
  important:  1,
  supporting: 2,
  background: 3,
  off:        4,
};

function renderSection(section: BriefSection): string {
  switch (section.importance) {
    case 'critical':
      return `## PRIMARY DIRECTIVE: ${section.label}\n${section.content}`;
    case 'important':
      return `## KEY CONTEXT: ${section.label}\n${section.content}`;
    case 'supporting':
      return `## Supporting Context: ${section.label}\n${section.content}`;
    case 'background':
      // One-line summary: truncate at first newline
      return `[Background: ${section.label}] ${section.content.split('\n')[0]}`;
    default:
      return '';
  }
}

// ─────────────────────────────────────────────────────────────
// Main builder
// ─────────────────────────────────────────────────────────────

/**
 * Assembles a deterministic generation brief string from the accumulated
 * workflow context. No LLM call is made — this is pure data formatting.
 */
export function buildGenerationBrief(context: Readonly<WorkflowContext>): string {
  const { outputs, importanceMap } = context;

  const sections: BriefSection[] = [];

  /** Helper to conditionally push a formatted section. */
  function addSection(
    nodeId: string,
    label: string,
    content: string | null,
  ): void {
    const importance: ImportanceLevel = importanceMap[nodeId] ?? 'supporting';
    if (importance === 'off' || content === null) return;
    sections.push({ label, importance, content });
  }

  // Map each output slot to its label, nodeId, and formatted content
  if (outputs.psychologyAnalysis !== null) {
    addSection(
      'psychology-analyzer',
      'Audience Psychology',
      formatPsychologyAnalysis(outputs.psychologyAnalysis),
    );
  }

  if (outputs.researchFindings !== null) {
    addSection(
      'research-context',
      'Research & Facts',
      formatResearchFindings(outputs.researchFindings),
    );
  }

  if (outputs.vocabularySelection !== null) {
    addSection(
      'vocabulary-selector',
      'Vocabulary & Tone',
      formatVocabularySelection(outputs.vocabularySelection),
    );
  }

  if (outputs.hookOptions !== null) {
    addSection(
      'hook-designer',
      'Hook Options',
      formatHookOptions(outputs.hookOptions),
    );
  }

  if (outputs.narrativeBlueprint !== null) {
    addSection(
      'narrative-arc',
      'Narrative Blueprint',
      formatNarrativeBlueprint(outputs.narrativeBlueprint),
    );
  }

  // Sort by importance order
  sections.sort(
    (a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance],
  );

  const parts: string[] = sections.map(renderSection).filter(Boolean);

  // ── Always-appended blocks ─────────────────────────────────

  const cc = context.channelConstraints;
  parts.push(
    [
      '## Channel Constraints',
      `Platform: ${cc.channel}`,
      `Word range: ${cc.targetWordRange.min}–${cc.targetWordRange.max} words`,
      `Format notes: ${cc.formatNotes}`,
      `Platform contract: ${cc.platformContract}`,
    ].join('\n'),
  );

  parts.push(
    [
      '## Author Profile',
      context.authorProfile,
    ].join('\n'),
  );

  parts.push(
    [
      '## Generation Rules',
      context.generationRules,
    ].join('\n'),
  );

  if (context.generationInstruction) {
    parts.push(
      [
        '## Generation Instruction',
        context.generationInstruction,
      ].join('\n'),
    );
  }

  return parts.join('\n\n');
}
