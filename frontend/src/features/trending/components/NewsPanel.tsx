import { Newspaper, ExternalLink } from 'lucide-react';
import type { NewsArticle } from '../types';

interface Props { articles: NewsArticle[]; }

export function NewsPanel({ articles }: Props) {
  if (articles.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No articles found</p>;
  }

  return (
    <div className="space-y-1.5">
      {articles.slice(0, 10).map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-blue-50/40 border border-transparent hover:border-blue-100 transition-all cursor-pointer"
        >
          <div className="shrink-0 w-14 h-10 rounded-lg overflow-hidden bg-blue-50 flex items-center justify-center">
            {article.imageUrl ? (
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
            ) : (
              <Newspaper size={14} className="text-blue-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink line-clamp-2 leading-snug group-hover:text-blue-800">
              {article.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
              <span className="font-medium">{article.source}</span>
              {article.publishedAt && <><span>·</span><span>{article.publishedAt}</span></>}
              <ExternalLink size={9} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
