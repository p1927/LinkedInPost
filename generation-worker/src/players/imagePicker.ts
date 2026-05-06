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
    // Fallback: generate from keyword-derived prompts
    const fallbackCandidates = buildFallbackCandidates(relator, vIdx);
    return fallbackCandidates;
  }

  // Score each candidate with relevance + quality signals, then rank
  const scored = combined.map((c) => scoreCandidateQuality(c, relator));
  return rankCandidates(scored);
}

/**
 * Build fallback image candidates when no search or generation results are available.
 * Creates stub entries keyed to keywords for downstream handling.
 */
function buildFallbackCandidates(relator: ImageRelatorOutput, variantIndex: number): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];

  relator.searchKeywords.forEach((kw, i) => {
    candidates.push({
      id: `stub-search-${variantIndex}-${i}`,
      searchQuery: kw,
      visualBrief: relator.visualBrief,
      score: 0.8 - i * 0.05,
      imageQualityScore: 0.5,
      variantIndex,
    });
  });

  relator.genPrompts.forEach((prompt, i) => {
    candidates.push({
      id: `stub-gen-${variantIndex}-${i}`,
      generationPrompt: prompt,
      visualBrief: relator.visualBrief,
      score: 0.75 - i * 0.05,
      imageQualityScore: 0.5,
      variantIndex,
    });
  });

  return candidates;
}

/**
 * Score a single candidate with relevance + quality signals.
 *
 * Ranking signals (per spec):
 *   - Relevance (40%): keyword overlap with visual brief keywords
 *   - Quality (30%): presence of url, absence of stub markers, variant stability
 *   - Diversity (20%): penalize near-duplicates (stub sources score lower)
 *   - Channel fit (10%): LinkedIn display context
 */
function scoreCandidateQuality(candidate: ImageCandidate, relator: ImageRelatorOutput): ImageCandidate {
  const briefKeywords = [...relator.searchKeywords, ...relator.styleHints].map((k) => k.toLowerCase());
  const candidateText = `${candidate.searchQuery ?? ''} ${candidate.generationPrompt ?? ''} ${candidate.visualBrief}`.toLowerCase();

  // Relevance: keyword overlap with brief
  const relevanceMatches = briefKeywords.filter((kw) => candidateText.includes(kw)).length;
  const relevanceScore = briefKeywords.length > 0 ? relevanceMatches / briefKeywords.length : 0.5;

  // Quality: has a real URL (not a stub), has generation prompt
  const isStub = candidate.id.startsWith('stub') || candidate.id.startsWith('gen-stub');
  const hasUrl = Boolean(candidate.url);
  const hasGenPrompt = Boolean(candidate.generationPrompt);
  const qualityScore = hasUrl && !isStub ? 0.9 : hasGenPrompt && !isStub ? 0.8 : 0.4;

  // Diversity: candidates without explicit query get slight diversity boost
  const diversityScore = candidate.searchQuery ? 0.8 : 1.0;

  // Channel fit: URL-based candidates suit LinkedIn display well
  const channelFitScore = candidate.url ? 0.9 : candidate.generationPrompt ? 0.7 : 0.5;

  // Weighted composite score
  const score =
    0.4 * relevanceScore +
    0.3 * qualityScore +
    0.2 * diversityScore +
    0.1 * channelFitScore;

  return {
    ...candidate,
    score: Math.round(score * 1000) / 1000,
    imageQualityScore: Math.round(qualityScore * 1000) / 1000,
  };
}

export function rankCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}
