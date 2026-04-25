import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(newsletter.config);
    setLocalName(newsletter.name);
    setError(null);
  }, [newsletter.id, open]);

  if (!open) return null;

  const handleSave = async () => {
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

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Newsletter Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Newsletter Name</label>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
            />
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subject template
                    </label>
                    <input
                      type="text"
                      value={localConfig.subjectTemplate}
                      onChange={e =>
                        setLocalConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))
                      }
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
                      placeholder="Weekly Newsletter"
                    />
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

          {/* Section 4: Voice & Topics (closed by default) */}
          <details>
            <summary className="text-sm font-semibold text-slate-700 cursor-pointer py-2">
              Voice &amp; Topics
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Author Voice
                </label>
                <textarea
                  rows={3}
                  value={localConfig.authorPersona}
                  onChange={e =>
                    setLocalConfig(prev => ({ ...prev, authorPersona: e.target.value }))
                  }
                  placeholder="Describe your writing voice and tone..."
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
