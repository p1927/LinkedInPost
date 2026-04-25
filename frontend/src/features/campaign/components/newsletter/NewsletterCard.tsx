import { useState, useRef, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import type { NewsletterRecord } from '../../schema/newsletterTypes';

interface Props {
  newsletter: NewsletterRecord;
  onViewIssues: (id: string) => void;
  onConfig: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function formatTime(time: string): string {
  // Convert "09:00" or "14:30" to "9:00am" / "2:30pm"
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? '00';
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute}${period}`;
}

function buildScheduleSummary(days: string[], times: string[]): string {
  if (!days || days.length === 0) return 'No schedule set';
  const dayLabels = days.map(d => DAY_LABELS[d.toLowerCase()] ?? d).join(', ');
  const timeLabel = times && times.length > 0 ? ` · ${formatTime(times[0])}` : '';
  return `Every ${dayLabels}${timeLabel}`;
}

export function NewsletterCard({ newsletter, onViewIssues, onConfig, onToggleActive, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [menuOpen]);

  const scheduleSummary = buildScheduleSummary(
    newsletter.config.scheduleDays,
    newsletter.config.scheduleTimes,
  );

  const nextSendLabel = newsletter.nextSendAt
    ? `Next: ${new Date(newsletter.nextSendAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Next: TBD';

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      {/* Left info block */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Name + status badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">{newsletter.name}</span>
          {newsletter.active ? (
            <span className="text-xs text-emerald-600 flex items-center gap-0.5 shrink-0">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Active
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-0.5 shrink-0">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" /> Paused
            </span>
          )}
        </div>

        {/* Schedule summary */}
        <span className="text-xs text-slate-500">{scheduleSummary}</span>

        {/* Auto-approve chip + next send */}
        <div className="flex items-center gap-2 mt-0.5">
          {newsletter.autoApprove && (
            <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">
              Auto-send
            </span>
          )}
          <span className="text-xs text-slate-400">{nextSendLabel}</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {/* View Issues */}
        <button
          type="button"
          onClick={() => onViewIssues(newsletter.id)}
          className="text-xs text-indigo-600 hover:underline cursor-pointer"
        >
          View Issues
        </button>

        {/* Settings icon */}
        <button
          type="button"
          onClick={() => onConfig(newsletter.id)}
          className="cursor-pointer"
          aria-label="Configure newsletter"
        >
          <Settings2 className="h-4 w-4 text-slate-400 hover:text-slate-600" />
        </button>

        {/* ··· menu */}
        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => setMenuOpen(prev => !prev)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm leading-none px-1"
            aria-label="More options"
          >
            ···
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-md">
              <button
                type="button"
                onClick={() => {
                  onToggleActive(newsletter.id, !newsletter.active);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {newsletter.active ? 'Pause' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(newsletter.id);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-slate-50 cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
