import { ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '@/lib/relativeTime';

const PROVIDER_LABEL: Record<string, string> = {
  hackernews: 'HN',
  reddit: 'Reddit',
  google_trends: 'Trends',
};

const SOURCE_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-amber-500',
];

function sourceColor(source: string): string {
  let n = 0;
  for (const c of source) n += c.charCodeAt(0);
  return SOURCE_COLORS[n % SOURCE_COLORS.length];
}

interface NewsCardProps {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  provider?: string;
  description?: string;
}

export function NewsCard({ title, source, publishedAt, url, imageUrl, provider, description }: NewsCardProps) {
  const providerLabel = provider ? PROVIDER_LABEL[provider] : undefined;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 no-underline backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-white/50 hover:ring-2 hover:ring-primary/10"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.parentElement as HTMLElement).classList.add(
                sourceColor(source), 'flex', 'items-center', 'justify-center',
              );
              (e.currentTarget.parentElement as HTMLElement).innerHTML =
                `<span class="text-white text-lg font-bold">${source[0]?.toUpperCase() ?? '?'}</span>`;
            }}
          />
        ) : (
          <div className={`w-full h-full ${sourceColor(source)} flex items-center justify-center`}>
            <span className="text-white text-lg font-bold">{source[0]?.toUpperCase() ?? '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug text-ink group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </p>
        {description && (
          <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted">
          <span className="truncate text-primary/80">{source}</span>
          <span>·</span>
          <span className="shrink-0">{formatRelativeTime(publishedAt)}</span>
          {providerLabel && (
            <>
              <span>·</span>
              <span className="shrink-0 rounded bg-secondary px-1 py-px font-medium">{providerLabel}</span>
            </>
          )}
          <ExternalLink className="ml-auto h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
      </div>
    </a>
  );
}
