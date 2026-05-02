import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Plus, Pencil, Check, X as XIcon } from 'lucide-react';
import type { Clip } from '../types';
import type { SheetRow } from '../../../services/sheets';
import type { BackendApi } from '@/services/backendApi';
import { WORKSPACE_PATHS } from '../../topic-navigation/utils/workspaceRoutes';

interface ClipsDockProps {
  clips: Clip[];
  rows: SheetRow[];
  idToken: string;
  api: BackendApi;
  onDeleteClip: (clipId: string) => void;
  onUpdateClip: (clipId: string, passageText: string) => Promise<void>;
  onOpenArticle: (clip: Clip) => void;
  onOpenDraft: (row: SheetRow) => void;
  onAssignClip: (clipId: string, postId: string) => void;
}


export function ClipsDock({
  clips,
  rows,
  idToken: _idToken,
  api: _api,
  onDeleteClip,
  onUpdateClip,
  onOpenArticle,
  onOpenDraft,
  onAssignClip,
}: ClipsDockProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editPassageText, setEditPassageText] = useState('');
  const [savingClipEdit, setSavingClipEdit] = useState(false);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleStartEditClip(clip: Clip, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingClipId(clip.id);
    setEditPassageText(clip.passageText ?? '');
  }

  async function handleSaveClipEdit(clipId: string) {
    setSavingClipEdit(true);
    try {
      await onUpdateClip(clipId, editPassageText);
      setEditingClipId(null);
    } catch { /* silent */ } finally {
      setSavingClipEdit(false);
    }
  }

  const draftRows = rows.filter(
    r => !['approved', 'published'].includes(r.status?.toLowerCase() ?? ''),
  );

  return (
    <>
      {/* ── Floating pill trigger ───────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className={[
          'fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-2xl transition-all duration-200',
          'h-14 w-14',
          clips.length > 0
            ? 'bg-primary text-primary-fg hover:bg-primary/90'
            : 'bg-white/90 border border-border/60 text-muted hover:text-ink hover:bg-white',
        ].join(' ')}
        aria-label={isOpen ? 'Close clips' : 'Open clips'}
      >
        <Scissors size={20} />
        {clips.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-primary text-[10px] font-bold shadow border border-primary/20 px-1">
            {clips.length}
          </span>
        )}
      </button>

      {/* ── Expanded panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-24 right-6 z-50 w-[100px] max-h-[80vh] bg-background border border-border/60 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-ink">Clips</span>
                <span className="text-xs text-muted">({clips.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white/60 transition-colors"
                aria-label="Close clips panel"
              >
                <XIcon size={14} />
              </button>
            </div>

            {/* Compose CTA */}
            {clips.length > 0 && (
              <div className="px-3 py-2 border-b border-border/50 shrink-0">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary text-primary-fg text-xs font-semibold hover:bg-primary/90 transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(WORKSPACE_PATHS.addTopic);
                  }}
                >
                  <Plus size={13} />
                  Compose post from clips
                </button>
              </div>
            )}

            {/* Clips grid */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center px-3">
                  <p className="text-sm font-semibold text-ink mb-1">No clips yet</p>
                  <p className="text-xs text-muted">Click the scissor icon on any article card to clip it here.</p>
                </div>
              ) : (
                /* Mac Dock — vertical strip of clips with magnification on hover */
                <div className="flex flex-col items-center gap-3 py-2 px-1">
                  {clips.map((clip, i) => (
                    <div
                      key={clip.id}
                      className="relative"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Magnified tooltip — Mac Dock style */}
                      <AnimatePresence>
                        {hoveredIndex === i && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.5 }}
                            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 z-50 w-52 rounded-xl bg-white/98 backdrop-blur-md border border-white/60 shadow-2xl pointer-events-none overflow-hidden"
                          >
                            {clip.thumbnailUrl ? (
                              <img src={clip.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
                            ) : (
                              <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-violet-400/40" />
                            )}
                            <div className="p-2.5">
                              <p className="font-semibold text-xs text-ink leading-snug line-clamp-2">{clip.articleTitle}</p>
                              <p className="text-[10px] text-muted mt-0.5">{clip.source}{clip.publishedAt ? ` · ${clip.publishedAt}` : ''}</p>
                              {clip.passageText && (
                                <p className="text-[10px] text-muted/80 mt-1.5 leading-relaxed line-clamp-3 italic border-t border-border/30 pt-1.5">
                                  "{clip.passageText}"
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Dock chip */}
                      <div
                        draggable={editingClipId !== clip.id}
                        onDragStart={() => setDragClipId(clip.id)}
                        onDragEnd={() => setDragClipId(null)}
                        onClick={() => {
                          if (editingClipId !== clip.id) {
                            onOpenArticle(clip);
                            setIsOpen(false);
                          }
                        }}
                        onContextMenu={(e) => { e.preventDefault(); setConfirmDeleteId(clip.id); }}
                        className={[
                          'relative rounded-xl overflow-hidden border border-white/50 shadow-sm bg-gradient-to-br from-primary/10 to-primary/20 cursor-grab active:cursor-grabbing transition-[transform,box-shadow] duration-150',
                          hoveredIndex === i ? 'scale-150 z-10 shadow-2xl ring-2 ring-primary/40' : 'hover:scale-110',
                        ].join(' ')}
                        style={{ width: 60, height: 60 }}
                      >
                        {clip.thumbnailUrl ? (
                          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-violet-400/40" />
                        )}

                        {/* Delete confirm */}
                        {confirmDeleteId === clip.id && (
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-50 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClip(clip.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded bg-red-500 text-white text-[10px] px-1.5 py-0.5 hover:bg-red-600"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              className="rounded bg-gray-200 text-[10px] px-1.5 py-0.5"
                              aria-label="Cancel delete"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Edit + delete on hover */}
                        <AnimatePresence>
                          {hoveredIndex === i && editingClipId !== clip.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute top-0.5 right-0.5 flex flex-col gap-0.5"
                            >
                              <button
                                type="button"
                                onClick={(e) => handleStartEditClip(clip, e)}
                                className="flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-muted shadow hover:text-primary"
                                aria-label="Edit passage"
                              >
                                <Pencil size={8} aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteClip(clip.id);
                                }}
                                className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                aria-label="Delete clip"
                              >
                                <XIcon size={8} aria-hidden />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Inline passage editor */}
                      {editingClipId === clip.id && (
                        <div
          className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 w-44 flex flex-col gap-1 rounded-lg border border-primary/40 bg-white/98 p-2 shadow-xl"
          onClick={e => e.stopPropagation()}
                        >
                          <textarea
                            value={editPassageText}
                            onChange={e => setEditPassageText(e.target.value)}
                            rows={3}
                            className="w-full rounded border border-primary/40 bg-white/90 px-1.5 py-1 text-[10px] text-ink resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={savingClipEdit}
                              onClick={() => void handleSaveClipEdit(clip.id)}
                              className="flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-white disabled:opacity-50"
                            >
                              <Check size={9} />
                              {savingClipEdit ? '…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingClipId(null)}
                              className="flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-muted"
                            >
                              <XIcon size={9} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drafts section */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-t border-border/50">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Drafts</span>
              <span className="text-[10px] text-muted">({draftRows.length})</span>
            </div>

            <div className="overflow-y-auto min-h-0 pb-2 max-h-40">
              {draftRows.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No pending drafts.</p>
              ) : (
                <div className="space-y-1 px-2">
                  {draftRows.map((row) => (
                    <div
                      key={row.topicId}
                      onDragOver={(e) => {
                        if (dragClipId) { e.preventDefault(); setDragOverPostId(row.topicId); }
                      }}
                      onDragLeave={() => setDragOverPostId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragClipId) {
                          onAssignClip(dragClipId, row.topicId);
                          setDragClipId(null);
                          setDragOverPostId(null);
                        }
                      }}
                      onClick={() => onOpenDraft(row)}
                      className={[
                        'flex items-start gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                        dragOverPostId === row.topicId
                          ? 'bg-primary/10 border border-dashed border-primary/50'
                          : 'border border-transparent hover:bg-white/60',
                      ].join(' ')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink line-clamp-1">{row.topic}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={[
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              row.status?.toLowerCase() === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600',
                            ].join(' ')}
                          >
                            {row.status || 'draft'}
                          </span>
                          {row.date && <span className="text-[10px] text-muted">{row.date}</span>}
                        </div>
                      </div>
                      {dragClipId && dragOverPostId === row.topicId && (
                        <Plus size={12} className="text-primary shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
