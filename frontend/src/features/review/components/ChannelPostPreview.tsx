import { CHANNEL_IMAGE_SPECS, CHANNEL_COLOR_MAP } from './ChannelImageRequirements';

interface SingleChannelPreviewProps {
  channel: string;
  postText: string;
  imageUrl?: string;
}

function SingleChannelPreview({ channel, postText, imageUrl }: SingleChannelPreviewProps) {
  const key = channel.toLowerCase();
  const spec = CHANNEL_IMAGE_SPECS[key];
  const color = CHANNEL_COLOR_MAP[key] ?? '#6366f1';

  // Parse aspect ratio string like "1.91:1" or "1:1" or "16:9"
  const [wStr, hStr] = (spec?.aspectRatio ?? '16:9').split(':');
  const cssAspect = `${wStr} / ${hStr}`;

  return (
    <div
      className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shrink-0"
      style={{ minWidth: 200, maxWidth: 260 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-ink capitalize">{channel}</span>
        {spec && (
          <span className="ml-auto text-[0.6rem] text-muted font-mono">
            {spec.width}×{spec.height}
          </span>
        )}
      </div>
      {/* Image */}
      {imageUrl && (
        <div
          className="relative w-full overflow-hidden bg-slate-100"
          style={{ aspectRatio: cssAspect }}
        >
          <img
            src={imageUrl}
            alt={`${channel} preview`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}
      {!imageUrl && spec && (
        <div
          className="w-full bg-slate-100 flex items-center justify-center"
          style={{ aspectRatio: cssAspect }}
        >
          <span className="text-[0.65rem] text-muted">No image selected</span>
        </div>
      )}
      {/* Post text */}
      <div className="px-3 py-2.5">
        <p className="text-[0.7rem] text-slate-700 line-clamp-4 leading-snug whitespace-pre-line">
          {postText || <span className="text-muted italic">No text yet</span>}
        </p>
      </div>
    </div>
  );
}

interface ChannelPostPreviewProps {
  postText: string;
  imageUrl?: string;
  channels: string[];
}

export function ChannelPostPreview({ postText, imageUrl, channels }: ChannelPostPreviewProps) {
  if (channels.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink">Channel preview</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {channels.map((ch) => (
          <SingleChannelPreview key={ch} channel={ch} postText={postText} imageUrl={imageUrl} />
        ))}
      </div>
    </div>
  );
}
