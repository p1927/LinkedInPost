import type { Env, ImageCandidate } from '../../types';

interface SerpApiImageResult {
  original?: string;
  thumbnail?: string;
  title?: string;
}

interface SerpApiImageResponse {
  images_results?: SerpApiImageResult[];
}

/**
 * Search for images using SerpAPI Google Images engine.
 * Returns empty array if SERPAPI_API_KEY is not configured or keywords are empty.
 * Fetches top 2 keywords in parallel, returning up to 3 images per keyword.
 */
export async function searchImagesForVariant(
  keywords: string[],
  visualBrief: string,
  variantIndex: number,
  env: Env,
): Promise<ImageCandidate[]> {
  if (!env.SERPAPI_API_KEY || keywords.length === 0) {
    return [];
  }

  const topKeywords = keywords.slice(0, 2);

  const settled = await Promise.allSettled(
    topKeywords.map((kw) => {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_images');
      url.searchParams.set('q', kw);
      url.searchParams.set('num', '5');
      url.searchParams.set('safe', 'active');
      url.searchParams.set('api_key', env.SERPAPI_API_KEY!);
      return fetch(url.toString())
        .then((r) => r.json() as Promise<SerpApiImageResponse>)
        .then((data) => ({ keyword: kw, images: data.images_results ?? [] }));
    }),
  );

  const candidates: ImageCandidate[] = [];
  let idx = 0;

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const { keyword, images } = result.value;
    for (const img of images.slice(0, 3)) {
      const url = img.original ?? img.thumbnail;
      if (!url) continue;
      candidates.push({
        id: `search-${variantIndex}-${idx}`,
        url,
        searchQuery: keyword,
        visualBrief,
        score: 0.85 - idx * 0.03,
        variantIndex,
      });
      idx += 1;
    }
  }

  return candidates;
}
