"""Live run records: what a long `run.py` command is doing and everything it prints, readable while it runs (free, local).
Each recorded run gets out/runs/<run_id>/meta.json (state, step, timing, extras) and log.txt (a live tee of stdout+stderr).
`run.py` starts a run for: director, verify, manifest, animatic, publish, and `<episode> <stage|all>`; `run.py live` serves them read-only
to the web UI (live_server.py). Never raises: recording must not break a run. Logs contain whatever the command printed (no secrets are printed
by the pipeline; live_server.py also redacts key-like strings)."""
import atexit
import datetime
import json
import os
import sys
import time

from adapters.common import ROOT

RUNS = ROOT / "out" / "runs"
_cur: dict = {}


class _Tee:
    def __init__(self, stream, fh):
        self.stream, self.fh = stream, fh

    def write(self, s):
        self.stream.write(s)
        try:
            self.fh.write(s)
            self.fh.flush()  # live: the UI tails this file while the command runs
        except Exception:  # noqa: BLE001
            pass
        return len(s)

    def flush(self):
        self.stream.flush()

    def __getattr__(self, name):
        return getattr(self.stream, name)


def _now() -> str:
    return datetime.datetime.now().isoformat(timespec="seconds")


def _write_meta(meta: dict, path) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(meta, indent=1))
    tmp.replace(path)


def start(label: str, argv: list) -> str | None:
    try:
        rid = f"{time.strftime('%Y%m%d-%H%M%S')}-{os.getpid()}"
        d = RUNS / rid
        d.mkdir(parents=True, exist_ok=True)
        fh = open(d / "log.txt", "a", buffering=1)
        sys.stdout, sys.stderr = _Tee(sys.stdout, fh), _Tee(sys.stderr, fh)
        _cur.update(id=rid, dir=d, meta={"id": rid, "label": label, "cmd": "run.py " + " ".join(argv), "pid": os.getpid(), "state": "running",
                                         "started_at": _now(), "updated_at": _now(), "step": "starting", "calls_done": []})
        _write_meta(_cur["meta"], d / "meta.json")
        atexit.register(finish)
        return rid
    except Exception:  # noqa: BLE001
        return None


def update(**kw) -> None:
    """Merge fields into the current run's meta (no-op when no run is recorded)."""
    if not _cur:
        return
    try:
        _cur["meta"].update(kw, updated_at=_now())
        _write_meta(_cur["meta"], _cur["dir"] / "meta.json")
    except Exception:  # noqa: BLE001
        pass


def meta() -> dict:
    return _cur.get("meta", {})


def finish(code=None, error=None) -> None:
    if not _cur or _cur["meta"].get("state") != "running":
        return
    failed = bool(error) or (code not in (None, 0))
    update(state="failed" if failed else "finished", exit_code=code if isinstance(code, int) else (1 if failed else 0), **({"error": str(error)[:300]} if error else {}))


def _alive(pid) -> bool:
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, TypeError, ValueError):
        return False


def list_runs(limit: int = 30) -> list:
    out = []
    for d in sorted(RUNS.glob("*/meta.json"), reverse=True)[:limit]:
        try:
            m = json.loads(d.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        if m.get("state") == "running" and not _alive(m.get("pid")):
            m["state"] = "died"  # process is gone without recording an end (killed or crashed)
        log = d.parent / "log.txt"
        m["log_bytes"] = log.stat().st_size if log.exists() else 0
        out.append(m)
    return out
