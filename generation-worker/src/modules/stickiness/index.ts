import type { EnrichmentModule, ModuleContext, StickinessSignal } from '../_shared/types';

export { default as successFramework } from './knowledge/success-framework.md';

const DEFAULT_SIGNAL: StickinessSignal = {
  simpleScore: 0,
  unexpectedScore: 0,
  concreteScore: 0,
  credibleScore: 0,
  emotionalScore: 0,
  storyScore: 0,
  totalScore: 0,
  weakestDimension: '',
  improvementHint: '',
};

export const stickinessModule: EnrichmentModule<StickinessSignal> = {
  name: 'stickiness',

  async enrich(_ctx: ModuleContext): Promise<StickinessSignal> {
    // Actual SUCCESs scoring happens post-creation in the Selector,
    // which scores real generated text against the framework.
    // This module returns defaults so the pipeline can run without blocking.
    return DEFAULT_SIGNAL;
  },
};
