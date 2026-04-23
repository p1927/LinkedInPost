export const CHANNEL_IMAGE_SPECS: Record<string, {
  width: number;
  height: number;
  aspectRatio: string;
  tip: string;
}> = {
  linkedin:  { width: 1200, height: 627,  aspectRatio: '1.91:1', tip: 'Best for link posts and articles' },
  instagram: { width: 1080, height: 1080, aspectRatio: '1:1',    tip: 'Square format for feed' },
  telegram:  { width: 1280, height: 720,  aspectRatio: '16:9',   tip: 'Wide format for channels' },
  whatsapp:  { width: 800,  height: 800,  aspectRatio: '1:1',    tip: 'Square works best' },
  gmail:     { width: 600,  height: 400,  aspectRatio: '3:2',    tip: 'Standard email width' },
};

export const CHANNEL_COLOR_MAP: Record<string, string> = {
  linkedin:  '#0A66C2',
  instagram: '#E1306C',
  telegram:  '#2CA5E0',
  whatsapp:  '#25D366',
  gmail:     '#EA4335',
};

export function ChannelImageRequirements({ channel }: { channel: string }) {
  const spec = CHANNEL_IMAGE_SPECS[channel?.toLowerCase()];
  if (!spec) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-muted">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: CHANNEL_COLOR_MAP[channel?.toLowerCase()] ?? '#6366f1' }}
      />
      <span className="font-semibold text-ink capitalize">{channel}</span>
      <span className="text-muted/60">·</span>
      <span>{spec.width} × {spec.height}px</span>
      <span className="text-muted/60">·</span>
      <span>{spec.aspectRatio}</span>
      <span className="hidden sm:inline text-muted/50">— {spec.tip}</span>
    </div>
  );
}
