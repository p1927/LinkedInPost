import { Badge } from '@/components/ui/badge';
import type { CampaignPostV1 } from '../schema/types';

function previewBody(p: CampaignPostV1): string {
  const v = p.variants?.find((s) => s?.trim())?.trim();
  if (v) return v;
  return (
    p.variant1?.trim() ||
    p.variant2?.trim() ||
    p.variant3?.trim() ||
    p.variant4?.trim() ||
    p.body?.trim() ||
    '—'
  );
}

export function CampaignPostList({ posts }: { posts: CampaignPostV1[] }) {
  return (
    <ul className="custom-scrollbar max-h-[min(28rem,50vh)] list-none space-y-2 overflow-y-auto p-0">
      {posts.map((p, i) => (
        <li
          key={`${p.topic}-${p.date}-${i}`}
          className="rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 text-sm shadow-sm backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-ink">{p.topic}</span>
            <span className="text-xs text-muted">{p.date}</span>
            {p.postTime ? (
              <span className="text-xs tabular-nums text-muted">{p.postTime}</span>
            ) : null}
            {p.channels?.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px] font-medium">
                {c}
              </Badge>
            ))}
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted">{previewBody(p)}</p>
        </li>
      ))}
    </ul>
  );
}
