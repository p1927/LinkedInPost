export type ContentReviewVerdict = 'pass' | 'flag' | 'block';
export type ContentReviewNewsMode = 'existing' | 'fresh';

export interface ImageReviewResult {
  imageUrl: string;
  visibleText: string;
  keyElements: string;
  meaning: string;
  relevant: boolean;
  verdict: ContentReviewVerdict;
}

export interface TextReviewResult {
  guardrailsOk: boolean;
  doubleMeanings: string[];
  severityTier: 'none' | 'low' | 'medium' | 'high';
  summary: string;
  verdict: ContentReviewVerdict;
}

export interface ContentReviewReport {
  fingerprint: string;
  reviewedAt: string;
  textResult: TextReviewResult;
  imageResults: ImageReviewResult[];
  newsModeUsed: ContentReviewNewsMode | null;
  newsSnippet: string | null;
  overallVerdict: ContentReviewVerdict;
}

export interface ContentReviewConfig {
  textModelId: string;
  visionModelId: string;
  newsMode: ContentReviewNewsMode;
  maxImages: number;
}

export const DEFAULT_CONTENT_REVIEW_CONFIG: ContentReviewConfig = {
  textModelId: 'gemini-2.5-flash',
  visionModelId: 'gemini-2.5-flash',
  newsMode: 'existing',
  maxImages: 3,
};
