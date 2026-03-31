import { runPipeline } from './pipeline';
import { buildRequirementReportFromSuggest } from './players/requirementReport';
import { loadBundledRepository } from './players/patternRepository';
import { findPattern } from './players/patternFinder';
import { saveFeedback } from './players/feedback';
import {
  GenerateRequestSchema,
  FeedbackRequestSchema,
  SuggestPatternRequestSchema,
} from './types';
import type { Env } from './types';

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function unauthorized(): Response {
  return json({ error: 'Unauthorized' }, 401);
}

function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

function checkAuth(request: Request, env: Env): boolean {
  const secret = String(env.WORKER_SHARED_SECRET ?? '').trim();
  if (!secret) return true;
  const auth = request.headers.get('Authorization') ?? '';
  return auth === `Bearer ${secret}` || auth === secret;
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function parseBody<T>(
  request: Request,
  schema: { parse: (v: unknown) => T },
): Promise<ParseResult<T>> {
  try {
    const raw = await request.json();
    const data = schema.parse(raw);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (!checkAuth(request, env)) return unauthorized();

    // GET /v1/patterns — list available patterns
    if (pathname === '/v1/patterns' && method === 'GET') {
      const repo = loadBundledRepository();
      return json({ patterns: repo.compactSummaries() });
    }

    if (method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // POST /v1/generate
    if (pathname === '/v1/generate') {
      const parsed = await parseBody(request, GenerateRequestSchema);
      if (!parsed.ok) return badRequest(parsed.error);
      try {
        const result = await runPipeline(parsed.data, env, env.GEN_DB);
        return json(result);
      } catch (e) {
        return json({ error: String(e) }, 500);
      }
    }

    // POST /v1/feedback
    if (pathname === '/v1/feedback') {
      const parsed = await parseBody(request, FeedbackRequestSchema);
      if (!parsed.ok) return badRequest(parsed.error);

      let patternId = '';
      try {
        const row = await env.GEN_DB
          .prepare('SELECT pattern_id FROM generation_runs WHERE run_id = ?')
          .bind(parsed.data.runId)
          .first<{ pattern_id: string }>();
        patternId = row?.pattern_id ?? '';
      } catch { /* non-critical */ }

      try {
        const id = await saveFeedback(env.GEN_DB, parsed.data, patternId);
        return json({ id, ok: true });
      } catch (e) {
        return json({ error: String(e) }, 500);
      }
    }

    // POST /v1/suggest-pattern
    if (pathname === '/v1/suggest-pattern') {
      const parsed = await parseBody(request, SuggestPatternRequestSchema);
      if (!parsed.ok) return badRequest(parsed.error);

      try {
        const report = buildRequirementReportFromSuggest(parsed.data);
        const repo = loadBundledRepository();
        const finder = await findPattern(repo, report, env);
        return json({ requirementReport: report, ...finder });
      } catch (e) {
        return json({ error: String(e) }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
