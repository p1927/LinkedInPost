import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type BackendApi } from '../../services/backendApi';
import { type SheetRow } from '../../services/sheets';
import { WORKSPACE_PATHS } from '../topic-navigation/utils/workspaceRoutes';
import { TrendingSidebar } from './TrendingSidebar';
import { useSpeechToText } from './useSpeechToText';
import { MicButton } from './MicButton';

const STYLE_OPTIONS = [
  'Professional',
  'Storytelling',
  'Educational',
  'Inspirational',
  'Listicle',
  'Controversial',
  'Conversational',
] as const;

/** Auto-resize a textarea to fit its content. */
function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

/** Transparent, borderless textarea that grows with content — feels like a document. */
const DocTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    minRows?: number;
    className?: string;
  }
>(function DocTextarea({ value, onChange, placeholder, minRows = 2, className = '' }, ref) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  useEffect(() => {
    autoResize(innerRef.current);
  }, [value]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => autoResize(e.currentTarget)}
      placeholder={placeholder}
      rows={minRows}
      className={[
        'w-full resize-none bg-transparent text-sm leading-relaxed text-ink',
        'placeholder:text-muted/40 outline-none border-none',
        'transition-colors duration-150',
        className,
      ].join(' ')}
    />
  );
});

/** Subtle section divider with label. */
function SectionDivider({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/20" />
      {action}
    </div>
  );
}

export function AddTopicPage({
  idToken,
  api,
  editRow,
}: {
  idToken: string;
  api: BackendApi;
  editRow?: SheetRow;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  void searchParams;
  const stt = useSpeechToText();

  const [topic, setTopic] = useState('');
  const [about, setAbout] = useState('');
  const [meaning, setMeaning] = useState('');
  const [style, setStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  useEffect(() => {
    if (!editRow) return;
    setTopic(editRow.topic);
    const meta = editRow.topicGenerationRules
      ? (() => {
          try { return JSON.parse(editRow.topicGenerationRules) as Record<string, unknown>; }
          catch { return null; }
        })()
      : null;
    if (meta) {
      if (typeof meta.about === 'string') setAbout(meta.about);
      if (typeof meta.meaning === 'string') setMeaning(meta.meaning);
      if (typeof meta.style === 'string') setStyle(meta.style);
      if (Array.isArray(meta.pros)) setPros(meta.pros as string[]);
      if (Array.isArray(meta.cons)) setCons(meta.cons as string[]);
      if (typeof meta.notes === 'string') setNotes(meta.notes);
    }
  }, [editRow?.topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleGenerateInsights = useCallback(async () => {
    if (!topic.trim()) return;
    setGeneratingInsights(true);
    setInsightsError('');
    try {
      const result = await api.analyzeTopicInsights(idToken, {
        topic: topic.trim(),
        about: about.trim() || undefined,
        meaning: meaning.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPros(result.pros);
      setCons(result.cons);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights.');
    } finally {
      setGeneratingInsights(false);
    }
  }, [idToken, api, topic, about, meaning, notes]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim()) {
        setSubmitError('Topic title is required.');
        return;
      }
      setSubmitError('');
      setSubmitting(true);
      try {
        const topicMeta = {
          about: about.trim() || undefined,
          meaning: meaning.trim() || undefined,
          style: style || undefined,
          pros: pros.length ? pros : undefined,
          cons: cons.length ? cons : undefined,
          notes: notes.trim() || undefined,
        };
        await api.addTopic(idToken, topic.trim(), topicMeta);
        navigate(WORKSPACE_PATHS.topics);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to add topic.');
      } finally {
        setSubmitting(false);
      }
    },
    [idToken, api, topic, about, meaning, style, pros, cons, notes, navigate],
  );

  const hasInsights = pros.length > 0 || cons.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* ── Left: document editor ── */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-8 py-10">

          {/* Document title + voice button */}
          <div className="mb-8 flex items-start gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Untitled topic…"
              autoFocus
              className={[
                'min-w-0 flex-1 bg-transparent font-heading text-3xl font-bold text-ink',
                'placeholder:text-muted/30 outline-none border-none',
                'transition-colors duration-150',
              ].join(' ')}
            />
            <div className="mt-2 shrink-0">
              <MicButton
                isRecording={stt.isRecording}
                isAvailable={stt.isAvailable}
                unavailableReason={stt.unavailableReason}
                shortcut={stt.shortcut}
                onClick={stt.toggle}
              />
            </div>
          </div>

          {/* About */}
          <div className="mb-6">
            <SectionDivider label="About this post" />
            <div className="pt-3">
              <DocTextarea
                value={about}
                onChange={setAbout}
                placeholder="What is this post about? Describe the context, story, or angle you want to explore…"
                minRows={3}
              />
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <SectionDivider label="Message to convey" />
            <div className="pt-3">
              <DocTextarea
                value={meaning}
                onChange={setMeaning}
                placeholder="What should readers walk away thinking or feeling? What's the core takeaway?"
                minRows={2}
              />
            </div>
          </div>

          {/* Style */}
          <div className="mb-6">
            <SectionDivider label="Content style" />
            <div className="flex flex-wrap gap-2 pt-3">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(style === s ? '' : s)}
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
                    style === s
                      ? 'border-primary/50 bg-primary/15 text-primary shadow-sm'
                      : 'border-white/40 bg-white/25 text-muted hover:border-white/60 hover:bg-white/40 hover:text-ink',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Research notes — main scratchpad */}
          <div className="mb-6">
            <SectionDivider label="Research notes" />
            <div className="pt-3">
              <DocTextarea
                value={notes}
                onChange={setNotes}
                placeholder="Paste links, quotes, stats, anecdotes, or anything you want to remember. This is your scratchpad…"
                minRows={5}
              />
              {stt.error && (
                <p className="mt-1 text-xs text-red-500">{stt.error}</p>
              )}
            </div>
          </div>

          {/* Pros & Cons — AI generated */}
          <div className="mb-8">
            <SectionDivider
              label="Pros & cons"
              action={
                <button
                  type="button"
                  onClick={handleGenerateInsights}
                  disabled={generatingInsights || !topic.trim()}
                  className={[
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
                    generatingInsights || !topic.trim()
                      ? 'cursor-not-allowed border-white/20 text-muted/40'
                      : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
                  ].join(' ')}
                >
                  {generatingInsights ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {generatingInsights ? 'Analysing…' : 'Generate with AI'}
                </button>
              }
            />

            <div className="pt-3">
              {insightsError && (
                <p className="mb-3 text-xs text-red-500">{insightsError}</p>
              )}

              {generatingInsights && !hasInsights && (
                <div className="flex flex-col gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted/20" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted/20" />
                    </div>
                  ))}
                </div>
              )}

              {hasInsights && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Pros */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70">
                      <ThumbsUp className="h-3 w-3" />
                      For
                    </div>
                    <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                      {pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-ink/80">
                          <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Cons */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600/70">
                      <ThumbsDown className="h-3 w-3" />
                      Watch out
                    </div>
                    <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                      {cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-ink/80">
                          <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {!hasInsights && !generatingInsights && (
                <p className="text-xs text-muted/40">
                  Enter a topic above then click "Generate with AI" to get strategic pros &amp; cons.
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !topic.trim()}
            >
              {submitting ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate(WORKSPACE_PATHS.topics)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* ── Right: trending sidebar ── */}
      <aside className="custom-scrollbar hidden w-72 shrink-0 overflow-y-auto border-l border-white/30 bg-white/5 p-4 backdrop-blur-sm lg:block">
        <TrendingSidebar topic={topic} idToken={idToken} api={api} onRefresh={() => {}} />
      </aside>
    </div>
  );
}
