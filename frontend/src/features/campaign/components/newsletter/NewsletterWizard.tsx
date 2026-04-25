import { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { NewsletterRecord, NewsletterConfigInput } from '../../schema/newsletterTypes';
import {
  emptyNewsletterConfig,
  NEWS_API_PROVIDERS,
  CHANNEL_SEND_OPTIONS,
  WEEKDAYS,
  FREQUENCIES,
  NEWSLETTER_TEMPLATES,
  EMOTION_OPTIONS,
  STORY_OPTIONS,
} from './constants';
import { CampaignCarousel } from '../CampaignCarousel';
import { TagInput } from './TagInput';
import type { AppSession, BackendApi } from '@/services/backendApi';

interface Props {
  session: AppSession;
  api: BackendApi;
  idToken: string;
  onCreated: (newsletter: NewsletterRecord) => void;
  onClose: () => void;
}

// Mapping from NEWS_API_PROVIDERS value → key in session.config.newsResearch.apis
function getApiStatusKey(providerValue: string): string {
  if (providerValue === 'serpapi') return 'serpapiNews';
  return providerValue;
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

// ─── Step 1: Sources ────────────────────────────────────────────────────────

function StepSources({
  name,
  setName,
  config,
  setConfig,
  session,
}: {
  name: string;
  setName: (v: string) => void;
  config: NewsletterConfigInput;
  setConfig: React.Dispatch<React.SetStateAction<NewsletterConfigInput>>;
  session: AppSession;
}) {
  const globalFeeds = session.config.newsResearch?.rssFeeds ?? [];
  const apiStatus = session.config.newsResearch?.apis ?? {
    newsapi: false,
    gnews: false,
    newsdata: false,
    serpapiNews: false,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Newsletter Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Weekly Digest"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* RSS Feeds */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">RSS Feeds</p>
        {globalFeeds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {globalFeeds.map(feed => {
              const active = config.enabledRssFeedIds.includes(feed.id);
              const label = feed.label ?? feed.url.slice(0, 30);
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() =>
                    setConfig(prev => ({
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
            const enabled = config.enabledNewsApiProviders.includes(provider.value);
            return (
              <label key={provider.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() =>
                    setConfig(prev => ({
                      ...prev,
                      enabledNewsApiProviders: toggleArrayItem(prev.enabledNewsApiProviders, provider.value),
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

      {/* Item count */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Articles per newsletter: <span className="font-semibold">{config.itemCount}</span>
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={config.itemCount}
          onChange={e => setConfig(prev => ({ ...prev, itemCount: Number(e.target.value) }))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1</span>
          <span>20</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Delivery ────────────────────────────────────────────────────────

function StepDelivery({
  config,
  setConfig,
  autoApprove,
  setAutoApprove,
}: {
  config: NewsletterConfigInput;
  setConfig: React.Dispatch<React.SetStateAction<NewsletterConfigInput>>;
  autoApprove: boolean;
  setAutoApprove: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Primary Channel */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Primary Channel</label>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_SEND_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, primaryChannel: opt.value }))}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm transition-colors',
                config.primaryChannel === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional panel */}
      {config.primaryChannel === 'email' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
            <TagInput
              tags={config.emailRecipients}
              onChange={tags => setConfig(prev => ({ ...prev, emailRecipients: tags }))}
              placeholder="Add email address..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject template</label>
            <input
              type="text"
              value={config.subjectTemplate}
              onChange={e => setConfig(prev => ({ ...prev, subjectTemplate: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Weekly Newsletter"
            />
          </div>
        </div>
      ) : config.primaryChannel ? (
        <p className="text-sm text-slate-500">
          Connect your {config.primaryChannel} account in Settings to send to this channel.
        </p>
      ) : null}

      {/* Auto-approve toggle */}
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
        <input
          type="checkbox"
          id="auto-approve"
          checked={autoApprove}
          onChange={e => setAutoApprove(e.target.checked)}
          className="accent-indigo-600 h-4 w-4 mt-0.5 cursor-pointer"
        />
        <label htmlFor="auto-approve" className="cursor-pointer">
          <span className="block text-sm font-medium text-slate-700">Auto-send issues</span>
          <span className="block text-xs text-slate-500 mt-0.5">
            Issues are sent automatically without requiring approval.
          </span>
        </label>
      </div>

      {/* Advanced */}
      <details className="rounded-lg border border-slate-200">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer select-none">
          Advanced
        </summary>
        <div className="px-4 pb-4 pt-2">
          {config.primaryChannel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin preview email
              </label>
              <input
                type="email"
                value={config.adminEmail}
                onChange={e => setConfig(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="admin@example.com"
              />
            </div>
          )}
          {config.primaryChannel !== 'email' && (
            <p className="text-sm text-slate-400">No advanced options for this channel.</p>
          )}
        </div>
      </details>
    </div>
  );
}

// ─── Step 3: Schedule ────────────────────────────────────────────────────────

function StepSchedule({
  config,
  setConfig,
}: {
  config: NewsletterConfigInput;
  setConfig: React.Dispatch<React.SetStateAction<NewsletterConfigInput>>;
}) {
  const selectedDays = config.scheduleDays;
  const selectedTime = config.scheduleTimes[0] ?? '';

  function buildPreview(): string {
    if (selectedDays.length > 0 && selectedTime) {
      const dayLabels = WEEKDAYS.filter(d => selectedDays.includes(d.value)).map(d => d.label);
      return `Will send every ${dayLabels.join(', ')} at ${selectedTime}, starting soon.`;
    }
    return 'Set days and time above to preview your schedule.';
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Days */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Send on</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map(day => {
            const active = selectedDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() =>
                  setConfig(prev => ({
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
              onClick={() => setConfig(prev => ({ ...prev, scheduleFrequency: freq.value }))}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm transition-colors',
                config.scheduleFrequency === freq.value
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
            setConfig(prev => ({ ...prev, scheduleTimes: [e.target.value] }))
          }
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Live preview */}
      <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 mt-2">
        {buildPreview()}
      </p>
    </div>
  );
}

// ─── Step 4: Voice & Topics ──────────────────────────────────────────────────

function StepVoiceTopics({
  config,
  setConfig,
}: {
  config: NewsletterConfigInput;
  setConfig: React.Dispatch<React.SetStateAction<NewsletterConfigInput>>;
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Processing template */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Newsletter Style</label>
        <div className="grid grid-cols-2 gap-3">
          {NEWSLETTER_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, processingTemplate: tpl.id }))}
              className={clsx(
                'border rounded-lg p-3 text-left cursor-pointer transition-colors',
                config.processingTemplate === tpl.id
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Author Voice</label>
        <textarea
          rows={3}
          value={config.authorPersona}
          onChange={e => setConfig(prev => ({ ...prev, authorPersona: e.target.value }))}
          placeholder="Describe your writing voice and tone..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      </div>

      {/* Always include keywords */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Always cover</label>
        <TagInput
          tags={config.topicIncludeKeywords}
          onChange={tags => setConfig(prev => ({ ...prev, topicIncludeKeywords: tags }))}
          placeholder="Add keyword..."
        />
      </div>

      {/* Never include keywords */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Never cover</label>
        <TagInput
          tags={config.topicExcludeKeywords}
          onChange={tags => setConfig(prev => ({ ...prev, topicExcludeKeywords: tags }))}
          placeholder="Add keyword..."
        />
      </div>

      {/* Emotional tone */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
        <div className="flex flex-wrap gap-2">
          {EMOTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setConfig(prev => ({
                  ...prev,
                  emotionTarget: prev.emotionTarget === opt.value ? '' : opt.value,
                }))
              }
              className={clsx(
                'rounded-full px-3 py-1 text-xs transition-colors',
                config.emotionTarget === opt.value
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
                setConfig(prev => ({
                  ...prev,
                  storyFramework: prev.storyFramework === opt.value ? '' : opt.value,
                }))
              }
              className={clsx(
                'rounded-full px-3 py-1 text-xs transition-colors',
                config.storyFramework === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:border-indigo-300',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced: intro / outro */}
      <details className="rounded-lg border border-slate-200">
        <summary className="px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer select-none">
          Advanced
        </summary>
        <div className="px-4 pb-4 pt-2 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Newsletter intro</label>
            <textarea
              rows={3}
              value={config.newsletterIntro}
              onChange={e => setConfig(prev => ({ ...prev, newsletterIntro: e.target.value }))}
              placeholder="Opening paragraph for each issue..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Newsletter outro</label>
            <textarea
              rows={3}
              value={config.newsletterOutro}
              onChange={e => setConfig(prev => ({ ...prev, newsletterOutro: e.target.value }))}
              placeholder="Closing paragraph for each issue..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        </div>
      </details>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { label: 'Sources' },
  { label: 'Delivery' },
  { label: 'Schedule' },
  { label: 'Voice & Topics' },
] as const;

export function NewsletterWizard({ session, api, idToken, onCreated, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<NewsletterConfigInput>(emptyNewsletterConfig());
  const [autoApprove, setAutoApprove] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function getNextDisabled(): boolean {
    switch (step) {
      case 0:
        return (
          !name.trim() ||
          (config.enabledRssFeedIds.length === 0 && config.enabledNewsApiProviders.length === 0)
        );
      case 1:
        return (
          !config.primaryChannel ||
          (config.primaryChannel === 'email' && config.emailRecipients.length === 0)
        );
      case 2:
        return config.scheduleDays.length === 0 || !config.scheduleTimes[0];
      case 3:
        return false;
      default:
        return false;
    }
  }

  const handleNext = async () => {
    if (step < 3) {
      setStep(s => s + 1);
      return;
    }
    setSaveError(null);
    setSubmitting(true);
    try {
      const newsletter = await api.createNewsletter(idToken, name.trim(), config, autoApprove);
      onCreated(newsletter);
    } catch (err) {
      console.error('Failed to create newsletter:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to create newsletter. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Create Newsletter</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error banner */}
        {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}

        {/* Carousel */}
        <CampaignCarousel
          steps={[...WIZARD_STEPS]}
          currentStep={step}
          onNext={() => void handleNext()}
          onPrev={() => setStep(s => s - 1)}
          nextDisabled={getNextDisabled()}
          nextLabel={step === 3 ? 'Save & Activate' : 'Next'}
          submitting={submitting}
        >
          {[
            <StepSources
              key="sources"
              name={name}
              setName={setName}
              config={config}
              setConfig={setConfig}
              session={session}
            />,
            <StepDelivery
              key="delivery"
              config={config}
              setConfig={setConfig}
              autoApprove={autoApprove}
              setAutoApprove={setAutoApprove}
            />,
            <StepSchedule key="schedule" config={config} setConfig={setConfig} />,
            <StepVoiceTopics key="voice" config={config} setConfig={setConfig} />,
          ]}
        </CampaignCarousel>
      </div>
    </div>
  );
}
