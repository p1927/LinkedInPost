import type { LlmRef } from '../../llmFromWorker';
import type { Env, Pattern, RequirementReport } from '../../types';
import type { NodeRunRecord } from '../../types';
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

export interface EnrichmentResult {
  bundle: EnrichmentBundle;
  records: NodeRunRecord[];
}

async function timeModule<T>(
  nodeId: string,
  model: string,
  inputJson: string,
  fn: () => Promise<T>,
  records: NodeRunRecord[],
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    records.push({
      nodeId,
      inputJson,
      outputJson: JSON.stringify(result),
      model,
      durationMs: Date.now() - start,
      status: 'completed',
    });
    return result;
  } catch (e) {
    records.push({
      nodeId,
      inputJson,
      outputJson: '{}',
      model,
      durationMs: Date.now() - start,
      status: 'failed',
      error: String(e),
    });
    throw e;
  }
}

export async function runEnrichment(
  report: RequirementReport,
  pattern: Pattern,
  env: Env,
  llmRef: LlmRef,
): Promise<EnrichmentResult> {
  const records: NodeRunRecord[] = [];
  const model = `${llmRef.provider}/${llmRef.model}`;

  const baseCtx: ModuleContext = {
    report,
    persona: null,
    pattern,
    channel: report.channel,
    topic: report.topic,
    env,
    llmRef,
  };

  // Phase 1: Persona (must run first — all other modules depend on it)
  const personaInput = JSON.stringify({
    topic: report.topic,
    channel: report.channel,
    audience: report.audience,
    tone: report.tone,
    jtbd: report.jtbd,
  });

  const persona = await timeModule(
    'enrichment_persona',
    model,
    personaInput,
    () => personaModule.enrich(baseCtx),
    records,
  );

  // Phase 2: Run 9 enrichment modules in parallel (all get persona context)
  const ctxWithPersona: ModuleContext = { ...baseCtx, persona };

  const sharedInput = JSON.stringify({
    topic: report.topic,
    channel: report.channel,
    audience: report.audience,
    persona: { name: persona.name, currentFocus: persona.currentFocus, language: persona.language },
  });

  const [emotion, psychology, persuasion, copy, story, typography, imageStrategy, vocabulary, trending] =
    await Promise.all([
      timeModule('enrichment_emotion',         model, sharedInput, () => emotionModule.enrich(ctxWithPersona),        records),
      timeModule('enrichment_psychology',      model, sharedInput, () => psychologyDeepModule.enrich(ctxWithPersona), records),
      timeModule('enrichment_persuasion',      model, sharedInput, () => persuasionModule.enrich(ctxWithPersona),     records),
      timeModule('enrichment_copywriting',     model, sharedInput, () => copywritingModule.enrich(ctxWithPersona),    records),
      timeModule('enrichment_storytelling',    model, sharedInput, () => storytellingModule.enrich(ctxWithPersona),   records),
      timeModule('enrichment_typography',      model, sharedInput, () => typographyModule.enrich(ctxWithPersona),     records),
      timeModule('enrichment_image_strategy',  model, sharedInput, () => imageStrategyModule.enrich(ctxWithPersona),  records),
      timeModule('enrichment_vocabulary',      model, sharedInput, () => vocabularyModule.enrich(ctxWithPersona),     records),
      timeModule('enrichment_trending',        model, sharedInput, () => trendingModule.enrich(ctxWithPersona),       records),
    ]);

  // Phase 3: Color-emotion (pure logic, no LLM call — not logged)
  const color = buildColorSignal(emotion);

  return {
    bundle: { persona, emotion, psychology, persuasion, copy, story, typography, color, imageStrategy, vocabulary, trending },
    records,
  };
}
