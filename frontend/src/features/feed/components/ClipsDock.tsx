import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Scissors, Plus, Pencil, Check, X as XIcon } from 'lucide-react';
import type { Clip } from '../types';
import type { SheetRow } from '../../../services/sheets';
import type { BackendApi } from '@/services/backendApi';

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

function HoverDetailCard({ clip }: { clip: Clip }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute right-[calc(100%+8px)] top-0 z-50 w-56 rounded-xl bg-white/95 backdrop-blur-md border border-white/60 shadow-2xl pointer-events-none overflow-hidden"
    >
      {/* Thumbnail */}
      {clip.thumbnailUrl ? (
        <img src={clip.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <span className="text-primary font-bold text-2xl">
            {clip.source[0]?.toUpperCase() ?? 'C'}
          </span>
        </div>
      )}
      {/* Content */}
      <div className="p-2.5">
        <p className="font-medium text-xs text-ink leading-snug line-clamp-2">{clip.articleTitle}</p>
        <p className="text-[10px] text-muted mt-1">{clip.source}{clip.publishedAt ? ` · ${clip.publishedAt}` : ''}</p>
        {clip.passageText && (
          <p className="text-[10px] text-muted/80 mt-1.5 leading-relaxed line-clamp-3 italic">{clip.passageText}</p>
        )}
      </div>
    </motion.div>
  );
}

function getScale(i: number, hoveredIndex: number | null): number {
  if (hoveredIndex === null) return 1;
  const dist = Math.abs(i - hoveredIndex);
  if (dist === 0) return 1.6;
  if (dist === 1) return 1.25;
  if (dist === 2) return 1.1;
  return 1;
}

const MAX_VISIBLE = 8;

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
  const [expanded, setExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<string | null>(null);

  // Clip passage editing
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editPassageText, setEditPassageText] = useState('');
  const [savingClipEdit, setSavingClipEdit] = useState(false);

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

  const visibleClips = clips.slice(0, MAX_VISIBLE);
  const extraCount = clips.length - MAX_VISIBLE;

  const draftRows = rows.filter(
    r => !['approved', 'published'].includes(r.status?.toLowerCase() ?? ''),
  );

  return (
    <>
      {/* Collapsed strip — always visible */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 py-3 px-1.5 rounded-l-2xl bg-white/70 backdrop-blur-md border border-white/50 shadow-xl">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white/60 transition-colors"
          title="Open clips panel"
          aria-label="Open clips panel"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Clip thumbnails */}
        {visibleClips.map((clip, i) => (
          <div
            key={clip.id}
            className="relative cursor-pointer group/thumb"
            style={{
              transform: `scale(${getScale(i, hoveredIndex)})`,
              transition: 'transform 200ms ease',
              transformOrigin: 'right center',
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => {
              setHoveredIndex(null);
              // Close confirm if hovering away
            }}
            onClick={() => onOpenArticle(clip)}
            onContextMenu={(e) => {
              e.preventDefault();
              setConfirmDeleteId(clip.id);
            }}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/50 shadow-sm">
              {clip.thumbnailUrl ? (
                <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {clip.source[0]?.toUpperCase() ?? 'C'}
                  </span>
                </div>
              )}
            </div>

            {/* Hover detail card */}
            <AnimatePresence>
              {hoveredIndex === i && <HoverDetailCard clip={clip} />}
            </AnimatePresence>

            {/* Delete confirm */}
            {confirmDeleteId === clip.id && (
              <div className="absolute right-full top-0 mr-2 flex items-center gap-1 z-50">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(null);
                  }}
                  className="rounded bg-gray-200 text-xs px-1.5 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}

        {/* +N badge */}
        {extraCount > 0 && (
          <span className="text-[10px] font-semibold text-muted mt-0.5">+{extraCount}</span>
        )}

        {/* Scissors icon with count */}
        <div className="mt-1 relative flex items-center justify-center">
          <Scissors size={14} className="text-muted" />
          {clips.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
              {clips.length > 99 ? '99' : clips.length}
            </span>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setExpanded(false)}
            />

            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-80 z-50 bg-white/90 backdrop-blur-xl border-l border-white/50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-primary" />
                  <span className="font-semibold text-sm text-ink">Clips</span>
                  <span className="text-xs text-muted">({clips.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white/60 transition-colors"
                  aria-label="Collapse clips panel"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Compose CTA — visible when clips exist */}
              {clips.length > 0 && (
                <div className="px-3 py-2 border-b border-border/50 shrink-0">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary text-primary-fg text-xs font-semibold hover:bg-primary/90 transition-colors"
                    onClick={() => { /* navigate to compose with clips context */ }}
                  >
                    <Plus size={13} />
                    Compose from {clips.length} clip{clips.length > 1 ? 's' : ''}
                  </button>
                </div>
              )}

              {/* Clips grid */}
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {clips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Scissors size={28} className="text-muted/40 mb-2" />
                    <p className="text-xs text-muted">No clips yet. Clip articles from the feed.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {clips.map((clip) => (
                      <div
                        key={clip.id}
                        draggable={editingClipId !== clip.id}
                        onDragStart={() => setDragClipId(clip.id)}
                        onDragEnd={() => setDragClipId(null)}
                        className="relative group/expanded"
                      >
                        <div
                          className="w-full aspect-square rounded-lg overflow-hidden border border-white/50 shadow-sm bg-gradient-to-br from-primary/10 to-primary/20 group-hover/expanded:ring-2 group-hover/expanded:ring-primary/30 transition-all duration-150 cursor-grab active:cursor-grabbing"
                          onClick={() => editingClipId !== clip.id && onOpenArticle(clip)}
                        >
                          {clip.thumbnailUrl ? (
                            <img
                              src={clip.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-primary font-bold text-base">
                                {clip.source[0]?.toUpperCase() ?? 'C'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-ink leading-tight line-clamp-1">
                          {clip.articleTitle}
                        </p>
                        {clip.passageText && editingClipId !== clip.id && (
                          <p className="text-[9px] text-muted italic line-clamp-1">{clip.passageText}</p>
                        )}

                        {/* Inline passage editor */}
                        {editingClipId === clip.id && (
                          <div className="mt-1 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
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

                        {/* Hover actions: pencil + delete */}
                        {editingClipId !== clip.id && (
                          <div className="absolute top-0.5 right-0.5 hidden group-hover/expanded:flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleStartEditClip(clip, e)}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-muted shadow hover:text-primary"
                              title="Edit passage"
                              aria-label="Edit clip passage"
                            >
                              <Pencil size={9} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteClip(clip.id);
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[9px] shadow hover:bg-red-600"
                              title="Delete clip"
                              aria-label="Delete clip"
                            >
                              <XIcon size={9} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-t border-border/50">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Drafts
                </span>
                <span className="text-[10px] text-muted">({draftRows.length})</span>
              </div>

              {/* Drafts list */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-4">
                {draftRows.length === 0 ? (
                  <p className="text-xs text-muted text-center py-6">No pending drafts.</p>
                ) : (
                  <div className="space-y-1 px-2">
                    {draftRows.map((row) => (
                      <div
                        key={row.topicId}
                        onDragOver={(e) => {
                          if (dragClipId) {
                            e.preventDefault();
                            setDragOverPostId(row.topicId);
                          }
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
                            {row.date && (
                              <span className="text-[10px] text-muted">{row.date}</span>
                            )}
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
          </>
        )}
      </AnimatePresence>
    </>
  );
}
