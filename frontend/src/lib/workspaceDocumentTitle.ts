import { normalizeWorkspacePathname, WORKSPACE_PATHS } from '@/features/topic-navigation/utils/workspaceRoutes';

const SUFFIX = ' — Channel Bot';

/** Browser tab title for workspace routes (basename-relative pathname). */
export function getWorkspaceDocumentTitle(pathname: string): string {
  const p = normalizeWorkspacePathname(pathname);
  if (p === WORKSPACE_PATHS.topics) return `Topics${SUFFIX}`;
  if (p.startsWith(`${WORKSPACE_PATHS.topics}/`)) {
    if (/\/editor\/\d+(?:$|[?#])/.test(p)) return `Draft editor${SUFFIX}`;
    return `Topic review${SUFFIX}`;
  }
  if (p.startsWith(WORKSPACE_PATHS.campaign)) return `Campaign${SUFFIX}`;
  if (p.startsWith(WORKSPACE_PATHS.settings)) return `Settings${SUFFIX}`;
  if (p.startsWith(WORKSPACE_PATHS.rules)) return `Rules${SUFFIX}`;
  return `Channel Bot`;
}
