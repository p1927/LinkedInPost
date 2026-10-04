"""Free, account-less temporary public URL for a local MP4 (Instagram must fetch videos from a public URL).
Local Range-capable HTTP server + a Cloudflare quick tunnel in Docker (trycloudflare.com). Torn down after use."""
import os
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DOCKER_PATH = "/Applications/Docker.app/Contents/Resources/bin:" + os.environ.get("PATH", "")
IMAGE = "cloudflare/cloudflared:latest"
NAME = "vp-tunnel"


def _handler(file: Path, name: str):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):  # quiet
            pass

        def _serve(self, head=False):
            if self.path.lstrip("/").split("?")[0] != name:
                self.send_error(404)
                return
            size = file.stat().st_size
            start, end, code = 0, size - 1, 200
            rng = self.headers.get("Range")
            if rng and (m := re.match(r"bytes=(\d*)-(\d*)", rng)):
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else size - 1
                elif m.group(2):
                    start = max(0, size - int(m.group(2)))
                end = min(end, size - 1)
                code = 206
            self.send_response(code)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            if code == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if head:
                return
            with file.open("rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(1 << 20, left))
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    left -= len(chunk)

        def do_GET(self):
            self._serve()

        def do_HEAD(self):
            self._serve(head=True)

    return H


NATIVE = Path(__file__).resolve().parent.parent / ".bin" / "cloudflared"


def _host_native(server, port, name, timeout):
    """Native cloudflared trusts the macOS keychain (works behind TLS-inspecting networks, unlike the container)."""
    proc = subprocess.Popen([str(NATIVE), "tunnel", "--no-autoupdate", "--protocol", "http2", "--url", f"http://localhost:{port}"],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    url, t0 = None, time.time()
    buf = []

    def reader():
        for line in proc.stdout:
            buf.append(line)

    threading.Thread(target=reader, daemon=True).start()
    while time.time() - t0 < timeout and not url and proc.poll() is None:
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", "".join(buf))
        url = m.group(0) if m else None
        time.sleep(1)
    if not url:
        proc.terminate()
        server.shutdown()
        raise RuntimeError("tunnel URL did not appear: " + "".join(buf)[-300:])
    time.sleep(4)
    return f"{url}/{name}", (server, proc)


def host(path: Path, name: str, timeout: int = 90):
    server = ThreadingHTTPServer(("0.0.0.0", 0), _handler(path, name))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    if NATIVE.exists():
        return _host_native(server, port, name, timeout)
    env = {**os.environ, "PATH": DOCKER_PATH}
    subprocess.run(["docker", "rm", "-f", NAME], env=env, capture_output=True)
    r = subprocess.run(["docker", "run", "-d", "--rm", "--name", NAME, IMAGE, "tunnel", "--no-autoupdate",
                        "--url", f"http://host.docker.internal:{port}"], env=env, capture_output=True, text=True)
    if r.returncode:
        server.shutdown()
        raise RuntimeError(f"could not start tunnel container: {r.stderr[-300:]}")
    t0, url = time.time(), None
    while time.time() - t0 < timeout and not url:
        logs = subprocess.run(["docker", "logs", NAME], env=env, capture_output=True, text=True)
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", logs.stdout + logs.stderr)
        url = m.group(0) if m else None
        time.sleep(1.5)
    if not url:
        delete((server, NAME))
        raise RuntimeError("tunnel URL did not appear in time")
    time.sleep(4)  # let the edge route settle
    return f"{url}/{name}", (server, NAME)


def delete(handle) -> None:
    server, ref = handle
    if hasattr(ref, "terminate"):  # native process
        ref.terminate()
    else:
        subprocess.run(["docker", "rm", "-f", ref], env={**os.environ, "PATH": DOCKER_PATH}, capture_output=True)
    server.shutdown()
