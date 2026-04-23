import React, { useState } from 'react';
import type { AutomationPlatform, AutomationRule, AutomationTrigger } from './types';
import { TRIGGER_LABELS } from './types';

const ALL_TRIGGERS: AutomationTrigger[] = ['comment', 'dm', 'comment_to_dm'];

interface Props {
  platform: AutomationPlatform;
  channelId: string;
  topicId?: string;
  initial?: AutomationRule | null;
  onSave: (rule: Omit<AutomationRule, 'updatedAt'>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function RuleEditor({ platform, channelId, topicId, initial, onSave, onDelete }: Props) {
  const [triggers, setTriggers] = useState<AutomationTrigger[]>(initial?.triggers ?? []);
  const [commentTemplate, setCommentTemplate] = useState(initial?.comment_reply_template ?? '');
  const [dmTemplate, setDmTemplate] = useState(initial?.dm_reply_template ?? '');
  const [commentToDmTemplate, setCommentToDmTemplate] = useState(initial?.comment_to_dm_template ?? '');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  function toggleTrigger(t: AutomationTrigger) {
    setTriggers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        triggers,
        comment_reply_template: commentTemplate || undefined,
        dm_reply_template: dmTemplate || undefined,
        comment_to_dm_template: commentToDmTemplate || undefined,
        enabled,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
        {topicId ? `Topic override: ${topicId}` : 'Channel default'}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>Triggers</strong>
        {ALL_TRIGGERS.map((t) => (
          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <input type="checkbox" checked={triggers.includes(t)} onChange={() => toggleTrigger(t)} />
            {TRIGGER_LABELS[t]}
          </label>
        ))}
      </div>

      {triggers.includes('comment') && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Comment reply template</label>
          <textarea
            value={commentTemplate}
            onChange={(e) => setCommentTemplate(e.target.value)}
            placeholder="Thanks for commenting, {name}!"
            rows={2}
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
      )}

      {triggers.includes('dm') && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>DM / message reply template</label>
          <textarea
            value={dmTemplate}
            onChange={(e) => setDmTemplate(e.target.value)}
            placeholder="Hey {name}, thanks for reaching out!"
            rows={2}
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
      )}

      {triggers.includes('comment_to_dm') && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Follow-up DM to commenter</label>
          <textarea
            value={commentToDmTemplate}
            onChange={(e) => setCommentToDmTemplate(e.target.value)}
            placeholder="Hey {name}, follow us for more content like this!"
            rows={2}
            style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          {saving ? 'Saving…' : 'Save rule'}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
