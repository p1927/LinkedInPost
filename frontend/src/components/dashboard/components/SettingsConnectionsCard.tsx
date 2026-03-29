import { Check, Minus } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { type WorkspacePublishingHealth } from '../../workspace/WorkspaceChromeContext';
import { PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID } from './DashboardSettingsDrawer';

const CHANNEL_ROWS: Array<{ id: string; label: string; key: keyof WorkspacePublishingHealth }> = [
  { id: 'li', label: 'LinkedIn', key: 'linkedin' },
  { id: 'ig', label: 'Instagram', key: 'instagram' },
  { id: 'tg', label: 'Telegram', key: 'telegram' },
  { id: 'wa', label: 'WhatsApp', key: 'whatsapp' },
  { id: 'gm', label: 'Gmail', key: 'gmail' },
];

export function SettingsConnectionsCard({
  health,
  className,
  onNavigateToSection,
}: {
  health: WorkspacePublishingHealth;
  className?: string;
  /** Scrolls the settings panel to the matching "Jump to" section (e.g. LinkedIn → LinkedIn block). */
  onNavigateToSection?: (sectionId: (typeof PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID)[keyof WorkspacePublishingHealth]) => void;
}) {
  return (
    <section
      className={cn('border border-white/50 ring-1 ring-white/40', className)}
      aria-labelledby="settings-connections-heading"
    >
      <h2
        id="settings-connections-heading"
        className="border-b border-violet-200/60 px-4 py-3 font-heading text-base font-semibold text-ink"
      >
        Connections
      </h2>
      <p className="border-b border-violet-200/40 px-4 py-2.5 text-xs leading-relaxed text-muted">
        Worker publishing credentials detected from your saved workspace config.
      </p>
      <ul className="list-none space-y-2 p-4">
        {CHANNEL_ROWS.map(({ id, label, key }) => {
          const ok = health[key];
          const sectionId = PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID[key];
          const statusBadge = (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                ok
                  ? 'border border-success-border bg-success-surface text-success-ink'
                  : 'border border-dashed border-border-strong bg-white/40 text-muted',
              )}
            >
              {ok ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2.5} />
              ) : (
                <Minus className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2.5} />
              )}
              {ok ? 'Connected' : 'Not connected'}
            </span>
          );

          return (
            <li key={id}>
              {onNavigateToSection ? (
                <button
                  type="button"
                  className="glass-inset flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-violet-200/45 px-3 py-2 text-left transition-colors hover:bg-white/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => onNavigateToSection(sectionId)}
                  aria-label={`Jump to ${label} settings`}
                >
                  <span className="text-sm font-medium text-ink">{label}</span>
                  {statusBadge}
                </button>
              ) : (
                <div className="glass-inset flex items-center justify-between gap-2 rounded-xl border border-violet-200/45 px-3 py-2">
                  <span className="text-sm font-medium text-ink">{label}</span>
                  {statusBadge}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
