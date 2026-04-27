import { matchPath } from 'react-router-dom';
import { type SheetRow } from '../../../services/sheets';
import { encodeTopicIdForPath, encodeTopicRouteId } from './topicRoute';

/** Logged-in app paths (relative to optional {@link import.meta.env.BASE_URL}). */
export const WORKSPACE_PATHS = {
  topics: '/topics',
  addTopic: '/topics/new',
  settings: '/settings',
  rules: '/rules',
  campaign: '/campaign',
  usage: '/usage',
  connections: '/connections',
  enrichment: '/enrichment',
  trending: '/trending',
  automations: '/automations',
  setup: '/setup',
  admin: '/admin',
} as const;

/** GitHub Pages may 301 `/topics` → `/topics/`; normalize so list/editor matching stays stable. */
export function normalizeWorkspacePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname;
}

/**
 * React Router `<Route path>` patterns — keep in sync: editor before topic detail before topics list.
 * Use with `Routes` inside `BrowserRouter basename={…}`.
 */
export const WORKSPACE_ROUTE_PATHS = {
  addTopic: '/topics/new',
  topicEditor: '/topics/:topicId/editor/:variantSlot',
  topicVariants: '/topics/:topicId',
  topics: '/topics',
  settings: '/settings',
  rules: '/rules',
  campaign: '/campaign',
  usage: '/usage',
  connections: '/connections',
  enrichment: '/enrichment',
  trending: '/trending',
  automations: '/automations',
  setup: '/setup',
  admin: '/admin',
} as const;

/** True when the URL is the draft editor (`/topics/…/editor/…`), for layout (e.g. collapse app sidebar). */
export function isTopicEditorWorkspacePath(pathname: string): boolean {
  const p = normalizeWorkspacePathname(pathname);
  return Boolean(matchPath({ path: WORKSPACE_ROUTE_PATHS.topicEditor, end: true }, p));
}

/** `encodeURIComponent(encodeTopicRouteId(row))` segment for `/topics/:topicId/...`. */
export function topicUrlSegmentForRow(row: SheetRow): string {
  return encodeTopicIdForPath(encodeTopicRouteId(row));
}

export function topicVariantsPathForRow(row: SheetRow): string {
  return `${WORKSPACE_PATHS.topics}/${topicUrlSegmentForRow(row)}`;
}

/** Sheet variant column index (0–3) to open in the editor — matches selected variant when possible. */
function defaultEditorVariantSlotForRow(row: SheetRow): number {
  const sel = row.selectedText?.trim();
  if (!sel) return 0;
  const withIndex = [
    { text: row.variant1, originalIndex: 0 },
    { text: row.variant2, originalIndex: 1 },
    { text: row.variant3, originalIndex: 2 },
    { text: row.variant4, originalIndex: 3 },
  ].filter((v) => v.text?.trim());
  const hit = withIndex.find((v) => v.text?.trim() === sel);
  return hit?.originalIndex ?? 0;
}

export function topicEditorPathForRow(row: SheetRow, opts?: { openMedia?: boolean }): string {
  return topicEditorPathFromSegment(topicUrlSegmentForRow(row), defaultEditorVariantSlotForRow(row), opts);
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
