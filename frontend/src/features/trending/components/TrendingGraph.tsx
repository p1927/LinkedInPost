import { useState, useCallback } from 'react';
import { BarChart3, ArrowUpDown, ZoomIn, ZoomOut, RotateCcw, Play, Camera, Newspaper } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { TrendingData, GraphNode } from '../types';

interface Props {
  data: TrendingData;
  onNodeClick: (node: GraphNode) => void;
}

type SortKey = 'engagement' | 'platform';
type SortOrder = 'asc' | 'desc';

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_ZOOM_IDX = 1;

const PLATFORM_CONFIG = {
  youtube: {
    color: '#FF0000',
    bg: 'bg-red-50',
    border: 'border-red-100',
    text: 'text-red-700',
    bar: '#FF0000',
    icon: <Play size={12} />,
    label: 'YouTube',
    order: 0,
  },
  instagram: {
    color: '#E1306C',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    text: 'text-pink-700',
    bar: '#E1306C',
    icon: <Camera size={12} />,
    label: 'Instagram',
    order: 1,
  },
  news: {
    color: '#3B82F6',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-700',
    bar: '#3B82F6',
    icon: <Newspaper size={12} />,
    label: 'News',
    order: 2,
  },
} as const;

function parseEngagement(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const str = String(value).replace(/[^0-9.KMBkmb]/g, '');
  if (!str) return 0;
  const lower = str.toLowerCase();
  if (lower.endsWith('b')) return parseFloat(lower) * 1_000_000_000;
  if (lower.endsWith('m')) return parseFloat(lower) * 1_000_000;
  if (lower.endsWith('k')) return parseFloat(lower) * 1_000;
  return parseFloat(str) || 0;
}

export function TrendingGraph({ data, onNodeClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('engagement');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_IDX);

  const zoom = ZOOM_LEVELS[zoomIdx];

  const zoomIn = useCallback(() => setZoomIdx(i => Math.min(i + 1, ZOOM_LEVELS.length - 1)), []);
  const zoomOut = useCallback(() => setZoomIdx(i => Math.max(i - 1, 0)), []);
  const zoomReset = useCallback(() => setZoomIdx(DEFAULT_ZOOM_IDX), []);

  // Build typed nodes
  const nodes: GraphNode[] = [
    ...data.youtube.slice(0, 6).map((video) => ({
      id: `yt-${video.id}`,
      label: video.title.length > 40 ? video.title.slice(0, 40) + '…' : video.title,
      type: 'youtube' as const,
      size: parseEngagement(video.viewCount),
      color: PLATFORM_CONFIG.youtube.color,
      data: video,
    })),
    ...data.instagram.slice(0, 6).map((post) => ({
      id: `ig-${post.id}`,
      label: post.caption.length > 40 ? post.caption.slice(0, 40) + '…' : post.caption,
      type: 'instagram' as const,
      size: parseEngagement(post.likeCount),
      color: PLATFORM_CONFIG.instagram.color,
      data: post,
    })),
    ...data.news.slice(0, 6).map((article) => ({
      id: `news-${article.id}`,
      label: article.title.length > 40 ? article.title.slice(0, 40) + '…' : article.title,
      type: 'news' as const,
      size: 0,
      color: PLATFORM_CONFIG.news.color,
      data: article,
    })),
  ];

  const maxEngagement = Math.max(...nodes.map(n => n.size), 1);

  const sortedNodes = [...nodes].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'engagement') {
      cmp = a.size - b.size;
    } else if (sortKey === 'platform') {
      const aOrder = PLATFORM_CONFIG[a.type as keyof typeof PLATFORM_CONFIG]?.order ?? 99;
      const bOrder = PLATFORM_CONFIG[b.type as keyof typeof PLATFORM_CONFIG]?.order ?? 99;
      cmp = aOrder - bOrder;
      if (cmp === 0) cmp = b.size - a.size;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  if (nodes.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-primary" size={16} />
          <h3 className="text-sm font-semibold text-ink">Trending Graph</h3>
          <span className="text-[10px] font-medium text-muted bg-border/40 rounded-full px-2 py-0.5">
            {nodes.length} items
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Sort controls */}
          {(['engagement', 'platform'] as SortKey[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSort(key)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 cursor-pointer',
                sortKey === key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted hover:text-ink hover:bg-secondary/60 border border-transparent',
              )}
            >
              <span className="capitalize">{key}</span>
              <ArrowUpDown size={10} className={cn('transition-transform', sortKey === key && sortOrder === 'asc' && 'rotate-180')} />
            </button>
          ))}

          {/* Divider */}
          <span className="w-px h-4 bg-border/60 mx-0.5" />

          {/* Zoom controls */}
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoomIdx === 0}
            title="Zoom out"
            className="flex items-center justify-center h-6 w-6 rounded-md border border-border/60 text-muted hover:text-ink hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomOut size={12} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            title={`Reset zoom (${Math.round(zoom * 100)}%)`}
            className="flex items-center justify-center h-6 px-1.5 rounded-md border border-border/60 text-[10px] font-semibold text-muted hover:text-ink hover:bg-secondary/60 transition-all cursor-pointer min-w-[36px]"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            title="Zoom in"
            className="flex items-center justify-center h-6 w-6 rounded-md border border-border/60 text-muted hover:text-ink hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ZoomIn size={12} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            title="Reset view"
            className="flex items-center justify-center h-6 w-6 rounded-md border border-border/60 text-muted hover:text-ink hover:bg-secondary/60 transition-all cursor-pointer"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="p-4 overflow-x-auto">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}
        >
          <div className="space-y-1.5" style={{ width: zoom < 1 ? `${100 / zoom}%` : '100%' }}>
            {sortedNodes.map((node, idx) => {
              const cfg = PLATFORM_CONFIG[node.type as keyof typeof PLATFORM_CONFIG];
              const barPct = node.size > 0 ? Math.max(6, (node.size / maxEngagement) * 100) : 8;

              return (
                <motion.button
                  key={node.id}
                  type="button"
                  onClick={() => onNodeClick(node)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className={cn(
                    'group w-full flex items-center gap-3 p-2 rounded-xl border transition-all duration-150 cursor-pointer text-left',
                    cfg ? `hover:${cfg.bg} hover:${cfg.border} border-transparent` : 'hover:bg-secondary/60 border-transparent',
                  )}
                >
                  {/* Platform icon badge */}
                  <div
                    className={cn('shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border', cfg?.bg, cfg?.border)}
                    style={{ color: cfg?.color }}
                  >
                    {cfg?.icon}
                  </div>

                  {/* Label + bar */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={cn('text-xs font-medium text-ink truncate transition-colors group-hover:font-semibold')}>
                      {node.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: cfg?.bar ?? node.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.04 }}
                        />
                      </div>
                      {node.size > 0 && (
                        <span className="text-[10px] text-muted shrink-0 w-12 text-right">
                          {node.size >= 1_000_000
                            ? `${(node.size / 1_000_000).toFixed(1)}M`
                            : node.size >= 1_000
                            ? `${(node.size / 1_000).toFixed(0)}K`
                            : String(node.size)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Platform tag */}
                  <span
                    className={cn('shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border hidden sm:inline', cfg?.bg, cfg?.border, cfg?.text)}
                  >
                    {cfg?.label ?? node.type}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-3 pt-1 border-t border-border/30 flex-wrap">
        {(Object.entries(PLATFORM_CONFIG) as [keyof typeof PLATFORM_CONFIG, typeof PLATFORM_CONFIG[keyof typeof PLATFORM_CONFIG]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-sm border', cfg.bg, cfg.border)} style={{ backgroundColor: cfg.color + '30', borderColor: cfg.color + '40' }} />
            <span className="text-[11px] text-muted">{cfg.label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-muted/60 italic">Click any row to search</span>
      </div>
    </div>
  );
}
