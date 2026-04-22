import { Image } from 'lucide-react';
import type { InstagramPost } from '../types';

interface Props {
  posts: InstagramPost[];
}

export function InstagramPanel({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        No Instagram posts found for this topic
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {posts.slice(0, 9).map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-500/50 transition-all"
        >
          <div className="relative aspect-square bg-tertiary">
            {post.mediaUrl ? (
              <img
                src={post.mediaUrl}
                alt={post.caption.slice(0, 50)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Image className="text-pink-500" size={32} />
              </div>
            )}
          </div>
          <div className="p-2">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>♥ {post.likeCount}</span>
              {post.commentsCount && <span>💬 {post.commentsCount}</span>}
            </div>
            <p className="text-xs text-ink mt-1 line-clamp-2">{post.caption.slice(0, 80)}</p>
            {post.hashtags.length > 0 && (
              <p className="text-xs text-pink-600 mt-1 truncate">
                {post.hashtags.slice(0, 3).join(' ')}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
