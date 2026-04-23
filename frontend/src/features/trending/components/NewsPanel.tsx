import type { NewsArticle } from '../types';

interface Props {
  articles: NewsArticle[];
}

export function NewsPanel({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        No news articles found for this topic
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.slice(0, 8).map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex gap-3 bg-secondary rounded-lg p-3 hover:ring-2 hover:ring-blue-500/50 transition-all"
        >
          {article.imageUrl && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-ink text-sm font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">
              {article.title}
            </h4>
            <p className="text-xs text-muted mt-1 line-clamp-2">{article.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted">
              <span className="text-blue-600">{article.source}</span>
              <span>•</span>
              <span>{article.publishedAt}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
