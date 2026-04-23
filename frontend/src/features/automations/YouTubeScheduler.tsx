import React, { useEffect, useState } from 'react';
import { getYouTubeSchedule, saveYouTubeSchedule } from './api';

interface Props {
  idToken: string;
  channelId: string;
}

export function YouTubeScheduler({ idToken, channelId }: Props) {
  const [cron, setCron] = useState('');
  const [lastPolled, setLastPolled] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getYouTubeSchedule(idToken, channelId).then((s) => {
      if (s) {
        setCron(s.cronExpression);
        setLastPolled(s.lastPolledAt ?? null);
      }
      setLoaded(true);
    });
  }, [idToken, channelId]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveYouTubeSchedule(idToken, channelId, cron);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div style={{ fontSize: 13, color: '#9ca3af' }}>Loading schedule…</div>;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>YouTube Comment Poll Schedule</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
        Leave blank to disable scheduled polling. Use a GitHub Actions cron expression, e.g. <code>0 */6 * * *</code> for every 6 hours.
        {lastPolled && <> Last polled: {new Date(lastPolled).toLocaleString()}.</>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          placeholder="cron expression or leave blank to disable"
          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
