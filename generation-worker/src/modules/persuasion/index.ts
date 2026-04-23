import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PersuasionSignal } from '../_shared/types';
import frameworksMd from './knowledge/frameworks.md';
import salesPsychologyMd from './knowledge/sales-psychology.md';

const DEFAULT_SIGNAL: PersuasionSignal = {
  framework: 'PAS',
  frameworkSteps: ['Problem', 'Agitate', 'Solve'],
  principles: ['social proof'],
  objectionPreempt: 'acknowledge the common doubt directly',
  proofType: 'personal',
};

export const persuasionModule: EnrichmentModule<PersuasionSignal> = {
  name: 'persuasion',

  async enrich(ctx: ModuleContext): Promise<PersuasionSignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledge = buildKnowledgeContext({
      'Persuasion Frameworks': frameworksMd,
      'Sales Psychology': salesPsychologyMd,
    });

    const prompt = `You are a persuasion strategist selecting the optimal framework and psychological levers for a LinkedIn post.

${knowledge}

## Content Brief
Topic: ${ctx.topic}
Channel: ${ctx.channel}
Pattern: ${ctx.pattern.id}
Audience: ${ctx.report.audience ?? 'general professional'}

## Task
Select the persuasion approach that will make this content most compelling and credible for this specific audience.

Respond with ONLY valid JSON matching this exact shape:
{
  "framework": "<one of: AIDA | PAS | BAB | 4Ps | Monroe>",
  "frameworkSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "principles": ["<principle 1>", "<principle 2>"],
  "objectionPreempt": "<single sentence describing the main objection to address proactively>",
  "proofType": "<one of: data | social | authority | analogical | personal>"
}`;

    try {
      const result = await generateLlmParsedJson<PersuasionSignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 2000,
      });

      return {
        framework: result.framework ?? DEFAULT_SIGNAL.framework,
        frameworkSteps: Array.isArray(result.frameworkSteps) && result.frameworkSteps.length > 0
          ? result.frameworkSteps
          : DEFAULT_SIGNAL.frameworkSteps,
        principles: Array.isArray(result.principles) && result.principles.length > 0
          ? result.principles
          : DEFAULT_SIGNAL.principles,
        objectionPreempt: result.objectionPreempt ?? DEFAULT_SIGNAL.objectionPreempt,
        proofType: result.proofType ?? DEFAULT_SIGNAL.proofType,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
