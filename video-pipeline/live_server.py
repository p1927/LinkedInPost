"""Read-only local server for the web UI's "Live runs" view (stdlib only; free; no paid calls).
  python run.py live [--port 8765]        listens on 127.0.0.1 only
  GET /api/runs                           recent runs (runlog.py meta + state: running | finished | failed | died)
  GET /api/runs/<run_id>/log?offset=N     log text from byte offset N: {offset, text, done}
Safety: binds 127.0.0.1; rejects requests whose Host is not localhost/127.0.0.1 (DNS rebinding); answers CORS only for allowed origins
(the local Vite dev server and the deployed app; extend with LIVE_ALLOWED_ORIGINS="https://a,https://b"); run ids are validated and files are
read only from out/runs/; key-like strings are redacted from log text; nothing here can start, stop or change a run."""
import json
import os
import re
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import runlog

DEFAULT_ORIGINS = {f"http://{h}:{p}" for h in ("localhost", "127.0.0.1") for p in (5173, 5174, 5175, 4173)} | {"https://p1927.github.io"}  # Vite dev (5174/5175 per config), preview, deployed app
RUN_ID = re.compile(r"^\d{8}-\d{6}-\d+$")
CHUNK = 64 * 1024
_SECRET = re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._\-]{12,}|((?:api[_-]?key|token|secret|password|authorization)[\"']?\s*[:=]\s*[\"']?)[^\s\"',]{8,}|\bsk-[A-Za-z0-9_\-]{16,}")


def redact(text: str) -> str:
    return _SECRET.sub(lambda m: (m.group(1) or m.group(2) or "") + "[redacted]", text)


def allowed_origins() -> set:
    extra = {o.strip() for o in os.environ.get("LIVE_ALLOWED_ORIGINS", "").split(",") if o.strip()}
    return DEFAULT_ORIGINS | extra


def read_log(run_id: str, offset: int) -> dict:
    if not RUN_ID.match(run_id):
        raise ValueError("bad run id")
    path = runlog.RUNS / run_id / "log.txt"
    if not path.exists():
        return {"offset": 0, "text": "", "done": True}
    size = path.stat().st_size
    offset = max(0, min(offset, size))
    with open(path, "rb") as f:
        f.seek(offset)
        raw = f.read(CHUNK)
    text = raw.decode("utf-8", errors="replace")
    meta_path = runlog.RUNS / run_id / "meta.json"
    try:
        done = json.loads(meta_path.read_text()).get("state") != "running"
    except (OSError, json.JSONDecodeError):
        done = True
    return {"offset": offset + len(raw), "text": redact(text), "done": done and offset + len(raw) >= size}


class Handler(BaseHTTPRequestHandler):
    server_version = "pipeline-live/1"

    def log_message(self, *a):  # quiet
        pass

    def _host_ok(self) -> bool:
        host = (self.headers.get("Host") or "").split(":")[0].lower()
        return host in ("localhost", "127.0.0.1", "[::1]")

    def _cors(self) -> dict:
        origin = self.headers.get("Origin")
        if origin and origin in allowed_origins():
            return {"Access-Control-Allow-Origin": origin, "Vary": "Origin", "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Private-Network": "true"}
        return {}

    def _send(self, code: int, body: dict) -> None:
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        for k, v in self._cors().items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):  # noqa: N802
        self._send(204 if self._host_ok() else 403, {})

    def do_GET(self):  # noqa: N802
        if not self._host_ok():
            return self._send(403, {"error": "bad host"})
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        try:
            if u.path == "/api/runs":
                return self._send(200, {"runs": runlog.list_runs(30)})
            m = re.match(r"^/api/runs/([^/]+)/log$", u.path)
            if m:
                return self._send(200, read_log(m.group(1), int((qs.get("offset") or ["0"])[0])))
        except ValueError as e:
            return self._send(400, {"error": str(e)})
        self._send(404, {"error": "not found"})


def main(args: list) -> int:
    port = int(args[args.index("--port") + 1]) if "--port" in args else 8765
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"live runs: http://127.0.0.1:{port}/api/runs  (read-only; Ctrl+C to stop)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0
