import { useEffect, useState } from 'react';
import { useAlert } from '@/components/useAlert';
import type { BackendApi, NewsletterIssueRow } from '@/services/backendApi';
import type { AppSession } from '@/services/backendApi';
import type { NewsletterConfigInput } from '../../schema/newsletterTypes';
import { parseNewsletterConfig } from '../../schema/newsletterTypes';
import { emptyNewsletterConfig, NEWSLETTER_TEMPLATES, WEEKDAYS, FREQUENCIES, CHANNEL_OPTIONS, PREVIEW_CHANNEL_OPTIONS, EMOTION_OPTIONS, COLOR_OPTIONS, STORY_OPTIONS } from './constants';
import { Loader2, Plus, Trash2, Mail, Clock, Rss, Newspaper, Settings2, Send } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onAuthExpired: () => void;
}

export function NewsletterTab({ idToken, api }: Props) {
  const { showAlert } = useAlert();
  const [config, setConfig] = useState<NewsletterConfigInput>(emptyNewsletterConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [issues, setIssues] = useState<NewsletterIssueRow[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedLabel, setNewFeedLabel] = useState('');
  const [activeSection, setActiveSection] = useState<'sources' | 'schedule' | 'recipients' | 'processing'>('sources');

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const raw = await api.getNewsletterConfig(idToken);
      if (raw) {
        setConfig(parseNewsletterConfig({
          rssEnabled: Boolean(raw.rss_enabled),
          newsApiEnabled: Boolean(raw.news_api_enabled),
          customRssFeeds: JSON.parse(raw.custom_rss_feeds_json || '[]'),
          itemCount: raw.item_count,
          scheduleDays: JSON.parse(raw.schedule_days_json || '[]'),
          scheduleTimes: JSON.parse(raw.schedule_times_json || '[]'),
          scheduleFrequency: raw.schedule_frequency as NewsletterConfigInput['scheduleFrequency'],
          emailRecipients: JSON.parse(raw.email_recipients_json || '[]'),
          subjectTemplate: raw.subject_template,
          channelTargets: JSON.parse(raw.channel_targets_json || '[]'),
          processingTemplate: raw.processing_template,
          processingNote: raw.processing_note,
          emotionTarget: raw.emotion_target,
          colorEmotionTarget: raw.color_emotion_target,
          storyFramework: raw.story_framework,
          previewChannel: raw.preview_channel as 'email' | 'telegram' || 'email',
          adminEmail: raw.admin_email || '',
        }));
      }
      const issueList = await api.listNewsletterIssues(idToken);
      setIssues(issueList);
    } catch (err) {
      console.error('Failed to load newsletter config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveNewsletterConfig(idToken, config);
      void showAlert({ title: 'Saved', description: 'Newsletter settings saved.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed.';
      void showAlert({ title: 'Save failed', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraft = async () => {
    setCreatingDraft(true);
    try {
      const result = await api.createNewsletterDraftNow(idToken);
      void showAlert({ title: 'Draft created', description: `Issue ${result.id.slice(0, 8)} created. Check Telegram for preview.` });
      await loadConfig();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Draft creation failed.';
      void showAlert({ title: 'Draft failed', description: msg });
    } finally {
      setCreatingDraft(false);
    }
  };

  const toggleDay = (day: string) => {
    setConfig(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day],
    }));
  };

  const toggleChannel = (ch: string) => {
    setConfig(prev => ({
      ...prev,
      channelTargets: prev.channelTargets.includes(ch)
        ? prev.channelTargets.filter(c => c !== ch)
        : [...prev.channelTargets, ch],
    }));
  };

  const toggleCustomFeed = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customRssFeeds: prev.customRssFeeds.map(f =>
        f.id === id ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  };

  const removeCustomFeed = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customRssFeeds: prev.customRssFeeds.filter(f => f.id !== id),
    }));
  };

  const addCustomFeed = () => {
    if (!newFeedUrl.trim()) return;
    const id = crypto.randomUUID();
    setConfig(prev => ({
      ...prev,
      customRssFeeds: [...prev.customRssFeeds, { id, url: newFeedUrl.trim(), label: newFeedLabel.trim(), enabled: true }],
    }));
    setNewFeedUrl('');
    setNewFeedLabel('');
  };

  const addEmailRecipient = (email: string) => {
    if (!email.trim() || !email.includes('@')) return;
    setConfig(prev => ({
      ...prev,
      emailRecipients: [...prev.emailRecipients, email.trim()],
    }));
  };

  const removeEmailRecipient = (email: string) => {
    setConfig(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['sources', 'schedule', 'recipients', 'processing'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer',
              activeSection === section
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Sources Section */}
      {activeSection === 'sources' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Rss className="h-4 w-4" /> Built-in Sources
            </h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.rssEnabled}
                onChange={e => setConfig(prev => ({ ...prev, rssEnabled: e.target.checked }))}
                className="size-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-sm">RSS Feeds (from configured research sources)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.newsApiEnabled}
                onChange={e => setConfig(prev => ({ ...prev, newsApiEnabled: e.target.checked }))}
                className="size-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-sm">News APIs (NewsAPI, GNews, NewsData.io)</span>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Rss className="h-4 w-4" /> Custom RSS / API Feeds
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Feed URL"
                value={newFeedUrl}
                onChange={e => setNewFeedUrl(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="Label (optional)"
                value={newFeedLabel}
                onChange={e => setNewFeedLabel(e.target.value)}
                className="w-40 h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void addCustomFeed()}
                className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {config.customRssFeeds.map(feed => (
                <div key={feed.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <input
                    type="checkbox"
                    checked={feed.enabled}
                    onChange={() => toggleCustomFeed(feed.id)}
                    className="size-4 rounded border-slate-300 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{feed.label || feed.url}</p>
                    <p className="text-xs text-slate-400 truncate">{feed.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomFeed(feed.id)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {config.customRssFeeds.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No custom feeds added yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Number of items per newsletter</h3>
            <input
              type="number"
              min={1}
              max={20}
              value={config.itemCount}
              onChange={e => setConfig(prev => ({ ...prev, itemCount: Math.max(1, Math.min(20, Number(e.target.value) || 5)) }))}
              className="w-24 h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>
        </div>
      )}

      {/* Schedule Section */}
      {activeSection === 'schedule' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Days &amp; Frequency
            </h3>
            <div>
              <p className="text-xs text-slate-500 mb-2">Select days to send</p>
              <div className="flex gap-2">
                {WEEKDAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={clsx(
                      'w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      config.scheduleDays.includes(day.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Frequency</p>
              <div className="flex gap-2">
                {FREQUENCIES.map(freq => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, scheduleFrequency: freq.value as NewsletterConfigInput['scheduleFrequency'] }))}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      config.scheduleFrequency === freq.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Time(s)</p>
              <input
                type="time"
                value={config.scheduleTimes[0] || '09:00'}
                onChange={e => setConfig(prev => ({ ...prev, scheduleTimes: [e.target.value] }))}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recipients Section */}
      {activeSection === 'recipients' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email Recipients
            </h3>
            <div className="flex flex-wrap gap-2">
              {config.emailRecipients.map(email => (
                <span key={email} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmailRecipient(email)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <AddEmailInput onAdd={addEmailRecipient} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Subject line template</h3>
            <input
              type="text"
              value={config.subjectTemplate}
              onChange={e => setConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))}
              placeholder="Weekly Newsletter"
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
            <p className="text-xs text-slate-400">Use {'{title}'} for first article title, {'{date}'} for date</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Post to channels</h3>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => toggleChannel(ch.value)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                    config.channelTargets.includes(ch.value)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Send className="h-4 w-4" /> Preview Delivery
            </h3>
            <div className="flex gap-3">
              {PREVIEW_CHANNEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, previewChannel: opt.value as 'email' | 'telegram' }))}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                    config.previewChannel === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Admin email or Telegram chat ID</p>
              <input
                type="text"
                value={config.adminEmail}
                onChange={e => setConfig(prev => ({ ...prev, adminEmail: e.target.value }))}
                placeholder={config.previewChannel === 'telegram' ? 'Telegram chat ID' : 'admin@example.com'}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Processing Section */}
      {activeSection === 'processing' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Newspaper className="h-4 w-4" /> Newsletter Template
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {NEWSLETTER_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, processingTemplate: tmpl.id }))}
                  className={clsx(
                    'p-4 rounded-xl border text-left transition-colors cursor-pointer',
                    config.processingTemplate === tmpl.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900">{tmpl.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{tmpl.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Enrichment Controls
            </h3>
            <div>
              <p className="text-xs text-slate-500 mb-2">Emotional tone</p>
              <div className="flex flex-wrap gap-2">
                {EMOTION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, emotionTarget: prev.emotionTarget === opt.value ? '' : opt.value }))}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer',
                      config.emotionTarget === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Visual mood</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, colorEmotionTarget: prev.colorEmotionTarget === opt.value ? '' : opt.value }))}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer',
                      config.colorEmotionTarget === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Story structure</p>
              <div className="flex flex-wrap gap-2">
                {STORY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, storyFramework: prev.storyFramework === opt.value ? '' : opt.value }))}
                    className={clsx(
                      'px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer',
                      config.storyFramework === opt.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Processing note</p>
              <textarea
                value={config.processingNote}
                onChange={e => setConfig(prev => ({ ...prev, processingNote: e.target.value }))}
                placeholder="Additional instructions for the AI..."
                className="w-full h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
        <button
          type="button"
          disabled={creatingDraft}
          onClick={() => void handleCreateDraft()}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
        >
          {creatingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
          <Send className="h-4 w-4" />
          Create draft now
        </button>
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent newsletter issues</h3>
          <div className="space-y-3">
            {issues.map(issue => (
              <div key={issue.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{issue.subject}</p>
                  <p className="text-xs text-slate-400">
                    {issue.issue_date} — <span className={clsx(
                      issue.status === 'approved' && 'text-emerald-600',
                      issue.status === 'pending_approval' && 'text-amber-600',
                      issue.status === 'sent' && 'text-blue-600',
                      issue.status === 'failed' && 'text-rose-600'
                    )}>{issue.status}</span>
                  </p>
                </div>
                <p className="text-xs text-slate-400">{issue.id.slice(0, 8)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddEmailInput({ onAdd }: { onAdd: (email: string) => void }) {
  const [value, setValue] = useState('');
  const handleAdd = () => {
    if (value.trim() && value.includes('@')) {
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <div className="flex gap-2">
      <input
        type="email"
        placeholder="recipient@example.com"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
