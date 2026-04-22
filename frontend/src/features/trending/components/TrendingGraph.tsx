import { useState } from 'react';
import { BarChart3, ArrowUpDown } from 'lucide-react';
import type { TrendingData, GraphNode } from '../types';

interface Props {
  data: TrendingData;
  onNodeClick: (node: GraphNode) => void;
}

type SortKey = 'engagement' | 'platform' | 'date';
type SortOrder = 'asc' | 'desc';

const PLATFORM_COLORS = {
  youtube: '#ff0000',
  instagram: '#e1306c',
  news: '#3b82f6',
  topic: '#f97316',
};

export function TrendingGraph({ data, onNodeClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('engagement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Build graph nodes from data
  const nodes: GraphNode[] = [
    // YouTube nodes
    ...data.youtube.slice(0, 5).map((video) => ({
      id: `yt-${video.id}`,
      label: video.title.length > 35 ? video.title.slice(0, 35) + '...' : video.title,
      type: 'youtube' as const,
      size: Math.min(80, 30 + parseInt(video.viewCount.replace(/[^0-9]/g, '')) / 10000000),
      color: PLATFORM_COLORS.youtube,
      data: video,
    })),
    // Instagram nodes
    ...data.instagram.slice(0, 5).map((post) => ({
      id: `ig-${post.id}`,
      label: post.caption.length > 35 ? post.caption.slice(0, 35) + '...' : post.caption,
      type: 'instagram' as const,
      size: Math.min(70, 25 + parseInt(post.likeCount.replace(/[^0-9]/g, '')) / 100000),
      color: PLATFORM_COLORS.instagram,
      data: post,
    })),
    // News nodes
    ...data.news.slice(0, 5).map((article) => ({
      id: `news-${article.id}`,
      label: article.title.length > 35 ? article.title.slice(0, 35) + '...' : article.title,
      type: 'news' as const,
      size: 40,
      color: PLATFORM_COLORS.news,
      data: article,
    })),
  ];

  // Sort nodes
  const sortedNodes = [...nodes].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'engagement':
        cmp = a.size - b.size;
        break;
      case 'platform':
        cmp = a.type.localeCompare(b.type);
        break;
      case 'date':
        cmp = 0;
        break;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-primary" size={18} />
          <h3 className="text-ink font-medium">Trending Graph</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleSort('engagement')}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
              sortKey === 'engagement'
                ? 'bg-primary text-primary-fg'
                : 'text-muted hover:text-ink'
            }`}
          >
            Engagement
            <ArrowUpDown size={12} />
          </button>
          <button
            onClick={() => toggleSort('platform')}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
              sortKey === 'platform'
                ? 'bg-primary text-primary-fg'
                : 'text-muted hover:text-ink'
            }`}
          >
            Platform
            <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Simple bar representation */}
        <div className="space-y-2">
          {sortedNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeClick(node)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <div
                className="h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                style={{
                  width: `${Math.max(20, node.size * 2)}px`,
                  backgroundColor: node.color,
                  minWidth: '40px',
                }}
              >
                {node.size.toFixed(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink text-sm truncate">{node.label}</p>
                <p className="text-xs capitalize" style={{ color: node.color }}>
                  {node.type}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: PLATFORM_COLORS.youtube }}
            />
            <span className="text-xs text-muted">YouTube</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: PLATFORM_COLORS.instagram }}
            />
            <span className="text-xs text-muted">Instagram</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: PLATFORM_COLORS.news }}
            />
            <span className="text-xs text-muted">News</span>
          </div>
        </div>
      </div>
    </div>
  );
}
