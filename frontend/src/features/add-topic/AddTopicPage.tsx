import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type BackendApi } from '../../services/backendApi';
import { type AppSession } from '../../services/backendApi';
import { WORKSPACE_PATHS } from '../topic-navigation/utils/workspaceRoutes';
import { TrendingSidebar } from './TrendingSidebar';

const STYLE_OPTIONS = [
  'Professional',
  'Storytelling',
  'Educational',
  'Inspirational',
  'Listicle',
  'Controversial',
  'Conversational',
] as const;

function BulletList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const add = () => onChange([...items, '']);
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="shrink-0 text-muted text-sm">•</span>
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-lg border border-white/50 bg-white/40 px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/60 outline-none focus:border-primary/40 focus:bg-white/60 backdrop-blur-sm"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-md p-1 text-muted hover:text-red-500 transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-primary transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

function fieldClass(tall?: boolean) {
  return [
    'w-full rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 text-sm text-ink',
    'placeholder:text-muted/60 outline-none focus:border-primary/40 focus:bg-white/60 backdrop-blur-sm',
    'transition-colors resize-none',
    tall ? 'min-h-[6rem]' : '',
  ].join(' ');
}

export function AddTopicPage({
  idToken,
  api,
}: {
  idToken: string;
  api: BackendApi;
}) {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [about, setAbout] = useState('');
  const [meaning, setMeaning] = useState('');
  const [style, setStyle] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debounced topic for sidebar (600ms)
  const [debouncedTopic, setDebouncedTopic] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTopic(topic), 600);
    return () => clearTimeout(t);
  }, [topic]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!topic.trim()) {
        setError('Topic title is required.');
        return;
      }
      setError('');
      setSubmitting(true);
      try {
        const filteredPros = pros.filter(Boolean) as string[];
        const filteredCons = cons.filter(Boolean) as string[];
        const topicMeta = {
          about: about.trim() || undefined,
          meaning: meaning.trim() || undefined,
          style: style || undefined,
          pros: filteredPros.length ? filteredPros : undefined,
          cons: filteredCons.length ? filteredCons : undefined,
          notes: notes.trim() || undefined,
        };
        await api.addTopic(idToken, topic.trim(), topicMeta);
        navigate(WORKSPACE_PATHS.topics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add topic.');
      } finally {
        setSubmitting(false);
      }
    },
    [idToken, api, topic, about, meaning, style, pros, cons, notes, navigate],
  );

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Left panel — editor */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-1 font-heading text-xl font-bold text-ink">New Topic</h1>
          <p className="mb-6 text-sm text-muted">
            Capture your idea and research before generating a post.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Topic title */}
            <div>
              <SectionLabel>Topic title *</SectionLabel>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why remote work is changing leadership"
                className={fieldClass()}
                autoFocus
              />
            </div>

            {/* About */}
            <div>
              <SectionLabel>What is this post about?</SectionLabel>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Describe the core subject matter, context, or story behind this post..."
                className={fieldClass(true)}
                rows={4}
              />
            </div>

            {/* Meaning */}
            <div>
              <SectionLabel>Meaning to convey</SectionLabel>
              <textarea
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="What is the key takeaway or lesson you want readers to walk away with?"
                className={fieldClass(true)}
                rows={3}
              />
            </div>

            {/* Style */}
            <div>
              <SectionLabel>Content style</SectionLabel>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className={fieldClass()}
              >
                <option value="">Select a style...</option>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Pros */}
            <div>
              <SectionLabel>Pros / Arguments for</SectionLabel>
              <BulletList items={pros} onChange={setPros} placeholder="Add a pro..." />
            </div>

            {/* Cons */}
            <div>
              <SectionLabel>Cons / Counterpoints</SectionLabel>
              <BulletList items={cons} onChange={setCons} placeholder="Add a con..." />
            </div>

            {/* Research notes */}
            <div>
              <SectionLabel>Research notes</SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste links, quotes, stats, or free-form notes here..."
                className={fieldClass(true)}
                rows={5}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submitting || !topic.trim()}
              >
                {submitting ? 'Adding…' : 'Add to Queue'}
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
      </div>

      {/* Right panel — trending sidebar */}
      <aside className="custom-scrollbar hidden w-80 shrink-0 overflow-y-auto border-l border-white/40 bg-white/10 p-4 backdrop-blur-sm lg:block">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Newspaper className="h-4 w-4 text-primary" />
          Trending Research
        </div>
        <p className="mb-4 text-xs text-muted">
          Related news and topics update as you type your topic title.
        </p>
        <TrendingSidebar topic={debouncedTopic} />
      </aside>
    </div>
  );
}
