import { useState, useEffect, useRef } from 'react';
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
  Eye,
  Monitor,
  Smartphone,
  RefreshCw,
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
  /** When true, renders as a full-page two-column layout instead of a drawer overlay */
  asPage?: boolean;
}

type ConfigTab = 'sources' | 'delivery' | 'schedule' | 'voice' | 'preview';

const CONFIG_TABS: { id: ConfigTab; label: string; icon: typeof Rss }[] = [
  { id: 'sources', label: 'Sources', icon: Rss },
  { id: 'delivery', label: 'Delivery', icon: Send },
  { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
  { id: 'voice', label: 'Voice & Style', icon: Mic },
  { id: 'preview', label: 'Preview', icon: Eye },
];

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
  asPage = false,
}: Props) {
  const [localConfig, setLocalConfig] = useState<NewsletterConfigInput>(() => newsletter.config);
  const [localName, setLocalName] = useState(newsletter.name);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>('sources');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [livePreviewHtml, setLivePreviewHtml] = useState<string>('');
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const sectionIframeRef = useRef<HTMLIFrameElement>(null);
  const isMountedRef = useRef(true);
  const activePreviewFetchIdRef = useRef(0);

  useEffect(() => {
    setLocalConfig(newsletter.config);
    setLocalName(newsletter.name);
    setError(null);
    setGenerateSuccess(null);
    setSubmitted(false);
    setActiveTab('sources');
    setLivePreviewHtml('');
    setLivePreviewError(null);
    // Mark mounted and clean up on unmount
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, [newsletter.id, open]);

  if (!asPage && !open) return null;

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
      if (isMountedRef.current) {
        onSaved({ ...newsletter, name: localName, config: localConfig });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Save failed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleSaveAndGenerate = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setGenerating(true);
    setError(null);
    setGenerateSuccess(null);
    try {
      await api.updateNewsletter(idToken, newsletter.id, { ...localConfig, name: localName });
      const result = await api.createNewsletterDraftByNewsletter(idToken, newsletter.id);
      if (isMountedRef.current) {
        setGenerateSuccess(`Draft generated: "${result.subject || 'New issue'}". Close this panel to see it.`);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to generate draft.');
      }
    } finally {
      if (isMountedRef.current) {
        setGenerating(false);
      }
    }
  };

  const handleSendTest = () => {
    alert('Test email not yet implemented');
  };

  /** Fetch fresh HTML from the worker and write it into the iframe. */
  const fetchLivePreview = async () => {
    const fetchId = ++activePreviewFetchIdRef.current;
    setLivePreviewLoading(true);
    setLivePreviewHtml('');
    setLivePreviewError(null);
    try {
      const data = await api.newsletterPreview(idToken, newsletter.id);
      if (isMountedRef.current && fetchId === activePreviewFetchIdRef.current) {
        setLivePreviewHtml(data.renderedContent);
      }
    } catch (err) {
      if (isMountedRef.current && fetchId === activePreviewFetchIdRef.current) {
        setLivePreviewError(err instanceof Error ? err.message : 'Failed to load preview.');
      }
    } finally {
      if (isMountedRef.current && fetchId === activePreviewFetchIdRef.current) {
        setLivePreviewLoading(false);
      }
    }
  };

  /** Write livePreviewHtml into all preview iframes (tab + section panel).
   *  Injects LinkedIn-article-matching CSS before the email HTML so the preview
   *  visually approximates how the newsletter renders as a LinkedIn newsletter article.
   */
  useEffect(() => {
    const iframes = [previewIframeRef.current, sectionIframeRef.current].filter(Boolean) as HTMLIFrameElement[];
    if (!livePreviewHtml) return;
    for (const iframe of iframes) {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      try {
        doc.open();
        // LinkedIn newsletter article CSS — injected before the email HTML so it
        // cascades into the rendered content. Matches LinkedIn's clean editorial feel:
        // system-ui font, ~1.6 line-height, comfortable paragraph spacing.
        const linkedInCss = `
          <style>
            *, *::before, *::after { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
              font-size: 16px;
              line-height: 1.65;
              color: #1a1a2e;
              background: #ffffff;
              margin: 0;
              padding: 24px;
              max-width: 600px;
            }
            h1 { font-size: 1.5rem; line-height: 1.3; margin: 0 0 16px; color: #1a1a2e; }
            h2 { font-size: 1.25rem; line-height: 1.35; margin: 24px 0 12px; color: #1a1a2e; }
            h3 { font-size: 1.1rem; line-height: 1.4; margin: 20px 0 10px; color: #333; }
            p  { margin: 0 0 16px; }
            a  { color: #0668b8; text-decoration: none; }
            a:hover { text-decoration: underline; }
            img { max-width: 100%; height: auto; display: block; margin: 16px 0; }
            ul, ol { margin: 0 0 16px 24px; }
            li { margin-bottom: 8px; }
            blockquote {
              border-left: 3px solid #e0e7ff;
              margin: 16px 0;
              padding: 8px 16px;
              color: #555;
              font-style: italic;
            }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          </style>
        `;
        doc.write(linkedInCss + livePreviewHtml);
        doc.close();
      } catch {
        // contentDocument may be null on cross-origin iframes or blocked by CSP — skip silently
      }
    }
  }, [livePreviewHtml]);

  /** Auto-fetch preview when switching to the preview tab. */
  useEffect(() => {
    if (activeTab === 'preview' && !livePreviewHtml && !livePreviewLoading) {
      void fetchLivePreview();
    }
  }, [activeTab, livePreviewHtml, livePreviewLoading]);

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

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Newsletter Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">{localName || newsletter.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50 transition-colors"
            >
              <Mail className="h-3 w-3" />
              Send test
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Banners */}
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

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT: config panel (wider) */}
          <aside className="flex w-[58%] shrink-0 flex-col border-r border-slate-100 bg-slate-50/40">

            {/* Newsletter name — always visible */}
            <div className="shrink-0 border-b border-slate-100 px-6 pt-5 pb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Newsletter Name</label>
              <input
                type="text"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                className={clsx(
                  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300',
                  submitted && validationErrors.name ? 'border-red-400' : 'border-slate-200',
                )}
              />
              {submitted && validationErrors.name && (
                <p className="text-xs text-rose-500 mt-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex border-b border-slate-100 bg-white px-4 pt-3">
              {CONFIG_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-xs font-medium border-b-2 transition-colors mr-1',
                      isActive
                        ? 'border-violet-600 text-violet-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

              {/* SOURCES */}
              {activeTab === 'sources' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">RSS Feeds</p>
                    <p className="text-xs text-slate-500 mb-3">Pick which feeds contribute stories to each issue.</p>
                    <div className="space-y-2">
                      {globalFeeds.length > 0 ? globalFeeds.map(feed => (
                        <label key={feed.id} className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-violet-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={localConfig.enabledRssFeedIds.includes(feed.id)}
                            onChange={() => setLocalConfig(prev => ({
                              ...prev,
                              enabledRssFeedIds: toggleArrayItem(prev.enabledRssFeedIds, feed.id),
                            }))}
                            className="size-4 accent-violet-600 shrink-0"
                          />
                          <span className="text-sm text-slate-700">{feed.label ?? feed.url.slice(0, 50)}</span>
                        </label>
                      )) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                          <Rss className="h-5 w-5 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">No RSS feeds configured.</p>
                          <p className="text-xs text-slate-400 mt-0.5">Go to Settings → News to add feeds.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {NEWS_API_PROVIDERS.some(p => Boolean(apiStatus[getApiStatusKey(p.value) as keyof typeof apiStatus])) && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-3">News API Providers</p>
                      <div className="space-y-2">
                        {NEWS_API_PROVIDERS.map(provider => {
                          const statusKey = getApiStatusKey(provider.value) as keyof typeof apiStatus;
                          const configured = Boolean(apiStatus[statusKey]);
                          if (!configured) return null;
                          const enabled = localConfig.enabledNewsApiProviders.includes(provider.value);
                          return (
                            <label key={provider.value} className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-violet-200 transition-colors">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={() => setLocalConfig(prev => ({
                                  ...prev,
                                  enabledNewsApiProviders: toggleArrayItem(prev.enabledNewsApiProviders, provider.value),
                                }))}
                                className="size-4 accent-violet-600 shrink-0"
                              />
                              <span className="text-sm text-slate-700 flex-1">{provider.label}</span>
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Articles per issue: <span className="font-bold text-violet-700">{localConfig.itemCount}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={localConfig.itemCount}
                      onChange={e => setLocalConfig(prev => ({ ...prev, itemCount: Number(e.target.value) }))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>1</span><span>20</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERY */}
              {activeTab === 'delivery' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Channel</p>
                    <p className="text-xs text-slate-500 mb-3">How the newsletter reaches your subscribers.</p>
                    <div className="flex flex-wrap gap-2">
                      {CHANNEL_SEND_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, primaryChannel: opt.value }))}
                          className={clsx(
                            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            localConfig.primaryChannel === opt.value
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {localConfig.primaryChannel === 'email' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject template</label>
                        <input
                          type="text"
                          value={localConfig.subjectTemplate}
                          onChange={e => setLocalConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                          className={clsx(
                            'w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300',
                            submitted && validationErrors.subjectTemplate ? 'border-red-400' : 'border-slate-200',
                          )}
                          placeholder="{{date}} — Weekly digest"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Use {'{{date}}'} to insert the send date.</p>
                        {submitted && validationErrors.subjectTemplate && (
                          <p className="text-xs text-rose-500 mt-1">{validationErrors.subjectTemplate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipients</label>
                        <TagInput
                          tags={localConfig.emailRecipients}
                          onChange={tags => setLocalConfig(prev => ({ ...prev, emailRecipients: tags }))}
                          placeholder="Type an email and press Enter…"
                        />
                        {submitted && validationErrors.emailRecipients ? (
                          <p className="text-xs text-rose-500 mt-1">{validationErrors.emailRecipients}</p>
                        ) : localConfig.emailRecipients.length > 0 ? (
                          <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            {localConfig.emailRecipients.length} recipient{localConfig.emailRecipients.length !== 1 ? 's' : ''} added
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SCHEDULE */}
              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Send days</p>
                    <p className="text-xs text-slate-500 mb-3">Which days of the week to send this newsletter.</p>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            scheduleDays: toggleArrayItem(prev.scheduleDays, day.value),
                          }))}
                          className={clsx(
                            'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                            localConfig.scheduleDays.includes(day.value)
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Frequency</p>
                    <p className="text-xs text-slate-500 mb-3">How often to send on the selected days.</p>
                    <div className="flex flex-wrap gap-2">
                      {FREQUENCIES.map(freq => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, scheduleFrequency: freq.value }))}
                          className={clsx(
                            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            localConfig.scheduleFrequency === freq.value
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Send time</label>
                    <input
                      type="time"
                      value={localConfig.scheduleTimes[0] ?? ''}
                      onChange={e => setLocalConfig(prev => ({ ...prev, scheduleTimes: [e.target.value] }))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>

                  {localConfig.scheduleDays.length > 0 && (
                    <div className="rounded-lg bg-violet-50 border border-violet-100 px-4 py-3">
                      <p className="text-xs font-medium text-violet-800">
                        <CalendarIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                        {scheduleSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* VOICE & STYLE */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Author Voice</label>
                    <p className="text-xs text-slate-500 mb-2">Describe your writing style. The AI will match this tone in every issue.</p>
                    <textarea
                      rows={3}
                      value={localConfig.authorPersona}
                      onChange={e => setLocalConfig(prev => ({ ...prev, authorPersona: e.target.value }))}
                      className={clsx(
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-violet-300',
                        submitted && validationErrors.authorPersona ? 'border-red-400' : 'border-slate-200',
                      )}
                      placeholder="e.g. Conversational and direct, like a trusted friend who follows the industry closely…"
                    />
                    {submitted && validationErrors.authorPersona && (
                      <p className="text-xs text-rose-500 mt-1">{validationErrors.authorPersona}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">Newsletter Style</p>
                    <p className="text-xs text-slate-500 mb-3">Choose a structural template for how stories are presented.</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {NEWSLETTER_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({ ...prev, processingTemplate: tpl.id }))}
                          className={clsx(
                            'rounded-xl border p-3.5 text-left transition-colors',
                            localConfig.processingTemplate === tpl.id
                              ? 'border-violet-500 bg-violet-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-violet-300',
                          )}
                        >
                          <p className="text-sm font-semibold text-slate-800">{tpl.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tpl.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Always cover</label>
                      <TagInput
                        tags={localConfig.topicIncludeKeywords ?? []}
                        onChange={tags => setLocalConfig(prev => ({ ...prev, topicIncludeKeywords: tags }))}
                        placeholder="Add keyword…"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Never cover</label>
                      <TagInput
                        tags={localConfig.topicExcludeKeywords ?? []}
                        onChange={tags => setLocalConfig(prev => ({ ...prev, topicExcludeKeywords: tags }))}
                        placeholder="Add keyword…"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Tone</p>
                    <div className="flex flex-wrap gap-2">
                      {EMOTION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            emotionTarget: prev.emotionTarget === opt.value ? '' : opt.value,
                          }))}
                          className={clsx(
                            'rounded-full px-3.5 py-1.5 text-sm transition-colors',
                            localConfig.emotionTarget === opt.value
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Story Structure</p>
                    <div className="flex flex-wrap gap-2">
                      {STORY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({
                            ...prev,
                            storyFramework: prev.storyFramework === opt.value ? '' : opt.value,
                          }))}
                          className={clsx(
                            'rounded-full px-3.5 py-1.5 text-sm transition-colors',
                            localConfig.storyFramework === opt.value
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-300',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Rendered Preview</p>
                    <p className="text-[11px] text-slate-400">Live from your sources</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    This preview shows how your newsletter will look when rendered with the current configuration.
                    Click Refresh to fetch live articles from your sources and see the actual email HTML.
                  </p>

                  {/* Source breakdown */}
                  {livePreviewHtml && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-full text-[10px] bg-violet-50 text-violet-600 font-medium">
                        Live preview
                      </span>
                    </div>
                  )}

                  {/* Live iframe */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    {/* Preview width toggle */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('desktop')}
                          className={clsx(
                            'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
                            previewMode === 'desktop'
                              ? 'bg-violet-600 text-white'
                              : 'bg-white text-slate-500 hover:bg-slate-50',
                          )}
                        >
                          <Monitor className="h-3 w-3" />
                          Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('mobile')}
                          className={clsx(
                            'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
                            previewMode === 'mobile'
                              ? 'bg-violet-600 text-white'
                              : 'bg-white text-slate-500 hover:bg-slate-50',
                          )}
                        >
                          <Smartphone className="h-3 w-3" />
                          Mobile
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={livePreviewLoading}
                        onClick={() => void fetchLivePreview()}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={clsx('h-3 w-3', livePreviewLoading && 'animate-spin')} />
                        Refresh
                      </button>
                    </div>

                    {/* iframe */}
                    <div className={clsx(
                      'flex justify-center p-4 bg-slate-100',
                    )}>
                      {livePreviewLoading ? (
                        <div className="flex items-center gap-2 py-12">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">Fetching articles…</span>
                        </div>
                      ) : livePreviewError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center w-full max-w-[480px]">
                          <AlertTriangle className="h-8 w-8 text-rose-300 mb-3" />
                          <p className="text-sm font-medium text-rose-600 mb-1">Preview unavailable</p>
                          <p className="text-xs text-rose-400">{livePreviewError}</p>
                        </div>
                      ) : livePreviewHtml ? (
                        <div
                          className={clsx(
                            'bg-white rounded-lg shadow-sm transition-all duration-300',
                            previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[600px]',
                          )}
                        >
                          <iframe
                            ref={previewIframeRef}
                            className="w-full rounded-lg border-0"
                            style={{ height: previewMode === 'mobile' ? '812px' : '640px' }}
                            sandbox="allow-same-origin"
                            title="Newsletter live preview"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center w-full max-w-[480px]">
                          <Eye className="h-8 w-8 text-slate-200 mb-3" />
                          <p className="text-sm font-medium text-slate-500 mb-1">No preview yet</p>
                          <p className="text-xs text-slate-400">
                            Click Refresh to load live newsletter content from your sources.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center italic">
                    Preview reflects the current newsletter configuration at send time.
                  </p>
                </div>
              )}

            </div>

            {/* Save buttons — always visible */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 space-y-2.5">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAndGenerate()}
                disabled={generating || saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating…' : 'Save & Generate Draft'}
              </button>
            </div>

          </aside>

          {/* RIGHT: live newsletter preview — desktop iframe matching LinkedIn/email rendering */}
          <section className="flex flex-col flex-1 overflow-hidden bg-slate-50">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shrink-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">
                Live preview · what subscribers receive
              </p>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
                      previewMode === 'desktop'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    className={clsx(
                      'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors',
                      previewMode === 'mobile'
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    <Smartphone className="h-3 w-3" />
                    Mobile
                  </button>
                </div>
                <button
                  type="button"
                  disabled={livePreviewLoading}
                  onClick={() => void fetchLivePreview()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <RefreshCw className={clsx('h-3 w-3', livePreviewLoading && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Scrollable iframe container */}
            <div className="flex-1 overflow-y-auto flex justify-center p-6">
              {livePreviewLoading ? (
                <div className="flex items-center gap-2 py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Fetching articles…</span>
                </div>
              ) : livePreviewError ? (
                <div className="flex flex-col items-center justify-center py-16 text-center max-w-[280px]">
                  <AlertTriangle className="h-8 w-8 text-rose-300 mb-3" />
                  <p className="text-sm font-medium text-rose-600 mb-1">Preview unavailable</p>
                  <p className="text-xs text-rose-400 mb-4">{livePreviewError}</p>
                  <button
                    type="button"
                    onClick={() => void fetchLivePreview()}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try again
                  </button>
                </div>
              ) : livePreviewHtml ? (
                <div
                  className={clsx(
                    'bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300',
                    previewMode === 'mobile' ? 'w-[375px] max-w-full' : 'w-full max-w-[600px]',
                  )}
                >
                  <iframe
                    ref={sectionIframeRef}
                    className="w-full rounded-xl border-0"
                    style={{ height: previewMode === 'mobile' ? '812px' : '700px' }}
                    sandbox="allow-same-origin"
                    title="Newsletter live preview"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Eye className="h-8 w-8 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500 mb-1">No preview yet</p>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    Click Refresh to load the live newsletter.
                  </p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
