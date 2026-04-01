import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, VocabularySignal } from '../_shared/types';
import domainVocabulariesMd from './knowledge/domain-vocabularies.md';
import vocabularyStrategyMd from './knowledge/vocabulary-strategy.md';

const DEFAULT_SIGNAL: VocabularySignal = {
  industryTerms: ['ship', 'iterate', 'scale', 'impact', 'execution'],
  powerPhrases: ['built in public', 'hard-won lesson', 'here is what changed'],
  avoidWords: ['synergy', 'leverage', 'disrupt', 'paradigm shift'],
  registerLevel: 'professional',
  toneWords: ['direct', 'practical', 'earned', 'clear'],
  jargonBudget: 4,
};

interface LlmVocabularyResponse {
  industryTerms: string[];
  powerPhrases: string[];
  avoidWords: string[];
  registerLevel: string;
  toneWords: string[];
  jargonBudget: number;
}

export const vocabularyModule: EnrichmentModule<VocabularySignal> = {
  name: 'vocabulary',

  async enrich(ctx: ModuleContext): Promise<VocabularySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return DEFAULT_SIGNAL;
    }

    const knowledgeContext = buildKnowledgeContext({
      'Domain Vocabularies': domainVocabulariesMd,
      'Vocabulary Strategy': vocabularyStrategyMd,
    });

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}
Language Style: ${ctx.persona.language}
Concerns: ${ctx.persona.concerns.join(', ')}
Current Focus: ${ctx.persona.currentFocus}`
      : 'Persona: not specified';

    const prompt = `You are an expert content strategist specializing in vocabulary and language calibration. Using the knowledge below, select the optimal vocabulary strategy for the given content.

${knowledgeContext}

---

CONTENT PARAMETERS:
Topic: ${ctx.topic}
Channel: ${ctx.channel}
${personaContext}

Based on the domain vocabularies and vocabulary strategy knowledge above, return a JSON object with this exact shape:
{
  "industryTerms": ["<5-8 field-specific terms from the persona's domain>"],
  "powerPhrases": ["<3-5 impactful phrases suited to the topic and persona>"],
  "avoidWords": ["<3-6 words that would alienate or ring false for this persona>"],
  "registerLevel": "<one of: casual | professional | technical | executive>",
  "toneWords": ["<3-5 words that set the right tone for this persona and channel>"],
  "jargonBudget": <integer 0-10>
}

Select vocabulary that is:
- Drawn from the persona's actual professional domain
- Calibrated to the channel's register norms
- Authentically insider without alienating near-domain readers
- Avoiding the overused buzzwords flagged in the strategy guide`;

    try {
      const result = await generateLlmParsedJson<LlmVocabularyResponse>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 500,
      });

      return {
        industryTerms: Array.isArray(result.industryTerms) && result.industryTerms.length > 0
          ? result.industryTerms
          : DEFAULT_SIGNAL.industryTerms,
        powerPhrases: Array.isArray(result.powerPhrases) && result.powerPhrases.length > 0
          ? result.powerPhrases
          : DEFAULT_SIGNAL.powerPhrases,
        avoidWords: Array.isArray(result.avoidWords) && result.avoidWords.length > 0
          ? result.avoidWords
          : DEFAULT_SIGNAL.avoidWords,
        registerLevel: typeof result.registerLevel === 'string' && result.registerLevel.trim()
          ? result.registerLevel.trim()
          : DEFAULT_SIGNAL.registerLevel,
        toneWords: Array.isArray(result.toneWords) && result.toneWords.length > 0
          ? result.toneWords
          : DEFAULT_SIGNAL.toneWords,
        jargonBudget: typeof result.jargonBudget === 'number' && result.jargonBudget >= 0 && result.jargonBudget <= 10
          ? Math.round(result.jargonBudget)
          : DEFAULT_SIGNAL.jargonBudget,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
