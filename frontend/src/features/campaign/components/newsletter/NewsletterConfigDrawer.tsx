import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
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

  const handleGenerateDraft = async () => {
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

  const globalFeeds = session.config.newsResearch?.rssFeeds ?? [];
  const apiStatus = session.config.newsResearch?.apis ?? {
    newsapi: false,
    gnews: false,
    newsdata: false,
    serpapiNews: false,
  };

  const selectedTime = localConfig.scheduleTimes[0] ?? '';

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer panel — wide split layout */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">Newsletter Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Split body: config left, preview right (stacked on small screens) */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Config panel */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 border-r border-slate-100">
          {/* Newsletter Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Newsletter Name</label>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className={clsx(
                'border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300',
                submitted && validationErrors.name ? 'border-red-400' : 'border-slate-200',
              )}
            />
            {submitted && validationErrors.name && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.name}</p>
            )}
          </div>

          {/* Section 1: Sources */}
          <details open>
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer py-2">
              Sources
            </summary>
            <div className="flex flex-col gap-6 pt-2">
              {/* RSS Feeds */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">RSS Feeds</p>
                {globalFeeds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {globalFeeds.map(feed => {
                      const active = localConfig.enabledRssFeedIds.includes(feed.id);
                      const label = feed.label ?? feed.url.slice(0, 30);
                      return (
                        <button
                          key={feed.id}
                          type="button"
                          onClick={() =>
                            setLocalConfig(prev => ({
                              ...prev,
                              enabledRssFeedIds: toggleArrayItem(prev.enabledRssFeedIds, feed.id),
                            }))
                          }
                          className={clsx(
                            'rounded-full px-3 py-1 text-sm transition-colors',
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No RSS feeds configured.{' '}
                    <a
                      href="#"
                      onClick={e => e.preventDefault()}
                      className="text-indigo-600 text-sm hover:underline"
                    >
                      Add feeds in Settings →
                    </a>
                  </p>
                )}
              </div>

              {/* News API Providers */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">News APIs</p>
                <div className="flex flex-col gap-2">
                  {NEWS_API_PROVIDERS.map(provider => {
                    const statusKey = getApiStatusKey(provider.value) as keyof typeof apiStatus;
                    const configured = Boolean(apiStatus[statusKey]);
                    const enabled = localConfig.enabledNewsApiProviders.includes(provider.value);
                    return (
                      <label key={provider.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() =>
                            setLocalConfig(prev => ({
                              ...prev,
                              enabledNewsApiProviders: toggleArrayItem(
                                prev.enabledNewsApiProviders,
                                provider.value,
                              ),
                            }))
                          }
                          className="accent-indigo-600 h-4 w-4"
                        />
                        <span className="text-sm text-slate-700 flex-1">{provider.label}</span>
                        <span
                          className={clsx(
                            'inline-block h-2 w-2 rounded-full',
                            configured ? 'bg-emerald-500' : 'bg-slate-300',
                          )}
                          title={configured ? 'API key configured' : 'No API key'}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Item count slider */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Articles per newsletter:{' '}
                  <span className="font-semibold">{localConfig.itemCount}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={localConfig.itemCount}
                  onChange={e =>
                    setLocalConfig(prev => ({ ...prev, itemCount: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>
            </div>
          </details>

          {/* Section 2: Delivery */}
          <details open>
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer py-2">
              Delivery
            </summary>
            <div className="flex flex-col gap-6 pt-2">
              {/* Primary Channel */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Primary Channel
                </label>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_SEND_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setLocalConfig(prev => ({ ...prev, primaryChannel: opt.value }))
                      }
                      className={clsx(
                        'rounded-lg px-3 py-2 text-sm transition-colors',
                        localConfig.primaryChannel === opt.value
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: email */}
              {localConfig.primaryChannel === 'email' ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Recipients
                    </label>
                    <TagInput
                      tags={localConfig.emailRecipients}
                      onChange={tags =>
                        setLocalConfig(prev => ({ ...prev, emailRecipients: tags }))
                      }
                      placeholder="Add email address..."
                    />
                    {submitted && validationErrors.emailRecipients && (
                      <p className="mt-1 text-xs text-red-500">{validationErrors.emailRecipients}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Subject template
                      </label>
                      <span className={clsx(
                        'text-xs',
                        localConfig.subjectTemplate.length > 200 ? 'text-red-500' : 'text-slate-400',
                      )}>
                        {localConfig.subjectTemplate.length}/200
                      </span>
                    </div>
                    <input
                      type="text"
                      value={localConfig.subjectTemplate}
                      onChange={e =>
                        setLocalConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))
                      }
                      className={clsx(
                        'border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300',
                        submitted && validationErrors.subjectTemplate ? 'border-red-400' : 'border-slate-200',
                      )}
                      placeholder="Weekly Newsletter"
                    />
                    {submitted && validationErrors.subjectTemplate && (
                      <p className="mt-1 text-xs text-red-500">{validationErrors.subjectTemplate}</p>
                    )}
                  </div>
                </div>
              ) : localConfig.primaryChannel ? (
                <p className="text-sm text-slate-500">
                  Connect your {localConfig.primaryChannel} account in Settings to send to this
                  channel.
                </p>
              ) : null}

              {/* Admin email (advanced) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin preview email
                </label>
                <input
                  type="email"
                  value={localConfig.adminEmail}
                  onChange={e =>
                    setLocalConfig(prev => ({ ...prev, adminEmail: e.target.value }))
                  }
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
          </details>

          {/* Section 3: Schedule */}
          <details open>
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer py-2">
              Schedule
            </summary>
            <div className="flex flex-col gap-6 pt-2">
              {/* Day chips */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Send on</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => {
                    const active = localConfig.scheduleDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setLocalConfig(prev => ({
                            ...prev,
                            scheduleDays: toggleArrayItem(prev.scheduleDays, day.value),
                          }))
                        }
                        className={clsx(
                          'rounded-full px-3 py-1 text-sm transition-colors',
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map(freq => (
                    <button
                      key={freq.value}
                      type="button"
                      onClick={() =>
                        setLocalConfig(prev => ({ ...prev, scheduleFrequency: freq.value }))
                      }
                      className={clsx(
                        'rounded-lg px-3 py-2 text-sm transition-colors',
                        localConfig.scheduleFrequency === freq.value
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
                      )}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Send time</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={e =>
                    setLocalConfig(prev => ({ ...prev, scheduleTimes: [e.target.value] }))
                  }
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          </details>

          {/* Section 4: Voice & Topics */}
          <details open>
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer py-2 flex items-center justify-between">
              <span>Voice &amp; Topics</span>
              {(localConfig.authorPersona || localConfig.emotionTarget || localConfig.storyFramework) && (
                <span className="text-xs font-normal text-slate-400 ml-2 truncate max-w-[180px]">
                  {[
                    localConfig.emotionTarget && `Tone: ${localConfig.emotionTarget}`,
                    localConfig.storyFramework && `Structure: ${localConfig.storyFramework}`,
                    localConfig.authorPersona && `Voice set`,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </summary>
            <div className="flex flex-col gap-6 pt-2">
              {/* Processing template grid */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Newsletter Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {NEWSLETTER_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() =>
                        setLocalConfig(prev => ({ ...prev, processingTemplate: tpl.id }))
                      }
                      className={clsx(
                        'border rounded-lg p-3 text-left cursor-pointer transition-colors',
                        localConfig.processingTemplate === tpl.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-slate-200 hover:border-indigo-300',
                      )}
                    >
                      <p className="text-sm font-medium text-slate-800">{tpl.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Author persona */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Author Voice</label>
                  <span className="text-xs text-slate-400">{localConfig.authorPersona.length} chars</span>
                </div>
                <textarea
                  rows={3}
                  value={localConfig.authorPersona}
                  onChange={e =>
                    setLocalConfig(prev => ({ ...prev, authorPersona: e.target.value }))
                  }
                  placeholder="Describe your writing voice and tone..."
                  className={clsx(
                    'border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300 resize-none',
                    submitted && validationErrors.authorPersona ? 'border-red-400' : 'border-slate-200',
                  )}
                />
                {submitted && validationErrors.authorPersona && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.authorPersona}</p>
                )}
              </div>

              {/* Always cover keywords */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Always cover
                </label>
                <TagInput
                  tags={localConfig.topicIncludeKeywords}
                  onChange={tags =>
                    setLocalConfig(prev => ({ ...prev, topicIncludeKeywords: tags }))
                  }
                  placeholder="Add keyword..."
                />
              </div>

              {/* Never cover keywords */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Never cover
                </label>
                <TagInput
                  tags={localConfig.topicExcludeKeywords}
                  onChange={tags =>
                    setLocalConfig(prev => ({ ...prev, topicExcludeKeywords: tags }))
                  }
                  placeholder="Add keyword..."
                />
              </div>

              {/* Emotion tone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setLocalConfig(prev => ({
                          ...prev,
                          emotionTarget: prev.emotionTarget === opt.value ? '' : opt.value,
                        }))
                      }
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs transition-colors',
                        localConfig.emotionTarget === opt.value
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Story framework */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Structure</label>
                <div className="flex flex-wrap gap-2">
                  {STORY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setLocalConfig(prev => ({
                          ...prev,
                          storyFramework: prev.storyFramework === opt.value ? '' : opt.value,
                        }))
                      }
                      className={clsx(
                        'rounded-full px-3 py-1 text-xs transition-colors',
                        localConfig.storyFramework === opt.value
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
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

        {/* Footer inside config panel */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col gap-3 shrink-0">
          {(error || (submitted && hasErrors) || generateSuccess) && (
            <div className="min-w-0">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {submitted && hasErrors && !error && (
                <p className="text-xs text-red-500">Fix the errors above before saving.</p>
              )}
              {generateSuccess && !error && (
                <p className="text-sm text-emerald-600">{generateSuccess}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleGenerateDraft()}
              disabled={generating || saving || (submitted && hasErrors)}
              title="Save settings and generate a new draft issue immediately"
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Save & Generate Draft'}
            </button>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || generating || (submitted && hasErrors)}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
        </div>{/* end config panel */}

        {/* Preview pane */}
        <div className="hidden md:flex w-full md:w-80 shrink-0 flex-col bg-slate-50 overflow-y-auto border-t md:border-t-0">
          <div className="px-4 py-3 border-b border-slate-200 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preview</p>
          </div>
          <div className="flex-1 p-4">
            {/* Mock email envelope */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
              {/* Email header */}
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 space-y-1">
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="font-medium w-10 shrink-0">From:</span>
                  <span>{localName || 'Your Newsletter'}</span>
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="font-medium w-10 shrink-0">Subject:</span>
                  <span className="truncate font-medium text-slate-700">{localConfig.subjectTemplate || 'Weekly Newsletter'}</span>
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="font-medium w-10 shrink-0">To:</span>
                  <span>
                    {localConfig.emailRecipients.length > 0
                      ? localConfig.emailRecipients.slice(0, 2).join(', ') + (localConfig.emailRecipients.length > 2 ? ` +${localConfig.emailRecipients.length - 2}` : '')
                      : 'subscribers'}
                  </span>
                </div>
              </div>

              {/* Email body mock */}
              <div className="px-4 py-5 space-y-4">
                <div className="text-center border-b border-slate-100 pb-4">
                  <p className="font-bold text-slate-800 text-base">{localName || 'Your Newsletter'}</p>
                  {localConfig.scheduleFrequency && (
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{localConfig.scheduleFrequency} edition</p>
                  )}
                </div>

                {/* Mock articles */}
                {Array.from({ length: Math.min(localConfig.itemCount, 3) }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-full" />
                    <div className="h-2 bg-slate-100 rounded w-5/6" />
                  </div>
                ))}
                {localConfig.itemCount > 3 && (
                  <p className="text-xs text-slate-400 text-center">+ {localConfig.itemCount - 3} more articles</p>
                )}

                {/* Style info */}
                {(localConfig.emotionTarget || localConfig.storyFramework) && (
                  <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-1.5">
                    {localConfig.emotionTarget && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                        {localConfig.emotionTarget}
                      </span>
                    )}
                    {localConfig.storyFramework && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                        {localConfig.storyFramework}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-400">This is a layout preview — actual content is generated at send time.</p>
          </div>
        </div>

        </div>{/* end split body */}
      </div>
  );
}
