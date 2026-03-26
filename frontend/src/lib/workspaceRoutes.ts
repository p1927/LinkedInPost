import { type SheetRow } from '../services/sheets';
import { encodeTopicIdForPath, encodeTopicRouteId } from './topicRoute';

/** Logged-in app paths (relative to optional {@link import.meta.env.BASE_URL}). */
export const WORKSPACE_PATHS = {
  topics: '/topics',
  settings: '/settings',
} as const;

/**
 * React Router `<Route path>` patterns — keep in sync: editor before topic detail before topics list.
 * Use with `Routes` inside `BrowserRouter basename={…}`.
 */
export const WORKSPACE_ROUTE_PATHS = {
  topicEditor: '/topics/:topicId/editor/:variantSlot',
  topicVariants: '/topics/:topicId',
  topics: '/topics',
  settings: '/settings',
} as const;

/** `encodeURIComponent(encodeTopicRouteId(row))` segment for `/topics/:topicId/...`. */
export function topicUrlSegmentForRow(row: SheetRow): string {
  return encodeTopicIdForPath(encodeTopicRouteId(row));
}

export function topicVariantsPathForRow(row: SheetRow): string {
  return `${WORKSPACE_PATHS.topics}/${topicUrlSegmentForRow(row)}`;
}

/** `encodedSegment` = value from {@link encodeTopicIdForPath} on the raw route id. */
export function topicVariantsPathFromSegment(encodedSegment: string): string {
  return encodedSegment ? `${WORKSPACE_PATHS.topics}/${encodedSegment}` : WORKSPACE_PATHS.topics;
}

export function topicEditorPathFromSegment(
  encodedSegment: string,
  variantSlot: number,
  opts?: { openMedia?: boolean },
): string {
  const q = opts?.openMedia ? '?media=1' : '';
  if (!encodedSegment) return WORKSPACE_PATHS.topics;
  return `${WORKSPACE_PATHS.topics}/${encodedSegment}/editor/${variantSlot}${q}`;
}

/**
 * Vite `base` → React Router `basename` (no trailing slash).
 * Omit when served at `/` — wrong basename breaks all `<Route>` and `<NavLink>` matching.
 */
export function workspaceRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL ?? '/';
  const trimmed = (base.replace(/\/$/, '') || '/').trim();
  if (trimmed === '/' || trimmed === '') return undefined;
  if (!trimmed.startsWith('/')) return undefined;
  return trimmed;
}
