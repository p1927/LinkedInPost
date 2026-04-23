/**
 * Draft selection targeting: scope model, in-editor highlight surface, toolbar segment.
 * Prefer importing from `@/features/draft-selection-target`.
 */
export type { FormattingAction } from './model';
export {
  applyFormattingAction,
  getClampedSelectionForHighlight,
  getEffectiveScope,
  getTargetText,
  isSelectionScopeWaitingForRange,
  normalizeSelection,
  replaceTargetText,
} from './model';
export { ScopeModeToolbar } from './components/ScopeModeToolbar';
export { DraftTextareaWithHighlight } from './components/DraftTextareaWithHighlight';
