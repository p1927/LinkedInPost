import type { ResearchArticle } from '../types';

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
}

function firstTagContent(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return stripCdata(m[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRss2Items(xml: string, defaultSource: string): ResearchArticle[] {
  const out: ResearchArticle[] = [];
  const channelTitle = firstTagContent(xml.split(/<item\b/i)[0] || xml, 'title') || defaultSource;
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = firstTagContent(block, 'title');
    let url = firstTagContent(block, 'link');
    if (!url) {
      const guid = firstTagContent(block, 'guid');
      if (guid.startsWith('http')) url = guid;
    }
    if (!title || !url) continue;
    const pub = firstTagContent(block, 'pubDate') || firstTagContent(block, 'dc:date');
    let publishedAt = pub;
    const parsed = Date.parse(pub);
    if (!Number.isNaN(parsed)) {
      publishedAt = new Date(parsed).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }
    const snippet = firstTagContent(block, 'description') || firstTagContent(block, 'summary');
    out.push({
      title,
      url,
      source: channelTitle,
      publishedAt,
      snippet,
      provider: 'rss',
    });
  }
  return out;
}

function parseAtomEntries(xml: string, defaultSource: string): ResearchArticle[] {
  const out: ResearchArticle[] = [];
  const feedTitle = firstTagContent(xml.split(/<entry\b/i)[0] || xml, 'title') || defaultSource;
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = firstTagContent(block, 'title');
    const linkMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const url = linkMatch?.[1]?.trim() || firstTagContent(block, 'id');
    if (!title || !url) continue;
    const pub = firstTagContent(block, 'updated') || firstTagContent(block, 'published');
    let publishedAt = pub;
    const parsed = Date.parse(pub);
    if (!Number.isNaN(parsed)) {
      publishedAt = new Date(parsed).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }
    const snippet = firstTagContent(block, 'summary') || firstTagContent(block, 'content');
    out.push({
      title,
      url,
      source: feedTitle,
      publishedAt,
      snippet,
      provider: 'rss',
    });
  }
  return out;
}

export async function fetchRssFeed(feedUrl: string, label: string): Promise<ResearchArticle[]> {
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'LinkedInPostBot/1.0 (researcher)' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`RSS HTTP ${res.status}`);
  }
  const xml = await res.text();
  const lower = xml.slice(0, 800).toLowerCase();
  if (lower.includes('<feed') && lower.includes('xmlns="http://www.w3.org/2005/atom"')) {
    return parseAtomEntries(xml, label);
  }
  return parseRss2Items(xml, label);
}
