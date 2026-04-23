import { Play } from 'lucide-react';
import type { YouTubeVideo } from '../types';

interface Props {
  videos: YouTubeVideo[];
}

export function YouTubePanel({ videos }: Props) {
  if (videos.length === 0) {
    return (
      <div className="text-center text-muted py-8">
        No YouTube videos found for this topic
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {videos.slice(0, 6).map((video) => (
        <a
          key={video.id}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500/50 transition-all"
        >
          <div className="relative aspect-video bg-tertiary">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Play className="text-red-500" size={32} />
              </div>
            )}
          </div>
          <div className="p-3">
            <h4 className="text-ink text-sm font-medium line-clamp-2 group-hover:text-red-600 transition-colors">
              {video.title}
            </h4>
            <p className="text-xs text-muted mt-1">{video.channelTitle}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted">
              <span>{video.viewCount} views</span>
              <span>•</span>
              <span>{video.publishedAt}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
