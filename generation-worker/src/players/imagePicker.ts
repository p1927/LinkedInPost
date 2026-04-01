import type { ImageCandidate } from '../types';
import type { ImageRelatorOutput } from './imageRelator';

/**
 * Given a relator output (keywords + brief), build synthetic image candidates
 * from the search keyword lines. In production the caller would fetch actual
 * image results and pass them here; this function also handles scoring/ranking.
 */
export function buildCandidatesFromRelator(relator: ImageRelatorOutput, variantIndex?: number): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const vIdx = variantIndex ?? 0;

  relator.searchKeywords.forEach((kw, i) => {
    candidates.push({
      id: `search-${vIdx}-${i}`,
      searchQuery: kw,
      visualBrief: relator.visualBrief,
      score: 1 - i * 0.05, // slight decay for lower-ranked keywords
      variantIndex: vIdx,
    });
  });

  relator.genPrompts.forEach((prompt, i) => {
    candidates.push({
      id: `gen-${vIdx}-${i}`,
      generationPrompt: prompt,
      visualBrief: relator.visualBrief,
      score: 0.9 - i * 0.05,
      variantIndex: vIdx,
    });
  });

  return rankCandidates(candidates);
}

export function rankCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}
