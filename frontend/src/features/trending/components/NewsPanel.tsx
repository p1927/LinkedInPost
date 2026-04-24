import { NewsCard } from './NewsCard';
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
    <div className="space-y-2">
      {articles.slice(0, 12).map((article) => (
        <NewsCard
          key={article.id}
          title={article.title}
          source={article.source}
          publishedAt={article.publishedAt}
          url={article.url}
          imageUrl={article.imageUrl}
          description={article.description}
        />
      ))}
    </div>
  );
}
