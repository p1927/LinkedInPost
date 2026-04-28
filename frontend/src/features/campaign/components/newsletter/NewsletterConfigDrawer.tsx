import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Rss,
  Send,
  Calendar as CalendarIcon,
  Mic,
  Mail,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import type { NewsletterRecord, NewsletterConfigInput } from '../../schema/newsletterTypes';
import type { AppSession, BackendApi } from '@/services/backendApi';
import {
  NEWSLETTER_TEMPLATES,
  WEEKDAYS,
  FREQUENCIES,
  CHANNEL_SEND_OPTIONS,
  NEWS_API_PROVIDERS,
  EMOTION_OPTIONS,
  STORY_OPTIONS,
} from './constants';
import { TagInput } from './TagInput';

interface Props {
  newsletter: NewsletterRecord;
  session: AppSession;
  api: BackendApi;
  idToken: string;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: NewsletterRecord) => void;
}

function getApiStatusKey(providerValue: string): string {
  if (providerValue === 'serpapi') return 'serpapiNews';
  return providerValue;
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function buildScheduleSummary(days: string[], times: string[]): string {
  if (!days?.length) return 'No schedule set';
  const dayStr = days.map(d => DAY_LABELS[d.toLowerCase()] ?? d).join(', ');
  if (!times?.length) return `Every ${dayStr}`;
  const [h, m] = times[0].split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `Every ${dayStr} · ${hour12}:${m ?? '00'}${period}`;
}

export function NewsletterConfigDrawer({
  newsletter,
  session,
  api,
  idToken,
  open,
  onClose,
  onSaved,
}: Props) {
  const [localConfig, setLocalConfig] = useState<NewsletterConfigInput>(() => newsletter.config);
  const [localName, setLocalName] = useState(newsletter.name);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLocalConfig(newsletter.config);
    setLocalName(newsletter.name);
    setError(null);
    setGenerateSuccess(null);
    setSubmitted(false);
  }, [newsletter.id, open]);

  if (!open) return null;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validationErrors = {
    name: !localName.trim() ? 'Newsletter name is required.' : null,
    subjectTemplate:
      localConfig.primaryChannel === 'email' && !localConfig.subjectTemplate.trim()
        ? 'Subject template is required for email delivery.'
        : localConfig.subjectTemplate.length > 200
          ? 'Subject template should be 200 characters or fewer.'
          : null,
    emailRecipients:
      localConfig.primaryChannel === 'email' && localConfig.emailRecipients.length === 0
        ? 'Add at least one recipient.'
        : localConfig.primaryChannel === 'email' &&
            localConfig.emailRecipients.some((e) => !EMAIL_RE.test(e))
          ? 'One or more email addresses are invalid.'
          : null,
    authorPersona:
      localConfig.authorPersona.trim().length > 0 && localConfig.authorPersona.trim().length < 10
        ? 'Author voice should be at least 10 characters.'
        : null,
  };

  const hasErrors = Object.values(validationErrors).some(Boolean);

  const handleSave = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateNewsletter(idToken, newsletter.id, { ...localConfig, name: localName });
      onSaved({ ...newsletter, name: localName, config: localConfig });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setGenerating(true);
    setError(null);
    setGenerateSuccess(null);
    try {
      // Save current config first so the draft uses the latest settings
      await api.updateNewsletter(idToken, newsletter.id, { ...localConfig, name: localName });
      const result = await api.createNewsletterDraftByNewsletter(idToken, newsletter.id);
      setGenerateSuccess(`Draft generated: "${result.subject || 'New issue'}". Close this panel to see it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendTest = () => {
    alert('Test email not yet implemented');
  };

  const globalFeeds = session.config.newsResearch?.rssFeeds ?? [];
  const apiStatus = session.config.newsResearch?.apis ?? {
    newsapi: false,
    gnews: false,
    newsdata: false,
    serpapiNews: false,
  };

  const scheduleSummary = buildScheduleSummary(localConfig.scheduleDays, localConfig.scheduleTimes);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full height, wide, split layout */}
      <div className="relative z-10 flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Newsletter Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">{localName || newsletter.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error / success banners */}
        {error && (
          <div className="shrink-0 bg-rose-50 border-b border-rose-100 px-6 py-2 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {generateSuccess && (
          <div className="shrink-0 bg-emerald-50 border-b border-emerald-100 px-6 py-2 text-sm text-emerald-700">
            {generateSuccess}
          </div>
        )}

        {/* Body — split layout */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT: config (5/12) */}
          <aside className="w-5/12 overflow-y-auto border-r border-slate-100 bg-violet-50/10 p-7 space-y-5">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Configure</h4>
              <button
                type="button"
                onClick={handleSendTest}
                className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors"
              >
                <Mail className="h-3 w-3" />
                Send test to me
              </button>
            </div>

            {/* Name field */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Newsletter Name</label>
              <input
                type="text"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                className={clsx(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300',
                  submitted && validationErrors.name ? 'border-red-400' : 'border-slate-200',
                )}
              />
              {submitted && validationErrors.name && (
                <p className="text-xs text-rose-500 mt-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Sources card */}
            <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <Rss className="h-4 w-4 text-violet-600 shrink-0" />
                <p className="font-semibold text-sm text-slate-800">Sources</p>
                <span className="ml-auto text-[11px] text-slate-400">
                  {localConfig.enabledRssFeedIds.length} feeds · top {localConfig.itemCount} stories
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mb-3">Pick where the issue's stories come from each cycle.</p>
              <div className="space-y-2 text-[13px]">
                {globalFeeds.length > 0 ? globalFeeds.map(feed => (
                  <label key={feed.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.enabledRssFeedIds.includes(feed.id)}
                      onChange={() => setLocalConfig(prev => ({
                        ...prev,
                        enabledRssFeedIds: toggleArrayItem(prev.enabledRssFeedIds, feed.id),
                      }))}
                      className="size-4 accent-violet-600"
                    />
                    <span>{feed.label ?? feed.url.slice(0, 40)}</span>
                  </label>
                )) : (
                  <p className="text-slate-400 text-xs">No RSS feeds configured in Settings → News.</p>
                )}
                {NEWS_API_PROVIDERS.map(provider => {
                  const statusKey = getApiStatusKey(provider.value) as keyof typeof apiStatus;
                  const configured = Boolean(apiStatus[statusKey]);
                  const enabled = localConfig.enabledNewsApiProviders.includes(provider.value);
                  return configured ? (
                    <label key={provider.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => setLocalConfig(prev => ({
                          ...prev,
                          enabledNewsApiProviders: toggleArrayItem(prev.enabledNewsApiProviders, provider.value),
                        }))}
                        className="size-4 accent-violet-600"
                      />
                      <span>{provider.label}</span>
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </label>
                  ) : null;
                })}
              </div>
              {/* Item count slider */}
              <div className="mt-4">
                <label className="text-xs text-slate-600 mb-1 block">
                  Articles per issue: <span className="font-semibold">{localConfig.itemCount}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={localConfig.itemCount}
                  onChange={e => setLocalConfig(prev => ({ ...prev, itemCount: Number(e.target.value) }))}
                  className="w-full accent-violet-600"
                />
              </div>
            </div>

            {/* Delivery card */}
            <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <Send className="h-4 w-4 text-violet-600 shrink-0" />
                <p className="font-semibold text-sm text-slate-800">Delivery</p>
                <span className="ml-auto text-[11px] text-slate-400">
                  {localConfig.primaryChannel || 'No channel'} · {localConfig.emailRecipients.length} recipients
                </span>
              </div>
              {/* Channel picker */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CHANNEL_SEND_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocalConfig(prev => ({ ...prev, primaryChannel: opt.value }))}
                    className={clsx(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      localConfig.primaryChannel === opt.value
                        ? 'bg-violet-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:border-violet-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Email-specific fields */}
              {localConfig.primaryChannel === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Subject template</label>
                    <input
                      type="text"
                      value={localConfig.subjectTemplate}
                      onChange={e => setLocalConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                      className={clsx(
                        'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300',
                        submitted && validationErrors.subjectTemplate ? 'border-red-400' : 'border-slate-200',
                      )}
                      placeholder="{{date}} — Weekly digest"
                    />
                    {submitted && validationErrors.subjectTemplate && (
                      <p className="text-xs text-rose-500 mt-1">{validationErrors.subjectTemplate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Recipients</label>
                    <TagInput
                      tags={localConfig.emailRecipients}
                      onChange={tags => setLocalConfig(prev => ({ ...prev, emailRecipients: tags }))}
                      placeholder="Add email..."
                    />
                    {submitted && validationErrors.emailRecipients ? (
                      <p className="text-xs text-rose-500 mt-1">{validationErrors.emailRecipients}</p>
                    ) : localConfig.emailRecipients.length > 0 ? (
                      <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {localConfig.emailRecipients.length} recipients valid
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule card */}
            <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <CalendarIcon className="h-4 w-4 text-violet-600 shrink-0" />
                <p className="font-semibold text-sm text-slate-800">Schedule</p>
                <span className="ml-auto text-[11px] text-slate-400">{scheduleSummary}</span>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => setLocalConfig(prev => ({
                        ...prev,
                        scheduleDays: toggleArrayItem(prev.scheduleDays, day.value),
                      }))}
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                        localConfig.scheduleDays.includes(day.value)
                          ? 'bg-violet-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-violet-300',
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {FREQUENCIES.map(freq => (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setLocalConfig(prev => ({ ...prev, scheduleFrequency: freq.value }))}
                        className={clsx(
                          'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                          localConfig.scheduleFrequency === freq.value
                            ? 'bg-violet-600 text-white'
                            : 'border border-slate-200 text-slate-600 hover:border-violet-300',
                        )}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="time"
                    value={localConfig.scheduleTimes[0] ?? ''}
                    onChange={e => setLocalConfig(prev => ({ ...prev, scheduleTimes: [e.target.value] }))}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>
            </div>

            {/* Voice & Topics card */}
            <div className="rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <Mic className="h-4 w-4 text-violet-600 shrink-0" />
                <p className="font-semibold text-sm text-slate-800">Voice &amp; Topics</p>
                <span className="ml-auto text-[11px] text-slate-400">
                  {localConfig.emotionTarget || 'No tone'} · {(localConfig.topicIncludeKeywords?.length ?? 0)} keywords
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mb-3">Adjust persona, keywords, and story structure.</p>
              <details className="space-y-3">
                <summary className="cursor-pointer text-xs font-medium text-violet-700 hover:text-violet-900">
                  Expand to configure
                </summary>
                <div className="pt-3 space-y-4">
                  {/* Style grid */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Newsletter Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {NEWSLETTER_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, processingTemplate: tpl.id }))}
                          className={clsx(
                            'border rounded-lg p-2.5 text-left text-xs transition-colors',
                            localConfig.processingTemplate === tpl.id
                              ? 'border-violet-600 bg-violet-50'
                              : 'border-slate-200 hover:border-violet-300',
                          )}
                        >
                          <p className="font-medium text-slate-800">{tpl.name}</p>
                          <p className="text-slate-500 mt-0.5">{tpl.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Author voice */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Author Voice</label>
                    <textarea
                      rows={2}
                      value={localConfig.authorPersona}
                      onChange={e => setLocalConfig(prev => ({ ...prev, authorPersona: e.target.value }))}
                      className={clsx(
                        'w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-violet-300',
                        submitted && validationErrors.authorPersona ? 'border-red-400' : 'border-slate-200',
                      )}
                      placeholder="Describe your writing voice..."
                    />
                    {submitted && validationErrors.authorPersona && (
                      <p className="text-xs text-rose-500 mt-1">{validationErrors.authorPersona}</p>
                    )}
                  </div>
                  {/* Keywords */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Always cover</label>
                    <TagInput
                      tags={localConfig.topicIncludeKeywords ?? []}
                      onChange={tags => setLocalConfig(prev => ({ ...prev, topicIncludeKeywords: tags }))}
                      placeholder="Add keyword..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Never cover</label>
                    <TagInput
                      tags={localConfig.topicExcludeKeywords ?? []}
                      onChange={tags => setLocalConfig(prev => ({ ...prev, topicExcludeKeywords: tags }))}
                      placeholder="Add keyword..."
                    />
                  </div>
                  {/* Tone chips */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Tone</label>
                    <div className="flex flex-wrap gap-1.5">
                      {EMOTION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            emotionTarget: prev.emotionTarget === opt.value ? '' : opt.value,
                          }))}
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-xs transition-colors',
                            localConfig.emotionTarget === opt.value
                              ? 'bg-violet-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Structure chips */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Structure</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STORY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            storyFramework: prev.storyFramework === opt.value ? '' : opt.value,
                          }))}
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-xs transition-colors',
                            localConfig.storyFramework === opt.value
                              ? 'bg-violet-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* Save buttons */}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
            <button
              type="button"
              onClick={() => void handleSaveAndGenerate()}
              disabled={generating || saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Save & Generate Draft'}
            </button>

          </aside>

          {/* RIGHT: live preview (7/12) */}
          <section className="flex-1 overflow-y-auto bg-white p-8">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-4">
              Live preview · what subscribers receive
            </p>
            <div className="max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-amber-500 shrink-0" />
                <div className="leading-tight">
                  <p className="font-semibold text-sm text-slate-900">{localName || 'My Newsletter'}</p>
                  <p className="text-[11px] text-slate-400">
                    {localConfig.scheduleDays.length > 0 ? scheduleSummary : 'No schedule set'} · {localConfig.emailRecipients.length || 0} recipients
                  </p>
                </div>
              </div>
              <h1 className="text-lg font-bold mb-3 leading-tight text-slate-900">
                {localConfig.subjectTemplate || '{{date}} — Issue digest'}
              </h1>
              {localConfig.newsletterIntro && (
                <p className="text-[12px] text-slate-600 leading-relaxed mb-3 italic">
                  {localConfig.newsletterIntro}
                </p>
              )}
              <div className="space-y-3">
                {[
                  'Top story from your sources will appear here…',
                  'Second story with summary and read-more link…',
                  'Third story from your configured feeds…',
                ].map((placeholder, i) => (
                  <article key={i}>
                    <h3 className="text-xs font-semibold text-slate-800">{i + 1}. {placeholder}</h3>
                    <a className="text-[11px] text-violet-700 font-semibold mt-0.5 inline-block">Read more →</a>
                  </article>
                ))}
              </div>
              {localConfig.newsletterOutro && (
                <p className="text-[12px] text-slate-600 leading-relaxed mt-3 italic">
                  {localConfig.newsletterOutro}
                </p>
              )}
              <div className="mt-5 pt-4 border-t border-slate-200 text-[11px] text-slate-400">
                You're receiving this because you opted in.{' '}
                <span className="underline cursor-pointer">Unsubscribe</span>.
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-400 text-center">
              This is a layout preview — actual content is generated at send time.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
