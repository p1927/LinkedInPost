# Feed Features L/M/Q/R — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four remaining unbuilt feed features: Connection Finder (L), Debate Mode (M), Cross-domain Surprise (Q), and Opinion Leaders (R).

**Architecture:** Each feature follows the same pattern — a new `case` in `worker/src/index.ts` using `generateTextJsonWithFallback`, a new method in `backendApi.ts`, and wiring in the existing React components. No new routes, no new DB tables.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Cloudflare Worker, `generateTextJsonWithFallback` (existing LLM helper).

---

## Gap Analysis

| Feature | Status | Location |
|---------|--------|----------|
| L — Connection Finder | Placeholder text only | `ArticleDetailView.tsx` Tab L |
| M — Debate Mode | Not built | Needs new component + FeedPage mode |
| Q — Cross-domain Surprise | Placeholder text | `DraftContextView.tsx` Tab Q |
| R — Opinion Leaders | Placeholder text | `DraftContextView.tsx` Tab R |

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `frontend/src/features/feed/types.ts` | Modify | Add `DraftConnection`, `DebateArticle`, `CrossDomainInsight`, `OpinionLeaderInsight` interfaces |
| `worker/src/index.ts` | Modify | Add 4 new `case` blocks after `clusterDraftClips` |
| `frontend/src/services/backendApi.ts` | Modify | Add 4 new methods after `clusterDraftClips` (line 1463) |
| `frontend/src/features/feed/components/ArticleDetailView.tsx` | Modify | Accept `rows` prop, fetch connections, render Tab L, add Debate button |
| `frontend/src/features/feed/components/DebateModeView.tsx` | Create | Split-screen debate component |
| `frontend/src/features/feed/components/DraftContextView.tsx` | Modify | Fetch + render Q and R tabs |
| `frontend/src/features/feed/FeedPage.tsx` | Modify | Pass `rows` to ArticleDetailView, add debate state, render DebateModeView |

---

## Task 1: Add new types to `frontend/src/features/feed/types.ts`

**Files:**
- Modify: `frontend/src/features/feed/types.ts`

- [ ] **Add these interfaces at the end of the file:**

```typescript
export interface DraftConnection {
  topicId: string
  topic: string
  reason: string
}

export interface DraftConnectionsResult {
  connections: DraftConnection[]
}

export interface DebateArticle {
  title: string
  summary: string
  source: string
  opposingAngle: string
  keyArguments: string[]
}

export interface CrossDomainInsight {
  domain: string
  connection: string
  postAngle: string
}

export interface CrossDomainResult {
  insights: CrossDomainInsight[]
}

export interface OpinionLeaderInsight {
  name: string
  role: string
  perspective: string
  postAngle: string
}

export interface OpinionLeadersResult {
  leaders: OpinionLeaderInsight[]
}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```
Expected: no new errors.

---

## Task 2: Add 4 worker cases to `worker/src/index.ts`

**Files:**
- Modify: `worker/src/index.ts` — insert after the closing `}` of `case 'clusterDraftClips'` (after line 1755)

- [ ] **Insert after line 1755 (after the clusterDraftClips case closing brace):**

```typescript
    case 'findDraftConnections': {
      const title = String(payload.title || '').trim();
      const description = String(payload.description || '').trim();
      const drafts = Array.isArray(payload.drafts) ? payload.drafts as { topicId: string; topic: string }[] : [];
      if (!title || drafts.length === 0) return { connections: [] };
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      const primary = resolveStoredPrimary(ws, true);
      const fallback = resolveStoredFallback(ws, true);
      const draftList = drafts.map((d, i) => `[${i}] topicId=${d.topicId}: "${d.topic}"`).join('\n');
      const prompt = `You are a content strategy assistant. A LinkedIn creator is reading an article and wants to know which of their existing post drafts this article relates to.

Article:
Title: ${title}
${description ? `Description: ${description}` : ''}

Existing drafts:
${draftList}

Return ONLY valid JSON:
{
  "connections": [
    { "topicId": "the topicId string", "topic": "the draft topic", "reason": "1 sentence explaining how this article relates to that draft" }
  ]
}

Rules:
- Only include drafts that genuinely relate to the article (skip unrelated ones)
- If no drafts relate, return { "connections": [] }
- reason must be specific, not generic — mention something from the article
- Max 4 connections
- No markdown, just JSON`;
      const { text } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: { connections: { topicId: string; topic: string; reason: string }[] };
      try { parsed = JSON.parse(cleaned); }
      catch { return { connections: [] }; }
      return {
        connections: Array.isArray(parsed.connections) ? parsed.connections.map(c => ({
          topicId: String(c.topicId || ''),
          topic: String(c.topic || ''),
          reason: String(c.reason || ''),
        })) : [],
      };
    }
    case 'findDebateArticle': {
      const title = String(payload.title || '').trim();
      const description = String(payload.description || '').trim();
      if (!title) throw new Error('title is required.');
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      const primary = resolveStoredPrimary(ws, true);
      const fallback = resolveStoredFallback(ws, true);
      const prompt = `You are a content strategy assistant helping a LinkedIn creator stress-test their thinking by finding a genuinely opposing perspective.

Article:
Title: ${title}
${description ? `Description: ${description}` : ''}

Generate a realistic opposing article — something a credible publication might actually publish that contradicts, challenges, or reframes the original article's thesis.

Return ONLY valid JSON:
{
  "title": "Title of the opposing article (realistic, publication-ready)",
  "summary": "2-3 sentence summary of what this opposing article argues",
  "source": "Plausible publication name (e.g. Harvard Business Review, MIT Technology Review)",
  "opposingAngle": "The core thesis that contradicts the original article (1 sentence)",
  "keyArguments": ["argument1", "argument2", "argument3"]
}

Rules:
- Make the title and source feel realistic and credible
- keyArguments: exactly 3 distinct points (max 20 words each)
- No markdown, just JSON`;
      const { text } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: { title: string; summary: string; source: string; opposingAngle: string; keyArguments: string[] };
      try { parsed = JSON.parse(cleaned); }
      catch { throw new Error('AI returned unexpected format. Please try again.'); }
      return {
        title: String(parsed.title || ''),
        summary: String(parsed.summary || ''),
        source: String(parsed.source || ''),
        opposingAngle: String(parsed.opposingAngle || ''),
        keyArguments: Array.isArray(parsed.keyArguments) ? parsed.keyArguments.map(String).slice(0, 3) : [],
      };
    }
    case 'crossDomainInsight': {
      const topic = String(payload.topic || '').trim();
      if (!topic) throw new Error('topic is required.');
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      const primary = resolveStoredPrimary(ws, true);
      const fallback = resolveStoredFallback(ws, true);
      const prompt = `You are a content strategy assistant helping a LinkedIn creator find surprising cross-domain connections that make their posts more interesting and original.

Topic: ${topic}

Find 3 insights from completely different fields (psychology, biology, sports, military strategy, architecture, music, etc.) that unexpectedly illuminate this topic. Think: what principle from another world applies here in a non-obvious way?

Return ONLY valid JSON:
{
  "insights": [
    {
      "domain": "The other field (e.g. Evolutionary Biology)",
      "connection": "2 sentences explaining the cross-domain analogy — what concept from that field maps onto this topic",
      "postAngle": "A specific LinkedIn post angle using this connection (1 sentence, actionable)"
    }
  ]
}

Rules:
- Exactly 3 insights
- Domains must be genuinely different from each other
- Connections must be specific and non-obvious — not generic ("just like in sports, teamwork matters")
- postAngle must be a concrete hook a LinkedIn creator can actually use
- No markdown, just JSON`;
      const { text } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: { insights: { domain: string; connection: string; postAngle: string }[] };
      try { parsed = JSON.parse(cleaned); }
      catch { throw new Error('AI returned unexpected format. Please try again.'); }
      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights.map(ins => ({
          domain: String(ins.domain || ''),
          connection: String(ins.connection || ''),
          postAngle: String(ins.postAngle || ''),
        })).slice(0, 3) : [],
      };
    }
    case 'opinionLeaderInsights': {
      const topic = String(payload.topic || '').trim();
      if (!topic) throw new Error('topic is required.');
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      const primary = resolveStoredPrimary(ws, true);
      const fallback = resolveStoredFallback(ws, true);
      const prompt = `You are a content strategy assistant helping a LinkedIn creator understand different expert perspectives on a topic so they can write more nuanced posts.

Topic: ${topic}

Generate 4 distinct opinion leader perspectives — realistic takes from credible professionals who would have strong, divergent views on this topic. Base these on actual patterns of thought leadership in this domain.

Return ONLY valid JSON:
{
  "leaders": [
    {
      "name": "Realistic full name",
      "role": "Job title and company/context (e.g. Partner at McKinsey, ex-Google VP)",
      "perspective": "2 sentences capturing their specific take on this topic — their angle, what they emphasize, what they'd push back on",
      "postAngle": "The LinkedIn post this person would write — a 1-sentence hook"
    }
  ]
}

Rules:
- Exactly 4 leaders with genuinely different viewpoints (not just different industries)
- Names and roles should feel realistic but be clearly fictional composites
- Perspectives must disagree with each other in interesting ways
- postAngle must be a specific, opinionated hook — not generic
- No markdown, just JSON`;
      const { text } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
      const cleaned = text.replace(/```json|```/g, '').trim();
      let parsed: { leaders: { name: string; role: string; perspective: string; postAngle: string }[] };
      try { parsed = JSON.parse(cleaned); }
      catch { throw new Error('AI returned unexpected format. Please try again.'); }
      return {
        leaders: Array.isArray(parsed.leaders) ? parsed.leaders.map(l => ({
          name: String(l.name || ''),
          role: String(l.role || ''),
          perspective: String(l.perspective || ''),
          postAngle: String(l.postAngle || ''),
        })).slice(0, 4) : [],
      };
    }
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && npx tsc --noEmit --skipLibCheck -p worker/tsconfig.json 2>&1 | head -30
```
Expected: no new errors.

---

## Task 3: Add 4 API methods to `frontend/src/services/backendApi.ts`

**Files:**
- Modify: `frontend/src/services/backendApi.ts` — insert after the `clusterDraftClips` method (after line 1463), before the closing `}`

- [ ] **Add these 4 methods. First add the imports at the top of the file — check if `DraftConnectionsResult`, `DebateArticle`, `CrossDomainResult`, `OpinionLeadersResult` need to be imported. They live in `frontend/src/features/feed/types.ts`. Find the existing import from that file and add to it, or add a new import:**

Look for existing import of feed types:
```bash
grep -n "features/feed/types" /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/services/backendApi.ts
```

If found, add the new types to the existing import. If not found, add:
```typescript
import type { ArticleAnalysis, ClipClusterResult, DraftConnectionsResult, DebateArticle, CrossDomainResult, OpinionLeadersResult } from '../features/feed/types';
```

- [ ] **Find the existing `ArticleAnalysis` and `ClipClusterResult` import and extend it:**
```bash
grep -n "ArticleAnalysis\|ClipClusterResult" /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend/src/services/backendApi.ts | head -5
```

- [ ] **Add the 4 methods after `clusterDraftClips` (before the closing `}` of the class at line 1464):**

```typescript
  findDraftConnections(
    idToken: string,
    payload: { title: string; description: string; drafts: { topicId: string; topic: string }[] },
  ): Promise<DraftConnectionsResult> {
    return this.post<DraftConnectionsResult>('findDraftConnections', idToken, payload as unknown as Record<string, unknown>);
  }

  findDebateArticle(idToken: string, payload: { title: string; description: string }): Promise<DebateArticle> {
    return this.post<DebateArticle>('findDebateArticle', idToken, payload);
  }

  crossDomainInsight(idToken: string, payload: { topic: string }): Promise<CrossDomainResult> {
    return this.post<CrossDomainResult>('crossDomainInsight', idToken, payload);
  }

  opinionLeaderInsights(idToken: string, payload: { topic: string }): Promise<OpinionLeadersResult> {
    return this.post<OpinionLeadersResult>('opinionLeaderInsights', idToken, payload);
  }
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```
Expected: no errors.

---

## Task 4: Wire Connection Finder (Tab L) in `ArticleDetailView.tsx`

**Files:**
- Modify: `frontend/src/features/feed/components/ArticleDetailView.tsx`

- [ ] **Add `rows` to the import and props.** At the top, add:
```typescript
import type { SheetRow } from '../../../services/sheets';
import type { DraftConnection } from '../types';
```

Update the props interface:
```typescript
interface ArticleDetailViewProps {
  article: NewsArticle;
  idToken: string;
  api: BackendApi;
  onBack: () => void;
  onClip: (article: NewsArticle) => void;
  isClipped: boolean;
  rows?: SheetRow[];
  onOpenDraft?: (row: SheetRow) => void;
  onDebate?: () => void;
}
```

Update the function signature:
```typescript
export function ArticleDetailView({
  article,
  idToken,
  api,
  onBack,
  onClip,
  isClipped,
  rows = [],
  onOpenDraft,
  onDebate,
}: ArticleDetailViewProps) {
```

- [ ] **Add connection state** after `const [opinionResponse, setOpinionResponse] = useState('');`:
```typescript
  const [connections, setConnections] = useState<DraftConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
```

- [ ] **Add fetch effect for connections** after the existing `useEffect` for `fetchAnalysis`:
```typescript
  useEffect(() => {
    if (rows.length === 0) return;
    setConnectionsLoading(true);
    api
      .findDraftConnections(idToken, {
        title: article.title,
        description: article.description ?? '',
        drafts: rows.map(r => ({ topicId: r.topicId ?? '', topic: r.topic ?? '' })).filter(d => d.topicId && d.topic),
      })
      .then(result => setConnections(result.connections))
      .catch(() => setConnections([]))
      .finally(() => setConnectionsLoading(false));
  }, [article.url, idToken, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Add a Debate button** in the action row (after the Clip button, before the closing `</div>` of the action row div at ~line 168):
```tsx
          {onDebate && (
            <button
              type="button"
              onClick={onDebate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold text-muted hover:border-amber-400/60 hover:text-amber-700 transition-colors"
              title="Find an opposing article"
            >
              <Scale size={14} />
              Debate
            </button>
          )}
```

- [ ] **Replace the Tab L placeholder** — find the connection tab content (the `{activeTab === 'connection' && ...}` block) and replace it:
```tsx
          {/* Tab L — Connection */}
          {activeTab === 'connection' && (
            <div className="space-y-2">
              {connectionsLoading && (
                <div className="space-y-2">
                  <SkeletonLine />
                  <SkeletonLine width="w-4/5" />
                </div>
              )}
              {!connectionsLoading && connections.length === 0 && (
                <p className="text-xs text-muted leading-relaxed italic">
                  {rows.length === 0
                    ? 'Open a draft from the Clips Dock to see connections.'
                    : 'No drafts seem to relate to this article.'}
                </p>
              )}
              {!connectionsLoading && connections.map(conn => (
                <div
                  key={conn.topicId}
                  className="rounded-lg border border-border/40 bg-white/50 px-3 py-2.5 space-y-1"
                >
                  <p className="text-xs font-semibold text-ink line-clamp-1">{conn.topic}</p>
                  <p className="text-[11px] text-muted leading-relaxed">{conn.reason}</p>
                  {onOpenDraft && (
                    <button
                      type="button"
                      onClick={() => {
                        const row = rows.find(r => r.topicId === conn.topicId);
                        if (row) onOpenDraft(row);
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Open Draft →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```
Expected: no errors.

---

## Task 5: Create `DebateModeView.tsx`

**Files:**
- Create: `frontend/src/features/feed/components/DebateModeView.tsx`

- [ ] **Create the file with this complete content:**

```tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Scale, ExternalLink, Scissors, AlertTriangle } from 'lucide-react';
import type { NewsArticle } from '../../trending/types';
import type { BackendApi } from '@/services/backendApi';
import type { DebateArticle } from '../types';

interface DebateModeViewProps {
  article: NewsArticle;
  idToken: string;
  api: BackendApi;
  onBack: () => void;
  onClip: (article: NewsArticle) => void;
  isClipped: boolean;
}

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-3 rounded bg-violet-100 animate-pulse ${width}`} />;
}

export function DebateModeView({
  article,
  idToken,
  api,
  onBack,
  onClip,
  isClipped,
}: DebateModeViewProps) {
  const [debate, setDebate] = useState<DebateArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebate = () => {
    setLoading(true);
    setError(null);
    api
      .findDebateArticle(idToken, {
        title: article.title,
        description: article.description ?? '',
      })
      .then(setDebate)
      .catch((e: unknown) =>
        setError((e instanceof Error ? e.message : null) || 'Could not find opposing article.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDebate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.url, idToken]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Feed
        </button>
        <div className="flex items-center gap-1.5 ml-2">
          <Scale size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-ink">Debate Mode</span>
        </div>
        <span className="ml-auto text-xs text-muted italic">Two sides of the same topic</span>
      </div>

      {/* Split panels */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Original article */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-blue-200/60 bg-blue-50/30 backdrop-blur-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
              Original
            </span>
            {article.source && (
              <span className="text-[11px] text-muted">{article.source}</span>
            )}
          </div>

          {article.imageUrl && (
            <div className="w-full overflow-hidden rounded-xl">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full max-h-36 object-cover"
              />
            </div>
          )}

          <h2 className="text-base font-bold text-ink leading-snug">{article.title}</h2>

          {article.description && (
            <p className="text-sm text-ink/80 leading-relaxed">{article.description}</p>
          )}

          <div className="flex items-center gap-2 pt-1 mt-auto">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary/90 transition-colors"
            >
              Read Full <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={() => onClip(article)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                isClipped
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted hover:border-primary/50 hover:text-primary',
              ].join(' ')}
            >
              <Scissors size={12} />
              {isClipped ? 'Clipped' : 'Clip'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="w-px flex-1 bg-amber-200/60" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
            <Scale size={14} className="text-amber-600" />
          </div>
          <div className="w-px flex-1 bg-amber-200/60" />
        </div>

        {/* RIGHT: Opposing article */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-amber-200/60 bg-amber-50/30 backdrop-blur-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
              Opposing View
            </span>
            {debate?.source && (
              <span className="text-[11px] text-muted">{debate.source}</span>
            )}
          </div>

          {loading && (
            <div className="space-y-2 flex-1">
              <SkeletonLine />
              <SkeletonLine width="w-5/6" />
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-3/4" />
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle size={13} />
                {error}
              </div>
              <button
                type="button"
                onClick={fetchDebate}
                className="text-xs font-semibold text-primary hover:underline w-fit"
              >
                Try again
              </button>
            </div>
          )}

          {debate && !loading && (
            <>
              <h2 className="text-base font-bold text-ink leading-snug">{debate.title}</h2>

              <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Core argument</p>
                <p className="text-xs text-ink/80 italic leading-relaxed">{debate.opposingAngle}</p>
              </div>

              <p className="text-sm text-ink/80 leading-relaxed">{debate.summary}</p>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Key arguments</p>
                {debate.keyArguments.map((arg, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-ink/80">
                    <span className="shrink-0 font-bold text-amber-600">{i + 1}.</span>
                    {arg}
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted italic mt-auto pt-2 border-t border-amber-200/40">
                AI-generated opposing perspective. Use as a thinking tool.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```
Expected: no errors.

---

## Task 6: Wire Debate Mode in `FeedPage.tsx`

**Files:**
- Modify: `frontend/src/features/feed/FeedPage.tsx`

- [ ] **Add import at the top of FeedPage.tsx:**
```typescript
import { DebateModeView } from './components/DebateModeView';
```

- [ ] **Add debate state** after `const [openDraft, setOpenDraft] = useState<SheetRow | null>(null);`:
```typescript
  const [debateMode, setDebateMode] = useState(false);
```

- [ ] **Pass new props to ArticleDetailView.** Find the `<ArticleDetailView` JSX and add:
```tsx
          rows={rows}
          onOpenDraft={(row) => { setOpenArticle(null); setOpenDraft(row); }}
          onDebate={() => setDebateMode(true)}
```

- [ ] **Add DebateModeView rendering.** Find the block that renders ArticleDetailView (inside the mode check) and wrap/extend it. Find where `openArticle` is rendered and add the debate mode check:

Find the pattern `{openArticle && <ArticleDetailView` and replace the surrounding conditional with:

```tsx
          {openArticle && !debateMode && (
            <ArticleDetailView
              article={openArticle}
              idToken={idToken}
              api={api}
              onBack={() => setOpenArticle(null)}
              onClip={handleClip}
              isClipped={clippedUrls.has(openArticle.url)}
              rows={rows}
              onOpenDraft={(row) => { setOpenArticle(null); setOpenDraft(row); }}
              onDebate={() => setDebateMode(true)}
            />
          )}
          {openArticle && debateMode && (
            <DebateModeView
              article={openArticle}
              idToken={idToken}
              api={api}
              onBack={() => setDebateMode(false)}
              onClip={handleClip}
              isClipped={clippedUrls.has(openArticle.url)}
            />
          )}
```

- [ ] **Reset debate mode when article closes.** Find `setOpenArticle(null)` calls in `onBack` handlers and ensure `setDebateMode(false)` is also called alongside them. The existing `onBack={() => setOpenArticle(null)}` in any other location should become:
```tsx
onBack={() => { setOpenArticle(null); setDebateMode(false); }}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```
Expected: no errors.

---

## Task 7: Wire Cross-domain (Q) and Opinion Leaders (R) in `DraftContextView.tsx`

**Files:**
- Modify: `frontend/src/features/feed/components/DraftContextView.tsx`

- [ ] **Add imports at top:**
```typescript
import type { CrossDomainInsight, OpinionLeaderInsight } from '../types';
import { Copy, Check } from 'lucide-react';
```

- [ ] **Add state** after `const [clusterTrigger, setClusterTrigger] = useState(0);`:
```typescript
  const [crossDomain, setCrossDomain] = useState<CrossDomainInsight[] | null>(null);
  const [crossDomainLoading, setCrossDomainLoading] = useState(false);
  const [crossDomainError, setCrossDomainError] = useState<string | null>(null);

  const [opinionLeaders, setOpinionLeaders] = useState<OpinionLeaderInsight[] | null>(null);
  const [opinionLeadersLoading, setOpinionLeadersLoading] = useState(false);
  const [opinionLeadersError, setOpinionLeadersError] = useState<string | null>(null);
```

- [ ] **Add a CopyButton helper** right after the SkeletonCard function (before the DraftContextView function):
```typescript
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 text-muted hover:text-primary transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}
```

- [ ] **Add fetch effects** after the existing `useEffect` blocks (after line ~78):
```typescript
  const topic = row.topic ?? '';

  useEffect(() => {
    if (activeContextTab !== 'q' || crossDomain !== null || !topic) return;
    setCrossDomainLoading(true);
    setCrossDomainError(null);
    api
      .crossDomainInsight(idToken, { topic })
      .then(result => setCrossDomain(result.insights))
      .catch((e: unknown) => setCrossDomainError((e instanceof Error ? e.message : null) || 'Could not load insights.'))
      .finally(() => setCrossDomainLoading(false));
  }, [activeContextTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeContextTab !== 'r' || opinionLeaders !== null || !topic) return;
    setOpinionLeadersLoading(true);
    setOpinionLeadersError(null);
    api
      .opinionLeaderInsights(idToken, { topic })
      .then(result => setOpinionLeaders(result.leaders))
      .catch((e: unknown) => setOpinionLeadersError((e instanceof Error ? e.message : null) || 'Could not load leaders.'))
      .finally(() => setOpinionLeadersLoading(false));
  }, [activeContextTab]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Replace the placeholder Q tab content.** Find the block `{activeContextTab === 'q' && (` and replace the inner content:
```tsx
            {activeContextTab === 'q' && (
              <div className="space-y-2">
                {crossDomainLoading && (
                  <div className="space-y-2">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {crossDomainError && (
                  <p className="text-xs text-red-500">{crossDomainError}</p>
                )}
                {!crossDomainLoading && crossDomain && crossDomain.map((ins, i) => (
                  <div key={i} className="rounded-lg border border-border/30 bg-white/70 p-2.5 space-y-1.5">
                    <span className="inline-block rounded-full bg-violet-100 border border-violet-200/60 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                      {ins.domain}
                    </span>
                    <p className="text-xs text-ink/80 leading-relaxed">{ins.connection}</p>
                    <div className="flex items-start gap-1.5 rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                      <p className="text-xs font-medium text-primary flex-1 leading-relaxed">{ins.postAngle}</p>
                      <CopyButton text={ins.postAngle} />
                    </div>
                  </div>
                ))}
                {!crossDomainLoading && !crossDomain && !crossDomainError && !topic && (
                  <p className="text-xs text-muted leading-relaxed italic">
                    Draft needs a topic to find cross-domain connections.
                  </p>
                )}
              </div>
            )}
```

- [ ] **Replace the placeholder R tab content.** Find the block `{activeContextTab === 'r' && (` and replace:
```tsx
            {activeContextTab === 'r' && (
              <div className="space-y-2">
                {opinionLeadersLoading && (
                  <div className="space-y-2">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {opinionLeadersError && (
                  <p className="text-xs text-red-500">{opinionLeadersError}</p>
                )}
                {!opinionLeadersLoading && opinionLeaders && opinionLeaders.map((leader, i) => (
                  <div key={i} className="rounded-lg border border-border/30 bg-white/70 p-2.5 space-y-1.5">
                    <div>
                      <p className="text-xs font-semibold text-ink">{leader.name}</p>
                      <p className="text-[10px] text-muted">{leader.role}</p>
                    </div>
                    <p className="text-xs text-ink/80 leading-relaxed">{leader.perspective}</p>
                    <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200/60 px-2 py-1.5">
                      <p className="text-xs font-medium text-amber-800 flex-1 leading-relaxed italic">"{leader.postAngle}"</p>
                      <CopyButton text={leader.postAngle} />
                    </div>
                  </div>
                ))}
                {!opinionLeadersLoading && !opinionLeaders && !opinionLeadersError && !topic && (
                  <p className="text-xs text-muted leading-relaxed italic">
                    Draft needs a topic to find opinion leader perspectives.
                  </p>
                )}
              </div>
            )}
```

- [ ] **TypeScript check:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```
Expected: no errors.

---

## Task 8: Final compile check (both frontend + worker)

- [ ] **Full frontend compile:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/frontend && npx tsc --noEmit --skipLibCheck 2>&1
```
Expected: no output (zero errors).

- [ ] **Worker compile:**
```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && npx tsc --noEmit --skipLibCheck -p worker/tsconfig.json 2>&1
```
Expected: no output (zero errors).

---

## Verification

1. **Tab L (Connection Finder):** Open any article → click "Connection" tab → should show a loading skeleton then 1-4 matching drafts with reasons and "Open Draft →" links. If no drafts exist, shows "No drafts seem to relate."

2. **Debate Mode (M):** Open any article → click "Debate" button in action row → page switches to split-screen: original article on left (blue border), AI-generated opposing article on right (amber border) with title, core argument, summary, and 3 key arguments.

3. **Tab Q (Cross-domain):** Open any draft from ClipsDock → right panel → click "Cross-domain" tab → loading skeleton → 3 insight cards each with domain badge, connection text, and a copyable post angle.

4. **Tab R (Opinion Leaders):** Same draft view → click "Opinion Leaders" tab → loading skeleton → 4 leader cards each with name/role, perspective, and a copyable post hook.
