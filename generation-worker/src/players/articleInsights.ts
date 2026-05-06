import type { ResearchArticleRef } from '@linkedinpost/researcher';

export interface ArticleInsights {
  mainTakeaway: string;
  surprisingFact: string;
  expertQuote: string;
  dataPoint: string;
  hashtags: string[];
}

const HASHTAG_MAX_CHARS = 25;
const MIN_WORD_LEN = 3;

function extractKeyPhrases(text: string): string[] {
  // Strip punctuation and split into words
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/);
  // Filter stopwords and short words
  const stopwords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'are', 'was', 'were', 'been',
    'have', 'has', 'had', 'not', 'but', 'from', 'they', 'will', 'would', 'can',
    'all', 'its', 'also', 'more', 'their', 'what', 'when', 'who', 'how', 'than',
    'into', 'just', 'over', 'such', 'your', 'our', 'out', 'about', 'there',
    'which', 'after', 'before', 'other', 'some', 'these', 'then', 'only',
    'very', 'even', 'most', 'very', 'much', 'any', 'while', 'because',
    'between', 'each', 'every', 'both', 'same', 'any', 'many', 'most',
  ]);
  return [...new Set(words.filter(w => w.length >= MIN_WORD_LEN && !stopwords.has(w)))];
}

function selectHashtags(articles: ResearchArticleRef[], topic: string): string[] {
  const topicWords = new Set(extractKeyPhrases(topic));
  const allPhrases: { phrase: string; score: number }[] = [];

  for (const article of articles) {
    const phrases = extractKeyPhrases(article.snippet || '');
    const titlePhrases = extractKeyPhrases(article.title);
    const topicContext = article.title || '';

    for (const phrase of [...new Set([...phrases, ...titlePhrases])]) {
      if (phrase.length > HASHTAG_MAX_CHARS) continue;
      let score = 1;
      if (topicWords.has(phrase)) score += 3;
      // Boost phrases that appear in titles (more important)
      if (titlePhrases.includes(phrase)) score += 2;
      // Boost multi-word phrases (more specific)
      if (phrase.split(' ').length > 1) score += 1;
      allPhrases.push({ phrase, score });
    }
  }

  // Dedupe by phrase, sum scores, sort by score
  const scoreMap = new Map<string, number>();
  for (const { phrase, score } of allPhrases) {
    scoreMap.set(phrase, (scoreMap.get(phrase) || 0) + score);
  }
  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => '#' + phrase.replace(/\s+/g, ''));

  return sorted.slice(0, 10);
}

function extractMainTakeaway(articles: ResearchArticleRef[]): string {
  if (articles.length === 0) return '';
  const bySnippet = articles.filter(a => a.snippet && a.snippet.length > 80);
  if (bySnippet.length === 0) return articles[0].title;

  // Find article with most specific claim in snippet
  let best = bySnippet[0];
  let bestScore = 0;
  for (const a of bySnippet) {
    // Count numbers and specific terms as proxy for specificity
    const numbers = (a.snippet?.match(/\d+%/g) || []).length +
                    (a.snippet?.match(/\d{4}/g) || []).length +
                    (a.snippet?.match(/\d+x/g) || []).length;
    const score = numbers + (a.snippet?.length > 150 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best.snippet?.slice(0, 300)?.split(/[.!?]/)[0] || best.title;
}

function extractSurprisingFact(articles: ResearchArticleRef[]): string {
  for (const a of articles) {
    const text = a.snippet || '';
    // Look for surprising/contrast patterns
    const surprisingPatterns = [
      /but\s+([^,]+)/gi,
      /however\s+([^,]+)/gi,
      /despite\s+([^,]+)/gi,
      /although\s+([^,]+)/gi,
      /not\s+([^,]+,\s*but)/gi,
      /unlike\s+([^,]+)/gi,
      /surprising/gi,
      /unexpected/gi,
      /contrary/gi,
    ];
    for (const pattern of surprisingPatterns) {
      const m = text.match(pattern);
      if (m && m[1]) return m[1].trim().slice(0, 200);
    }
  }
  // Fallback: first article with a number in the snippet
  for (const a of articles) {
    const m = a.snippet?.match(/\d+%?\s+[^.!?]+/);
    if (m) return m[0].trim().slice(0, 200);
  }
  return articles[0]?.snippet?.slice(0, 200) || '';
}

function extractExpertQuote(articles: ResearchArticleRef[]): string {
  for (const a of articles) {
    const text = a.snippet || '';
    // Look for quoted speech
    const quotes = text.match(/"([^"]{20,200})"/g) ||
                  text.match(/'([^']{20,200})'/g);
    if (quotes && quotes.length > 0) {
      return quotes[0].replace(/['"]/g, '').trim();
    }
    // Look for attribution patterns
    const attributions = [
      /says?\s+([^,.]+)/gi,
      /according to\s+([^,.]+)/gi,
      /stated\s+([^,.]+)/gi,
      /reported\s+([^,.]+)/gi,
    ];
    for (const pattern of attributions) {
      const m = text.match(pattern);
      if (m && m[1]) return m[1].trim().slice(0, 200);
    }
  }
  // Fallback: last article's snippet (often summaries have key quotes)
  const last = articles[articles.length - 1];
  return last?.snippet?.slice(0, 200) || '';
}

function extractDataPoint(articles: ResearchArticleRef[]): string {
  for (const a of articles) {
    const text = a.snippet || '';
    // Look for specific numbers with context
    const patterns = [
      /(\d+%?\s+[^.!?\n]{10,80})/g,
      /(\$\d+\s+[^.!?\n]{10,60})/g,
      /(\d+x\s+[^.!?\n]{10,60})/g,
      /(\d+\s+(users?|companies?|people|employees|years?|days?|hours?|million|billion)\s+[^.!?\n]{5,40})/gi,
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m && m[1]) return m[1].trim().slice(0, 200);
    }
  }
  return '';
}

export interface InsightExtractionResult {
  insights: ArticleInsights;
  hashtags: string[];
  insightSource: string;
}

export function extractArticleInsights(
  articles: ResearchArticleRef[],
  topic: string,
): InsightExtractionResult {
  const hashtags = selectHashtags(articles, topic);
  const insights: ArticleInsights = {
    mainTakeaway: extractMainTakeaway(articles),
    surprisingFact: extractSurprisingFact(articles),
    expertQuote: extractExpertQuote(articles),
    dataPoint: extractDataPoint(articles),
    hashtags,
  };
  const insightSource = articles.length > 0 ? articles[0].source : '';

  return { insights, hashtags, insightSource };
}