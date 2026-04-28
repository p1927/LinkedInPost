import { Image, Heart, MessageCircle } from 'lucide-react';
import type { InstagramPost } from '../types';

interface Props { posts: InstagramPost[]; }

export function InstagramPanel({ posts }: Props) {
  if (posts.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No posts found</p>;
  }

  return (
    <div className="space-y-1.5">
      {posts.slice(0, 8).map((post) => (
        <a
          key={post.id}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-pink-50/60 border border-transparent hover:border-pink-100 transition-all cursor-pointer"
        >
          <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-pink-50">
            {post.mediaUrl ? (
              <img src={post.mediaUrl} alt={post.caption.slice(0, 30)} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Image className="text-pink-400" size={16} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink line-clamp-2 leading-snug">{post.caption.slice(0, 100)}</p>
            {post.hashtags.length > 0 && (
              <p className="mt-1 text-[11px] text-pink-600 truncate">
                {post.hashtags.slice(0, 4).join(' ')}
              </p>
            )}
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1"><Heart size={10} /> {post.likeCount ?? 0}</span>
              {post.commentsCount && (
                <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.commentsCount}</span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
