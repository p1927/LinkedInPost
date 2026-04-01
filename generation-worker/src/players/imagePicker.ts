import type { Env, ImageCandidate } from '../types';
import type { ImageRelatorOutput } from './imageRelator';
import type { ImageGenProvider } from '../modules/image-generation/index';
import { generateImagesForVariant } from '../modules/image-generation/index';
import { searchImagesForVariant } from '../modules/image-search/index';

export interface ImageGenConfig {
  provider?: ImageGenProvider;
  model?: string;
}

export async function buildCandidatesFromRelator(
  relator: ImageRelatorOutput,
  variantIndex: number,
  env: Env,
  imageGenConfig?: ImageGenConfig,
): Promise<ImageCandidate[]> {
  const vIdx = variantIndex ?? 0;

  const [generated, searched] = await Promise.all([
    generateImagesForVariant(relator.genPrompts, relator.visualBrief, vIdx, env, imageGenConfig ?? {}),
    searchImagesForVariant(relator.searchKeywords, relator.visualBrief, vIdx, env),
  ]);

  const combined = [...generated, ...searched];

  if (combined.length === 0) {
    relator.searchKeywords.forEach((kw, i) => {
      combined.push({
        id: `stub-${vIdx}-${i}`,
        searchQuery: kw,
        visualBrief: relator.visualBrief,
        score: 1 - i * 0.05,
        variantIndex: vIdx,
      });
    });
    relator.genPrompts.forEach((prompt, i) => {
      combined.push({
        id: `gen-stub-${vIdx}-${i}`,
        generationPrompt: prompt,
        visualBrief: relator.visualBrief,
        score: 0.9 - i * 0.05,
        variantIndex: vIdx,
      });
    });
  }

  return rankCandidates(combined);
}

export function rankCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}
