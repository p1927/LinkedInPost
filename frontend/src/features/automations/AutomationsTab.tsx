import React, { useCallback, useEffect, useState } from 'react';
import { deleteRule, listRules, registerWebhooks, upsertRule } from './api';
import { RuleEditor } from './RuleEditor';
import { YouTubeScheduler } from './YouTubeScheduler';
import type { AutomationPlatform, AutomationRule, RuleEntry } from './types';
import { PLATFORM_LABELS } from './types';

const PLATFORMS: AutomationPlatform[] = ['instagram', 'linkedin', 'telegram', 'gmail', 'youtube'];

interface Props {
  idToken: string;
  isAdmin: boolean;
}

export function AutomationsTab({ idToken, isAdmin }: Props) {
  const [rules, setRules] = useState<RuleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<AutomationPlatform>('instagram');
  const [registeringWebhook, setRegisteringWebhook] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState('');

  const [webhookChannelId, setWebhookChannelId] = useState('');
  const [newChannelId, setNewChannelId] = useState('');
  const [newTopicId, setNewTopicId] = useState('');

  const reload = useCallback(() => {
    listRules(idToken).then((r) => {
      setRules(r);
      setLoading(false);
    });
  }, [idToken]);

  useEffect(() => { reload(); }, [reload]);

  if (!isAdmin) {
    return <div style={{ padding: 24, color: '#6b7280' }}>Automations are available to admins only.</div>;
  }

  const platformRules = rules.filter((r) => r.key.startsWith(`automation:rule:${activePlatform}:`));

  async function handleSave(channelId: string, rule: Omit<AutomationRule, 'updatedAt'>, topicId?: string) {
    await upsertRule(idToken, activePlatform, channelId, rule, topicId);
    reload();
  }

  async function handleDelete(channelId: string, topicId?: string) {
    await deleteRule(idToken, activePlatform, channelId, topicId);
    reload();
  }

  async function handleRegisterWebhook() {
    if (!webhookChannelId) return;
    setRegisteringWebhook(true);
    setWebhookMsg('');
    try {
      await registerWebhooks(idToken, activePlatform, webhookChannelId);
      setWebhookMsg('Webhook registered successfully.');
    } catch (err: any) {
      setWebhookMsg(err?.message ?? 'Webhook registration failed — check platform credentials.');
    } finally {
      setRegisteringWebhook(false);
    }
  }

  function parseKeyParts(key: string): { channelId: string; topicId?: string } {
    // Keys use format: automation:rule:<platform>:<encodedChannelId>[:<encodedTopicId>]
    // channelId and topicId are URL-encoded so colons inside URNs do not corrupt parsing.
    const prefix = `automation:rule:${activePlatform}:`;
    const rest = key.startsWith(prefix) ? key.slice(prefix.length) : key;
    const sepIdx = rest.indexOf(':');
    if (sepIdx === -1) {
      return { channelId: decodeURIComponent(rest) };
    }
    return {
      channelId: decodeURIComponent(rest.slice(0, sepIdx)),
      topicId: decodeURIComponent(rest.slice(sepIdx + 1)),
    };
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Automations</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Set channel-level auto-reply rules for comments, DMs, and follow-up messages.
        Webhooks are registered automatically when you click "Register webhook".
      </p>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activePlatform === p ? '2px solid #2563eb' : '2px solid transparent',
              color: activePlatform === p ? '#2563eb' : '#374151',
              fontWeight: activePlatform === p ? 700 : 400,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Webhook registration */}
      <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Register webhook</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={webhookChannelId}
            onChange={(e) => setWebhookChannelId(e.target.value)}
            placeholder="Channel ID"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          />
          <button
            onClick={handleRegisterWebhook}
            disabled={registeringWebhook || !webhookChannelId}
            style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            {registeringWebhook ? 'Registering…' : 'Register webhook'}
          </button>
        </div>
        {webhookMsg && (
          <div style={{ marginTop: 8, fontSize: 13, color: webhookMsg.includes('failed') ? '#b91c1c' : '#047857' }}>
            {webhookMsg}
          </div>
        )}
      </div>

      {/* Existing rules */}
      {loading ? (
        <div style={{ fontSize: 13, color: '#9ca3af' }}>Loading rules…</div>
      ) : platformRules.length === 0 ? (
        <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
          No rules for {PLATFORM_LABELS[activePlatform]} yet.
        </div>
      ) : (
        platformRules.map((entry) => {
          const { channelId, topicId } = parseKeyParts(entry.key);
          return (
            <RuleEditor
              key={entry.key}
              platform={activePlatform}
              channelId={channelId}
              topicId={topicId}
              initial={entry.rule}
              onSave={(rule) => handleSave(channelId, rule, topicId)}
              onDelete={() => handleDelete(channelId, topicId)}
            />
          );
        })
      )}

      {/* Add new rule */}
      <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add new rule</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={newChannelId}
            onChange={(e) => setNewChannelId(e.target.value)}
            placeholder="Channel ID (required)"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #bae6fd', fontSize: 13 }}
          />
          <input
            type="text"
            value={newTopicId}
            onChange={(e) => setNewTopicId(e.target.value)}
            placeholder="Topic / Post ID (optional override)"
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #bae6fd', fontSize: 13 }}
          />
        </div>
        {newChannelId && (
          <RuleEditor
            platform={activePlatform}
            channelId={newChannelId}
            topicId={newTopicId || undefined}
            onSave={(rule) => {
              handleSave(newChannelId, rule, newTopicId || undefined);
              setNewChannelId('');
              setNewTopicId('');
            }}
          />
        )}
      </div>

      {/* YouTube-specific schedule */}
      {activePlatform === 'youtube' && newChannelId && (
        <YouTubeScheduler idToken={idToken} channelId={newChannelId} />
      )}
    </div>
  );
}
