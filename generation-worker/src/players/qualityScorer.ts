import type { TextVariant } from '../types';

export interface DimensionScore {
  score: number;       // 0-100
  gaps: string[];
  suggestions: string[];
}

export interface QualityScore {
  clarity: DimensionScore;
  engagement: DimensionScore;
  structure: DimensionScore;
  professionalism: DimensionScore;
  overall: number;
  passed: boolean;
  improvementHints: string[];
}

function scoreDimension(
  text: string,
  positives: string[],
  negatives: string[],
  weight: number,
): DimensionScore {
  const gaps: string[] = [];
  const suggestions: string[] = [];

  for (const neg of negatives) {
    if (text.toLowerCase().includes(neg.toLowerCase())) {
      gaps.push(`Complex language detected: "${neg}"`);
    }
  }

  for (const pos of positives) {
    if (!text.toLowerCase().includes(pos.toLowerCase())) {
      suggestions.push(pos);
    }
  }

  // Compute score: start at 70, deduct for gaps, add for positives matched
  let score = 70;
  score -= Math.min(gaps.length * 8, 30);
  score += Math.min((positives.length - suggestions.length) * 5, 20);
  score = Math.max(0, Math.min(100, score));

  return { score, gaps, suggestions };
}

function analyzeClarity(text: string): DimensionScore {
  const complexTerms = [
    'utilize', 'implement', 'leverage', 'synergy', 'paradigm',
    'actionable', 'streamline', 'optimize', 'facilitate',
    'revolutionary', 'game-changing', 'cutting-edge',
  ];
  const clarityTerms = [
    'simple', 'clear', 'easy', 'straightforward', 'practical',
    'real', 'actually', 'simply', 'basically',
  ];

  const firstPerson = /\b(I|my|me|we|our)\b/i.test(text);
  if (!firstPerson) {
    // Professional posts often use first-person narrative
    return { score: 65, gaps: ['No first-person voice detected'], suggestions: ['Consider using "I" or "we" to add personal perspective'] };
  }

  return scoreDimension(text, clarityTerms, complexTerms, 1.0);
}

function analyzeEngagement(text: string): DimensionScore {
  const hooks = [
    'here\'s', 'the truth is', 'let me tell you', 'story:',
    'mistake', 'surprising', 'unpopular', 'secret',
    'lesson', 'mistake', 'regret', 'wish I had',
  ];
  const ctas = [
    'comment', 'share', 'save', 'tag', 'dm',
    'what do you', 'let me know', 'agree',
  ];

  const hasQuestion = text.includes('?');
  const hasNumber = /\d+/.test(text);
  const hookMatches = hooks.filter(h => text.toLowerCase().includes(h)).length;
  const ctaMatches = ctas.filter(c => text.toLowerCase().includes(c)).length;

  const gaps: string[] = [];
  const suggestions: string[] = [];

  if (!hasQuestion) gaps.push('No question or call-to-action found');
  if (!hasNumber) suggestions.push('Add a number or statistic to boost credibility');
  if (hookMatches === 0) suggestions.push('Use a stronger hook — try "here\'s what most people miss"');
  if (ctaMatches === 0) suggestions.push('End with a question or call-to-action');

  let score = 60;
  score += hookMatches * 8;
  score += ctaMatches * 6;
  score += hasQuestion ? 8 : 0;
  score += hasNumber ? 6 : 0;
  score = Math.max(0, Math.min(100, score));

  return { score, gaps, suggestions };
}

function analyzeStructure(text: string): DimensionScore {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const lines = text.split('\n').filter(l => l.trim());
  const hasEmoji = /[\p{Emoji}]/u.test(text);

  const gaps: string[] = [];
  const suggestions: string[] = [];

  if (paragraphs.length < 2) gaps.push('Only one paragraph — break into logical sections');
  if (lines.every(l => l.length > 150)) gaps.push('All lines are very long — use shorter lines for readability');
  if (!hasEmoji && text.length > 500) suggestions.push('Consider light emoji use for visual breaks');

  // Line length check
  const longLines = lines.filter(l => l.length > 180);
  if (longLines.length > lines.length * 0.5) {
    gaps.push('More than half of lines exceed 180 characters — readability suffers');
  }

  let score = 65;
  score += Math.min(paragraphs.length * 4, 20);
  score -= Math.min(longLines.length * 3, 15);
  score = Math.max(0, Math.min(100, score));

  return { score, gaps, suggestions };
}

function analyzeProfessionalism(text: string): DimensionScore {
  const unprofessional = [
    'lol', 'omg', 'tbh', 'idk', 'btw', 'imo',
    'gonna', 'wanna', 'gotta', 'kinda', 'sorta',
  ];
  const professionalTerms = [
    'insight', 'approach', 'experience', 'perspective',
    'opportunity', 'challenge', 'outcome', 'result',
    'professional', 'industry', 'experience',
  ];

  const hasHashtag = /#\w+/.test(text);
  const hasMention = /@\w+/.test(text);
  const allCapsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;

  const gaps: string[] = [];
  const suggestions: string[] = [];

  for (const term of unprofessional) {
    if (text.toLowerCase().includes(term)) {
      gaps.push(`Informal language: "${term}"`);
    }
  }
  if (allCapsWords > 3) gaps.push(`Too many all-caps words (${allCapsWords}) — sounds unprofessional`);
  if (hasHashtag && text.split('#').length > 6) suggestions.push('Reduce hashtag count to 3-5 maximum');

  return scoreDimension(text, professionalTerms, unprofessional, 1.0);
}

export function scoreDraftQuality(variants: TextVariant[]): QualityScore[] {
  return variants.map(variant => {
    const text = variant.text;

    const clarity = analyzeClarity(text);
    const engagement = analyzeEngagement(text);
    const structure = analyzeStructure(text);
    const professionalism = analyzeProfessionalism(text);

    const overall = Math.round(
      clarity.score * 0.25 +
      engagement.score * 0.35 +
      structure.score * 0.20 +
      professionalism.score * 0.20
    );

    const allGaps = [
      ...clarity.gaps,
      ...engagement.gaps,
      ...structure.gaps,
      ...professionalism.gaps,
    ];
    const allSuggestions = [
      ...clarity.suggestions,
      ...engagement.suggestions,
      ...structure.suggestions,
      ...professionalism.suggestions,
    ];

    return {
      clarity,
      engagement,
      structure,
      professionalism,
      overall,
      passed: overall >= 65 && clarity.score >= 50 && engagement.score >= 50,
      improvementHints: allSuggestions.slice(0, 5),
    };
  });
}