import { useState, useEffect, useCallback } from 'react';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';
import { isLocalScheduleInPast } from '@/features/content-schedule-calendar/scheduleValidation';

export interface ScheduleEditorProps {
  /**
   * The currently scheduled date/time. Pass `null` when no schedule is set.
   * The time component is optional — if the `Date` is at midnight (00:00:00.000)
   * the time input is left blank, allowing the user to optionally fill it in.
   */
  value: Date | null;
  /** Called whenever the date or time input changes (real-time). */
  onChange: (date: Date | null) => void;
  /**
   * When true (default), dates/times in the past are flagged with an inline
   * error and the Apply button is disabled.
   */
  disablePastDates?: boolean;
  /**
   * When true (default), renders an "Update schedule" / "Apply" button below
   * the inputs. Set to false when the parent owns the submit action (e.g. a
   * dialog with its own footer buttons).
   */
  showApplyButton?: boolean;
  /**
   * Called when the user clicks the Apply button. If omitted, `onChange` is
   * called instead. Only relevant when `showApplyButton` is true.
   */
  onApply?: (date: Date | null) => void;
  /** Extra CSS class applied to the outer wrapper div. */
  className?: string;
  /** Optional label rendered above the date/time inputs. */
  label?: string;
  /** When true, disables all inputs and the Apply button. */
  disabled?: boolean;
}

/** Parse a `Date | null` into the YYYY-MM-DD and HH:MM string pair used by the inputs. */
function dateToStrings(d: Date | null): { dateStr: string; timeStr: string } {
  if (!d) return { dateStr: '', timeStr: '' };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const h = d.getHours();
  const m = d.getMinutes();
  // Treat midnight exactly as "no time set" so callers that pass a date-only
  // value don't get a "00:00" pre-filled in the time picker.
  const timeStr = h === 0 && m === 0 ? '' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { dateStr, timeStr };
}

/** Reconstruct a `Date | null` from the string pair. Returns null when dateStr is empty. */
function stringsToDate(dateStr: string, timeStr: string): Date | null {
  if (!dateStr.trim()) return null;
  const [Y, M, D] = dateStr.split('-').map(Number);
  let h = 0;
  let m = 0;
  if (timeStr.trim()) {
    const parts = timeStr.split(':').map(Number);
    h = parts[0] ?? 0;
    m = parts[1] ?? 0;
  }
  return new Date(Y!, M! - 1, D!, h, m, 0, 0);
}

/**
 * ScheduleEditor — a reusable date + time picker for scheduling topics.
 *
 * Renders a labelled date input and an optional time input side-by-side,
 * with built-in past-date validation and an optional "Apply" button.
 *
 * @example
 * // With apply button (TopicDetailPanel usage)
 * <ScheduleEditor
 *   value={scheduledDate}
 *   onChange={setScheduledDate}
 *   onApply={handleUpdateSchedule}
 *   disablePastDates
 * />
 *
 * @example
 * // Inputs only (dialog with its own footer)
 * <ScheduleEditor
 *   value={scheduledDate}
 *   onChange={setScheduledDate}
 *   disablePastDates
 *   showApplyButton={false}
 * />
 */
export function ScheduleEditor({
  value,
  onChange,
  disablePastDates = true,
  showApplyButton = true,
  onApply,
  className,
  label,
  disabled = false,
}: ScheduleEditorProps) {
  const initial = dateToStrings(value);
  const [dateStr, setDateStr] = useState(initial.dateStr);
  const [timeStr, setTimeStr] = useState(initial.timeStr);

  // Sync when the `value` prop changes from the outside (e.g. row changes).
  useEffect(() => {
    const parsed = dateToStrings(value);
    setDateStr(parsed.dateStr);
    setTimeStr(parsed.timeStr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.getTime()]);

  // Validate past-date constraint.
  const isPast = disablePastDates && dateStr.trim()
    ? isLocalScheduleInPast(dateStr, timeStr.trim() || undefined)
    : false;

  // "Dirty" — has the user changed anything from the incoming value?
  const dirty = dateStr !== initial.dateStr || timeStr !== initial.timeStr;

  const notify = useCallback((ds: string, ts: string) => {
    onChange(stringsToDate(ds, ts));
  }, [onChange]);

  const handleDateChange = (v: string) => {
    setDateStr(v);
    notify(v, timeStr);
  };

  const handleTimeChange = (v: string) => {
    setTimeStr(v);
    notify(dateStr, v);
  };

  const handleApply = () => {
    const date = stringsToDate(dateStr, timeStr);
    if (onApply) {
      onApply(date);
    } else {
      onChange(date);
    }
  };

  const applyDisabled = disabled || isPast || !dirty;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 34,
    padding: '0 10px',
    fontSize: 13,
    border: `1px solid ${T.lineStrong}`,
    borderRadius: 8,
    background: T.surface,
    color: T.ink,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    opacity: disabled ? 0.5 : 1,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: T.muted,
    marginBottom: 5,
  };

  return (
    <div className={className}>
      {label && (
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.muted,
            marginBottom: 10,
          }}
        >
          {label}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={disabled}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Time{' '}
            <span style={{ fontWeight: 400, color: T.mutedSoft }}>(optional)</span>
          </label>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={disabled}
            style={inputStyle}
          />
        </div>
      </div>

      {isPast && (
        <p
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 500,
            color: '#E11D48',
          }}
        >
          Please select a future date
        </p>
      )}

      {showApplyButton && (
        <button
          type="button"
          disabled={applyDisabled}
          onClick={handleApply}
          style={{
            marginTop: 12,
            width: '100%',
            height: 34,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: applyDisabled ? 'not-allowed' : 'pointer',
            background: applyDisabled ? T.accentSoft : T.accent,
            color: applyDisabled ? T.accent : '#fff',
            border: 'none',
            transition: 'background 150ms, color 150ms',
            fontFamily: 'inherit',
          }}
        >
          Update schedule
        </button>
      )}
    </div>
  );
}
