/**
 * DraftService — persists draft state to localStorage with timestamps.
 * Used by the auto-save mechanism to prevent data loss when users are writing posts.
 */

export interface DraftSnapshot {
  editorText: string;
  selectedImageUrls: string[];
  postTime: string;
  instruction: string;
  scope: string;
  savedAt: number; // Unix timestamp ms
}

const DRAFT_KEY_PREFIX = 'draft-autosave-';

function draftKey(topicId: string): string {
  return `${DRAFT_KEY_PREFIX}${topicId}`;
}

/**
 * Maximum age of a recoverable draft before we skip the recovery prompt.
 * 24 hours in milliseconds.
 */
export const DRAFT_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Save a draft snapshot for a given topicId.
 */
export function saveDraft(topicId: string, snapshot: Omit<DraftSnapshot, 'savedAt'>): void {
  if (!topicId) return;
  try {
    const full: DraftSnapshot = { ...snapshot, savedAt: Date.now() };
    localStorage.setItem(draftKey(topicId), JSON.stringify(full));
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Load the saved draft snapshot for a given topicId, if any.
 * Returns null if no draft exists or if the draft is stale.
 */
export function loadDraft(topicId: string): DraftSnapshot | null {
  if (!topicId) return null;
  try {
    const raw = localStorage.getItem(draftKey(topicId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftSnapshot;
    if (!parsed.savedAt || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check whether a draft exists and is not stale.
 * Returns the draft if it exists and is fresh; otherwise null.
 */
export function getRecoverableDraft(topicId: string): DraftSnapshot | null {
  const draft = loadDraft(topicId);
  if (!draft) return null;
  if (Date.now() - draft.savedAt > DRAFT_STALE_THRESHOLD_MS) {
    clearDraft(topicId);
    return null;
  }
  return draft;
}

/**
 * Delete the saved draft for a given topicId.
 */
export function clearDraft(topicId: string): void {
  if (!topicId) return;
  try {
    localStorage.removeItem(draftKey(topicId));
  } catch {
    // ignore
  }
}
