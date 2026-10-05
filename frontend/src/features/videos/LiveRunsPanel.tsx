import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CircleAlert, CircleCheck, CircleX, Loader2, Terminal } from 'lucide-react';

// Live view of local video-pipeline runs. The pipeline runs on the owner's machine, so this talks to the read-only local server
// (`python run.py live` in video-pipeline/, 127.0.0.1 only). Override the address with VITE_PIPELINE_LIVE_URL.
const BASE: string = (import.meta.env.VITE_PIPELINE_LIVE_URL as string | undefined) ?? 'http://127.0.0.1:8765';
const RUN_POLL_MS = 2000;
const LOG_POLL_MS = 1500;
const MAX_LOG_CHARS = 200_000;

type RunState = 'running' | 'finished' | 'failed' | 'died';

export interface PipelineRun {
  id: string;
  label: string;
  cmd: string;
  state: RunState;
  started_at: string;
  updated_at: string;
  step?: string;
  stage?: string;
  activity?: string;
  tokens_in?: number;
  tokens_so_far?: number;
  call_started_at?: string;
  calls_done?: [string, number][];
  episode?: string;
  error?: string;
  exit_code?: number;
  log_bytes: number;
}

const STATE_STYLE: Record<RunState, { label: string; cls: string; Icon: typeof Activity }> = {
  running: { label: 'Running', cls: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200', Icon: Loader2 },
  finished: { label: 'Finished', cls: 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200', Icon: CircleCheck },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200', Icon: CircleX },
  died: { label: 'Stopped', cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', Icon: CircleAlert },
};

export function formatElapsed(fromIso: string, toMs: number): string {
  const s = Math.max(0, Math.round((toMs - new Date(fromIso).getTime()) / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 90 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function RunBadge({ state }: { state: RunState }) {
  const { label, cls, Icon } = STATE_STYLE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className={`h-3 w-3 ${state === 'running' ? 'animate-spin' : ''}`} aria-hidden />
      {label}
    </span>
  );
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function LogViewer({ run }: { run: PipelineRun }) {
  const [text, setText] = useState('');
  const offset = useRef(0);
  const box = useRef<HTMLPreElement>(null);
  const stick = useRef(true);
  const running = run.state === 'running';

  useEffect(() => {
    setText('');
    offset.current = 0;
    stick.current = true;
  }, [run.id]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const pull = async () => {
      try {
        const res = await fetch(`${BASE}/api/runs/${encodeURIComponent(run.id)}/log?offset=${offset.current}`);
        if (!res.ok) throw new Error(String(res.status));
        const d = (await res.json()) as { offset: number; text: string; done: boolean };
        if (cancelled) return;
        if (d.text) {
          offset.current = d.offset;
          setText((prev) => (prev + d.text).slice(-MAX_LOG_CHARS));
        }
        if (d.text && d.offset < run.log_bytes) return void (timer = setTimeout(pull, 50)); // catch up quickly on a long backlog
        if (!d.done || running) timer = setTimeout(pull, LOG_POLL_MS);
      } catch {
        if (!cancelled) timer = setTimeout(pull, LOG_POLL_MS * 2);
      }
    };
    pull();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [run.id, running, run.log_bytes]);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <pre
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
      className="max-h-[420px] min-h-[160px] overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200"
      aria-label="Run log"
    >
      {text || (running ? 'Waiting for output…' : 'No output recorded.')}
    </pre>
  );
}

function RunDetails({ run, now }: { run: PipelineRun; now: number }) {
  const running = run.state === 'running';
  const end = running ? now : new Date(run.updated_at).getTime();
  const waiting = running && run.activity === 'waiting for model' && run.call_started_at;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <RunBadge state={run.state} />
        <span title="Elapsed">{formatElapsed(run.started_at, end)}</span>
        {run.step && run.step !== 'starting' && <span>step: <b className="text-ink dark:text-slate-200">{run.step}</b></span>}
        {run.stage && <span>stage: <b className="text-ink dark:text-slate-200">{run.stage}</b></span>}
        {run.tokens_so_far ? <span>~{run.tokens_so_far.toLocaleString()} tokens</span> : null}
        {run.episode && <span>episode: <b className="text-ink dark:text-slate-200">{run.episode}</b></span>}
      </div>
      {waiting && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          Waiting <b>{formatElapsed(run.call_started_at as string, now)}</b> on the model for “{run.stage}”
          {run.tokens_in ? ` (~${run.tokens_in.toLocaleString()} tokens in)` : ''}. Thinking models normally take 2–7 minutes; a single attempt times out after 7 minutes, then retries.
        </p>
      )}
      {run.state === 'died' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          The process is gone without recording an end (killed or crashed). The log below shows its last output.
        </p>
      )}
      {run.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-200">{run.error}</p>}
      {run.calls_done && run.calls_done.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {run.calls_done.map(([label, secs], i) => (
            <span key={`${label}-${i}`} className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-muted dark:bg-white/[0.06]">
              {label} · {secs}s
            </span>
          ))}
        </div>
      )}
      <LogViewer run={run} />
    </div>
  );
}

export function LiveRunsPanel() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${BASE}/api/runs`, { signal });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as { runs: PipelineRun[] };
      setRuns(d.runs);
      setReachable(true);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setReachable(false);
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    load(ctl.signal);
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(ctl.signal);
    }, RUN_POLL_MS);
    return () => {
      ctl.abort();
      clearInterval(t);
    };
  }, [load]);

  const anyRunning = runs.some((r) => r.state === 'running');
  const now = useNow(anyRunning);
  const selected = useMemo(
    () => runs.find((r) => r.id === selectedId) ?? runs.find((r) => r.state === 'running') ?? runs[0] ?? null,
    [runs, selectedId],
  );

  if (reachable === null) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted">Connecting to the local pipeline…</div>;
  }
  if (!reachable) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/50 bg-white/40 px-6 py-12 text-center shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
        <Terminal className="h-10 w-10 text-muted/60" aria-hidden />
        <p className="text-sm font-semibold text-ink dark:text-slate-200">Local pipeline server not reachable</p>
        <p className="max-w-md text-xs text-muted">
          Runs happen on your machine. Start the read-only viewer in the video-pipeline folder:{' '}
          <code className="rounded bg-black/5 px-1 font-mono text-[11px] dark:bg-white/10">.venv/bin/python run.py live</code>, then keep this tab open. It retries automatically.
        </p>
      </div>
    );
  }
  if (runs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/50 bg-white/40 px-6 py-10 text-center text-sm text-muted shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
        No runs recorded yet. Start one (for example <code className="font-mono text-[11px]">run.py director --topic "…"</code>) and it appears here live.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <ul className="flex max-h-[560px] flex-col gap-1.5 overflow-auto" aria-label="Pipeline runs">
        {runs.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                selected?.id === r.id
                  ? 'border-primary/40 bg-primary/[0.06]'
                  : 'border-white/50 bg-white/40 hover:bg-primary/[0.03] dark:border-white/[0.06] dark:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-ink dark:text-slate-200">{r.label}</span>
                <RunBadge state={r.state} />
              </div>
              <div className="mt-1 truncate text-muted" title={r.cmd}>{r.cmd}</div>
              <div className="mt-0.5 text-muted">{new Date(r.started_at).toLocaleString()}</div>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="rounded-2xl border border-white/50 bg-white/40 p-4 shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          <h2 className="mb-1 text-sm font-semibold text-ink dark:text-slate-100">{selected.label}</h2>
          <p className="mb-3 truncate text-xs text-muted" title={selected.cmd}>{selected.cmd}</p>
          <RunDetails run={selected} now={now} />
        </div>
      )}
    </div>
  );
}
