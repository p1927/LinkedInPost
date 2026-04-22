import type { LinkedInPost } from '../types';

interface Props {
  posts: LinkedInPost[];
  loading?: boolean;
}

export function LinkedInPanel({ posts, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        No LinkedIn posts found for this topic
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.slice(0, 10).map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-secondary rounded-lg p-4 hover:ring-2 hover:ring-blue-500/50 transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {post.authorName && (
                  <span className="text-sm font-semibold text-ink">{post.authorName}</span>
                )}
                {post.authorHeadline && (
                  <span className="text-xs text-muted truncate">{post.authorHeadline}</span>
                )}
              </div>
              <p className="text-sm text-ink mt-1 line-clamp-3">{post.title}</p>
              {post.hashtags && post.hashtags.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  {post.hashtags.slice(0, 5).join(' ')}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                {post.likeCount && <span>♥ {post.likeCount}</span>}
                {post.commentsCount && <span>💬 {post.commentsCount}</span>}
                <span>{post.publishedAt}</span>
              </div>
            </div>
            {post.thumbnailUrl && (
              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
