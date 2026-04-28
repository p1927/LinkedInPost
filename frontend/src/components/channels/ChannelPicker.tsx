/**
 * ChannelPicker — canonical shared channel selector.
 *
 * Renders a dropdown listing all workspace-supported delivery channels from
 * `CHANNEL_OPTIONS`. Each option shows a small brand-color dot alongside the
 * channel name so the selection is visually distinct at a glance.
 *
 * Usage:
 *   <ChannelPicker value={selectedChannel} onChange={setSelectedChannel} />
 *
 * Pass `value={null}` to show the "Select channel…" placeholder.
 * The `onChange` callback receives the raw `ChannelId` string.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ChannelId, CHANNEL_OPTIONS, getChannelLabel } from '@/integrations/channels';
import { channelStyle } from '@/features/content-schedule-calendar/channelStyles';

export interface ChannelPickerOption {
  /** The raw value stored in the select (e.g. a sentinel like `__workspace_default_channel__`). */
  value: string;
  /** Human-readable label shown in the trigger and option list. */
  label: string;
}

export interface ChannelPickerProps {
  /** Currently selected channel, or `null` to show the placeholder. */
  value: string | null;
  /** Called with the new `ChannelId` string when the user picks a channel. */
  onChange: (channel: string) => void;
  /** When true the select is rendered in a non-interactive state. */
  disabled?: boolean;
  /** Extra Tailwind classes forwarded to the `SelectTrigger`. */
  className?: string;
  /**
   * Optional extra options prepended before the channel list. Useful for
   * injecting sentinel values such as a workspace-default option.
   * These options are rendered as plain text (no brand-color dot).
   */
  prependOptions?: ChannelPickerOption[];
}

/**
 * Renders a small brand-color dot next to the channel label inside a select
 * option or trigger. Uses hex values from `channelStyle` so colors stay in
 * sync with the calendar and other channel-aware UI.
 */
function ChannelOptionLabel({ channelId }: { channelId: ChannelId }) {
  const style = channelStyle(channelId);
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: style.color }}
        aria-hidden
      />
      {style.label}
    </span>
  );
}

export function ChannelPicker({
  value,
  onChange,
  disabled = false,
  className,
  prependOptions = [],
}: ChannelPickerProps) {
  // Build a map of sentinel labels so itemToStringLabel can resolve them.
  const prependLabelMap = new Map(prependOptions.map((o) => [o.value, o.label]));

  return (
    <Select
      value={value ?? ''}
      onValueChange={(val) => { if (val !== null) onChange(val); }}
      disabled={disabled}
      itemToStringLabel={(v) => {
        if (prependLabelMap.has(v)) return prependLabelMap.get(v)!;
        return getChannelLabel(v as ChannelId);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select channel…" />
      </SelectTrigger>
      <SelectContent>
        {prependOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
        {CHANNEL_OPTIONS.map((channel) => (
          <SelectItem key={channel.value} value={channel.value}>
            <ChannelOptionLabel channelId={channel.value} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
