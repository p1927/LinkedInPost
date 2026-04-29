import { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X as XIcon, Link2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipToggle } from '@/components/ui/ChipToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { type BackendApi } from '../../services/backendApi';
import { type SheetRow } from '../../services/sheets';
import { WORKSPACE_PATHS } from '../topic-navigation/utils/workspaceRoutes';
import { TopicRightPanel } from './TopicRightPanel';
import type { TrendingCapabilities } from '../trending/hooks/useTrending';
import { useSpeechToText } from './useSpeechToText';
import { MicButton } from './MicButton';
import type { Clip } from '../feed/types';

// Module-level draft — survives navigation so the form isn't wiped on unmount.
const draft = {
  topic: '', about: '', meaning: '', style: '', notes: '',
  pros: [] as string[], cons: [] as string[], selectedAudience: '',
};

function clearDraft() {
  draft.topic = ''; draft.about = ''; draft.meaning = '';
  draft.style = ''; draft.notes = '';
  draft.pros = []; draft.cons = []; draft.selectedAudience = '';
}

const BUILT_IN_PERSONAS = [
  { id: 'startup-founder', name: 'Startup Founder' },
  { id: 'engineering-manager', name: 'Engineering Manager' },
  { id: 'product-manager', name: 'Product Manager' },
  { id: 'senior-developer', name: 'Senior Developer' },
] as const;

type CustomPersona = {
  id: string; name: string; concerns: string[]; ambitions: string[];
  currentFocus: string; habits: string[]; language: string;
  decisionDrivers: string[]; painPoints: string[];
};

const STYLE_OPTIONS = [
  'Professional',
  'Storytelling',
  'Educational',
  'Inspirational',
  'Listicle',
  'Controversial',
  'Conversational',
] as const;

type SectionId = 'about' | 'meaning' | 'notes';

interface SectionAttachment {
  clip: Clip;
  type: 'text' | 'link';
}

interface DropMenu {
  section: SectionId;
  clip: Clip;
  x: number;
  y: number;
}

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

/** Section wrapper that accepts clip drops and shows attachment chips. */
function DroppableSection({
  children, section, draggingClip, attachments, onDrop,
}: {
  children: React.ReactNode;
  section: SectionId;
  draggingClip: Clip | null;
  attachments: SectionAttachment[];
  onDrop: (section: SectionId, clip: Clip, x: number, y: number) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (draggingClip) { e.preventDefault(); setIsDragOver(true); }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (draggingClip) onDrop(section, draggingClip, e.clientX, e.clientY);
      }}
      className={[
        'rounded-lg transition-all duration-150',
        isDragOver ? 'ring-2 ring-primary/40 bg-primary/5 px-2 -mx-2' : '',
      ].join(' ')}
    >
      {children}
      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
            >
              {att.type === 'link' ? (
                <Link2 className="h-2.5 w-2.5 shrink-0" />
              ) : (
                <FileText className="h-2.5 w-2.5 shrink-0" />
              )}
              <span className="max-w-[140px] truncate">{att.clip.articleTitle || 'Clip'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddTopicPage({
  idToken,
  api,
  editRow,
  capabilities,
  onSaved,
}: {
  idToken: string;
  api: BackendApi;
  editRow?: SheetRow;
  capabilities?: TrendingCapabilities;
  onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stt = useSpeechToText();

  const [topic, setTopic] = useState(() => {
    if (editRow) return '';
    const paramTopic = searchParams.get('topic');
    return paramTopic ? paramTopic : draft.topic;
  });
  const [about, setAbout] = useState(() => editRow ? '' : draft.about);
  const [meaning, setMeaning] = useState(() => editRow ? '' : draft.meaning);
  const [style, setStyle] = useState(() => editRow ? '' : draft.style);
  const [notes, setNotes] = useState(() => editRow ? '' : draft.notes);
  const [pros, setPros] = useState<string[]>(() => editRow ? [] : draft.pros);
  const [cons, setCons] = useState<string[]>(() => editRow ? [] : draft.cons);

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
      if (Array.isArray(meta.pros)) setPros(meta.pros.filter((x): x is string => typeof x === 'string'));
      if (Array.isArray(meta.cons)) setCons(meta.cons.filter((x): x is string => typeof x === 'string'));
      if (typeof meta.notes === 'string') setNotes(meta.notes);
      if (typeof meta.audience === 'string') setSelectedAudience(meta.audience);
    }
  }, [editRow?.topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [selectedAudience, setSelectedAudience] = useState(() => editRow ? '' : draft.selectedAudience);
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);
  const [deletingPersonaId, setDeletingPersonaId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggingClip, setDraggingClip] = useState<Clip | null>(null);
  const [dropMenu, setDropMenu] = useState<DropMenu | null>(null);
  const [sectionAttachments, setSectionAttachments] = useState<Record<SectionId, SectionAttachment[]>>({
    about: [], meaning: [], notes: [],
  });
  const [attachedClipIds, setAttachedClipIds] = useState<Set<string>>(new Set());

  // Keep the draft in sync so changes survive navigation (only for new topics).
  useEffect(() => {
    if (editRow) return;
    draft.topic = topic; draft.about = about; draft.meaning = meaning;
    draft.style = style; draft.notes = notes;
    draft.pros = pros; draft.cons = cons; draft.selectedAudience = selectedAudience;
  }, [editRow, topic, about, meaning, style, notes, pros, cons, selectedAudience]);

  // Debounced topic for sidebar (600 ms)
  const [debouncedTopic, setDebouncedTopic] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTopic(topic), 600);
    return () => clearTimeout(t);
  }, [topic]);

  // Load custom personas on mount
  useEffect(() => {
    api.listCustomPersonas(idToken).then(setCustomPersonas).catch(() => {});
  }, [idToken, api]);

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
          audience: selectedAudience || undefined,
        };
        if (editRow) {
          await api.updateTopicMeta(idToken, editRow.topicId, topic.trim(), topicMeta);
        } else {
          await api.addTopic(idToken, topic.trim(), topicMeta);
          clearDraft();
        }
        onSaved?.();
        navigate(WORKSPACE_PATHS.topics);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to add topic.');
      } finally {
        setSubmitting(false);
      }
    },
    [idToken, api, topic, about, meaning, style, pros, cons, notes, selectedAudience, navigate, onSaved],
  );

  // Append text to a section textarea
  const appendToSection = useCallback((section: SectionId, text: string) => {
    switch (section) {
      case 'about': setAbout(prev => prev ? `${prev}\n\n${text}` : text); break;
      case 'meaning': setMeaning(prev => prev ? `${prev}\n\n${text}` : text); break;
      case 'notes': setNotes(prev => prev ? `${prev}\n\n${text}` : text); break;
    }
  }, []);

  const handleDropOnSection = useCallback((section: SectionId, clip: Clip, x: number, y: number) => {
    setDropMenu({ section, clip, x, y });
  }, []);

  const handleDropMenuAction = useCallback((type: 'text' | 'link') => {
    if (!dropMenu) return;
    const { section, clip } = dropMenu;
    const textToAdd = type === 'text'
      ? (clip.passageText || clip.articleTitle)
      : `[${clip.articleTitle}](${clip.articleUrl})`;
    appendToSection(section, textToAdd);
    setSectionAttachments(prev => ({
      ...prev,
      [section]: [...prev[section], { clip, type }],
    }));
    setAttachedClipIds(prev => new Set([...prev, clip.id]));
    setDropMenu(null);
  }, [dropMenu, appendToSection]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* ── Drop context menu overlay ── */}
      {dropMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropMenu(null)}
          />
          <div
            className="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur-md"
            style={{
              left: dropMenu.x,
              top: dropMenu.y,
              transform: 'translate(-50%, -10px)',
            }}
          >
            <div className="border-b border-black/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Attach clip
            </div>
            <button
              type="button"
              onClick={() => handleDropMenuAction('text')}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm text-black/80 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Paste text
            </button>
            <button
              type="button"
              onClick={() => handleDropMenuAction('link')}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm text-black/80 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              Paste link
            </button>
          </div>
        </>
      )}

      {/* ── Left: document editor ── */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-8 py-10">

          {/* Document title + voice button */}
          <div className="mb-8 flex items-start gap-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Untitled post…"
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
            <DroppableSection
              section="about"
              draggingClip={draggingClip}
              attachments={sectionAttachments.about}
              onDrop={handleDropOnSection}
            >
              <div className="pt-3">
                <DocTextarea
                  value={about}
                  onChange={setAbout}
                  placeholder="What is this post about? Describe the context, story, or angle you want to explore…"
                  minRows={3}
                />
              </div>
            </DroppableSection>
          </div>

          {/* Message */}
          <div className="mb-6">
            <SectionDivider label="Message to convey" />
            <DroppableSection
              section="meaning"
              draggingClip={draggingClip}
              attachments={sectionAttachments.meaning}
              onDrop={handleDropOnSection}
            >
              <div className="pt-3">
                <DocTextarea
                  value={meaning}
                  onChange={setMeaning}
                  placeholder="What should readers walk away thinking or feeling? What's the core takeaway?"
                  minRows={2}
                />
              </div>
            </DroppableSection>
          </div>

          {/* Persona */}
          <div className="mb-6">
            <SectionDivider
              label="Target audience"
              action={
                <button
                  type="button"
                  onClick={() => setShowPersonaDialog(true)}
                  className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-all duration-150"
                >
                  + New persona
                </button>
              }
            />
            <div className="flex flex-wrap gap-2 pt-3">
              {[...BUILT_IN_PERSONAS, ...customPersonas.map((p) => ({ id: p.id, name: p.name }))].map((p) => (
                <div key={p.id} className="relative group">
                  <ChipToggle
                    selected={selectedAudience === p.id}
                    onClick={() => setSelectedAudience(selectedAudience === p.id ? '' : p.id)}
                    aria-label={p.name}
                  >
                    {p.name}
                  </ChipToggle>
                  {!BUILT_IN_PERSONAS.some((bp) => bp.id === p.id) && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (deletingPersonaId === p.id) return;
                        setDeletingPersonaId(p.id);
                        try {
                          await api.deleteCustomPersona(idToken, p.id);
                          setCustomPersonas((prev) => prev.filter((cp) => cp.id !== p.id));
                          setSelectedAudience((prev) => (prev === p.id ? '' : prev));
                        } finally {
                          setDeletingPersonaId(null);
                        }
                      }}
                      disabled={deletingPersonaId === p.id}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label={`Delete ${p.name}`}
                    >
                      <XIcon className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
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

          {/* Research notes */}
          <div className="mb-6">
            <SectionDivider label="Research notes" />
            <DroppableSection
              section="notes"
              draggingClip={draggingClip}
              attachments={sectionAttachments.notes}
              onDrop={handleDropOnSection}
            >
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
            </DroppableSection>
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

          {/* Create Persona Dialog */}
          <CreatePersonaDialog
            open={showPersonaDialog}
            onClose={() => setShowPersonaDialog(false)}
            onCreated={(persona) => {
              setCustomPersonas((prev) => [...prev, persona]);
              setSelectedAudience(persona.id);
              setShowPersonaDialog(false);
            }}
            api={api}
            idToken={idToken}
          />
        </form>
      </div>

      {/* ── Right: tabbed panel (Trending / Research / Analysis) ── */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-white/30 bg-white/5 backdrop-blur-sm lg:flex">
        <TopicRightPanel
          topic={debouncedTopic}
          idToken={idToken}
          api={api}
          capabilities={capabilities}
          pros={pros}
          cons={cons}
          generatingInsights={generatingInsights}
          insightsError={insightsError}
          onGenerateInsights={handleGenerateInsights}
          topicEntered={!!topic.trim()}
          onClipDragStart={(clip) => setDraggingClip(clip)}
          onClipDragEnd={() => setDraggingClip(null)}
          attachedClipIds={attachedClipIds}
        />
      </aside>
    </div>
  );
}

function parseCommaList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function CreatePersonaDialog({
  open,
  onClose,
  onCreated,
  api,
  idToken,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (persona: CustomPersona) => void;
  api: BackendApi;
  idToken: string;
}) {
  const [name, setName] = useState('');
  const [currentFocus, setCurrentFocus] = useState('');
  const [language, setLanguage] = useState('');
  const [concerns, setConcerns] = useState('');
  const [ambitions, setAmbitions] = useState('');
  const [habits, setHabits] = useState('');
  const [decisionDrivers, setDecisionDrivers] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setName(''); setCurrentFocus(''); setLanguage('');
      setConcerns(''); setAmbitions(''); setHabits('');
      setDecisionDrivers(''); setPainPoints(''); setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const created = await api.createCustomPersona(idToken, {
        name: name.trim(),
        currentFocus: currentFocus.trim(),
        language: language.trim(),
        concerns: parseCommaList(concerns),
        ambitions: parseCommaList(ambitions),
        habits: parseCommaList(habits),
        decisionDrivers: parseCommaList(decisionDrivers),
        painPoints: parseCommaList(painPoints),
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create persona.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create custom persona</DialogTitle>
          <DialogDescription>Define the audience profile for your content.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth-stage SaaS founder"
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Current focus</label>
            <input
              type="text"
              value={currentFocus}
              onChange={(e) => setCurrentFocus(e.target.value)}
              placeholder="What are they focused on right now?"
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Language / tone</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. Direct, first-principles, opinionated"
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Concerns (comma-separated)</label>
            <textarea
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="e.g. Extending runway, finding PMF, hiring the right people"
              rows={2}
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Ambitions (comma-separated)</label>
            <textarea
              value={ambitions}
              onChange={(e) => setAmbitions(e.target.value)}
              placeholder="e.g. Building category-defining products, reaching Series A"
              rows={2}
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Habits (comma-separated)</label>
            <textarea
              value={habits}
              onChange={(e) => setHabits(e.target.value)}
              placeholder="e.g. Reviews metrics every morning, attends 3-5 coffees per week"
              rows={2}
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Decision drivers (comma-separated)</label>
            <textarea
              value={decisionDrivers}
              onChange={(e) => setDecisionDrivers(e.target.value)}
              placeholder="e.g. Speed and reversibility, signal vs noise, leverage"
              rows={2}
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Pain points (comma-separated)</label>
            <textarea
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              placeholder="e.g. Too many priorities, advice is abundant but not actionable"
              rows={2}
              className="w-full rounded border border-white/30 bg-white/10 px-3 py-2 text-sm text-ink outline-none focus:border-primary/50"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
