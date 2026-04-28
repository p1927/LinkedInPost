import { Play, Eye, Clock } from 'lucide-react';
import type { YouTubeVideo } from '../types';

interface Props { videos: YouTubeVideo[]; }

export function YouTubePanel({ videos }: Props) {
  if (videos.length === 0) {
    return <p className="py-4 text-center text-xs text-muted">No videos found</p>;
  }

  return (
    <div className="space-y-1.5">
      {videos.slice(0, 8).map((video) => (
        <a
          key={video.id}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-red-50/60 border border-transparent hover:border-red-100 transition-all cursor-pointer"
        >
          <div className="relative shrink-0 w-20 h-12 rounded-lg overflow-hidden bg-red-50">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Play className="text-red-400" size={18} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink line-clamp-2 group-hover:text-red-700 leading-snug">
              {video.title}
            </p>
            <p className="mt-1 text-[11px] text-muted truncate">{video.channelTitle}</p>
            <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted">
              {video.viewCount && (
                <span className="flex items-center gap-1">
                  <Eye size={10} />
                  {video.viewCount}
                </span>
              )}
              {video.publishedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {video.publishedAt}
                </span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
