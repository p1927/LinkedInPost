import type { ModuleContext } from './types';

export function documentContextBlock(ctx: ModuleContext): string {
  if (!ctx.localDocuments?.length) return '';
  const blocks = ctx.localDocuments
    .map((d) => `--- Document: ${d.name} ---\n${d.content}`)
    .join('\n\n');
  return `\n\nAdditional context documents provided by the user:\n${blocks}`;
}
