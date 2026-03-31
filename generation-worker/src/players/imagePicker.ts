import type { ImageCandidate } from '../types';
import type { ImageRelatorOutput } from './imageRelator';

/**
 * Given a relator output (keywords + brief), build synthetic image candidates
 * from the search keyword lines. In production the caller would fetch actual
 * image results and pass them here; this function also handles scoring/ranking.
 */
export function buildCandidatesFromRelator(relator: ImageRelatorOutput): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  relator.searchKeywords.forEach((kw, i) => {
    candidates.push({
      id: `search-${i}`,
      searchQuery: kw,
      visualBrief: relator.visualBrief,
      score: 1 - i * 0.05, // slight decay for lower-ranked keywords
    });
  });

  relator.genPrompts.forEach((prompt, i) => {
    candidates.push({
      id: `gen-${i}`,
      generationPrompt: prompt,
      visualBrief: relator.visualBrief,
      score: 0.9 - i * 0.05,
    });
  });

  return rankCandidates(candidates);
}

export function rankCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}
