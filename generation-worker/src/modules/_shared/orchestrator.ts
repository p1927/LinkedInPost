import type { LlmRef } from '../../llmFromWorker';
import type { Env, Pattern, RequirementReport } from '../../types';
import type { EnrichmentBundle, ModuleContext } from './types';

import { personaModule } from '../persona/index';
import { emotionModule } from '../emotion/index';
import { psychologyDeepModule } from '../psychology-deep/index';
import { persuasionModule } from '../persuasion/index';
import { copywritingModule } from '../copywriting/index';
import { storytellingModule } from '../storytelling/index';
import { typographyModule } from '../typography/index';
import { buildColorSignal } from '../color-emotion/index';
import { imageStrategyModule } from '../image-strategy/index';
import { vocabularyModule } from '../vocabulary/index';
import { trendingModule } from '../trending/index';

export async function runEnrichment(
  report: RequirementReport,
  pattern: Pattern,
  env: Env,
  llmRef: LlmRef,
): Promise<EnrichmentBundle> {
  // Phase 1: Persona (must run first — all other modules depend on it)
  const baseCtx: ModuleContext = {
    report,
    persona: null,
    pattern,
    channel: report.channel,
    topic: report.topic,
    env,
    llmRef,
  };

  const persona = await personaModule.enrich(baseCtx);

  // Phase 2: Run 7 enrichment modules in parallel (all get persona context)
  const ctxWithPersona: ModuleContext = { ...baseCtx, persona };

  const [emotion, psychology, persuasion, copy, story, typography, imageStrategy, vocabulary, trending] = await Promise.all([
    emotionModule.enrich(ctxWithPersona),
    psychologyDeepModule.enrich(ctxWithPersona),
    persuasionModule.enrich(ctxWithPersona),
    copywritingModule.enrich(ctxWithPersona),
    storytellingModule.enrich(ctxWithPersona),
    typographyModule.enrich(ctxWithPersona),
    imageStrategyModule.enrich(ctxWithPersona),
    vocabularyModule.enrich(ctxWithPersona),
    trendingModule.enrich(ctxWithPersona),
  ]);

  // Phase 3: Color-emotion (pure logic, depends on EmotionSignal)
  const color = buildColorSignal(emotion);

  return {
    persona,
    emotion,
    psychology,
    persuasion,
    copy,
    story,
    typography,
    color,
    imageStrategy,
    vocabulary,
    trending,
  };
}
