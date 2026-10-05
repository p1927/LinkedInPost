# NOTICE: copied unmodified from upstream path:
#   Trade/integrations/trade_integrations/browser_research/browseros_client/client.py
# Owner: Mishra, Pratyush. Not a third-party file; owner copied their own code here
# to avoid importing trade_integrations (its __init__.py loads Trade's .env).
# Do not import trade_integrations directly from this project.

"""Stateless wrapper around the BrowserOS MCP ``run`` tool.

Used by the standalone ``research/ui`` HTML page (PR 5) for direct
operator-driven browser actions — "open this URL, snapshot it, show me the
first 50 lines" — without going through the full Claude SDK agent loop.

Why a separate module from ``browseros_agent/agent.py``:
  - The agent talks to BrowserOS via the SDK's MCP config (declarative).
  - The UI calls BrowserOS directly via raw JSON-RPC (imperative).
  - Different lifecycles — the agent is session-scoped, the UI is request-scoped.

Like the probe, every method here is fail-soft: it returns ``{"error": ...,
"raw": ...}`` on any failure rather than raising. The UI surfaces the error
in its log pane and the caller doesn't have to wrap in try/except.
"""
from __future__ import annotations

import contextlib
import json
import logging
import os
from typing import Any, Iterator

import httpx

logger = logging.getLogger(__name__)


class BrowserOSPageError(RuntimeError):
    """Raised by ``BrowserOSClient.open_page()`` when the page could not be
    opened. Distinguished from a generic failure so callers can report a
    clean, specific error instead of a bare exception."""


def _url() -> str:
    return os.environ.get("BROWSEROS_MCP_URL", "").strip()


class BrowserOSClient:
    """Stateless BrowserOS MCP client. One HTTP round-trip per method call."""

    def __init__(self, base_url: str | None = None) -> None:
        # ``None`` = read $BROWSEROS_MCP_URL; explicit "" = deliberately
        # unconfigured, which must stay unconfigured rather than falling back to
        # the env value (same reasoning as SteelBackend.__init__).
        resolved = _url() if base_url is None else base_url
        self.base_url = resolved.strip().rstrip("/")

    def available(self) -> bool:
        return bool(self.base_url)

    # ── MCP session handshake ────────────────────────────────────────────
    # Live-verified 2026-09-04 against a real running BrowserOS neo instance
    # (see .claude/backlog/items/2026-09-04-browseros-screenshot-fix-needs-
    # live-verification.md): the server rejects a bare ``tools/call`` with
    # HTTP 422 "Unexpected message, expect initialize request" unless an
    # ``initialize`` request has first been sent and its ``mcp-session-id``
    # response header echoed back on the follow-up call. A
    # ``notifications/initialized`` round-trip is NOT required by this
    # server (confirmed live) — one extra request (initialize) per method
    # call is enough, keeping this client's "one call in, one call out"
    # statelessness intact from the caller's point of view.
    def _initialize_session(self, client: httpx.Client) -> str:
        r = client.post(
            self.base_url,
            headers={"Content-Type": "application/json",
                     "Accept": "application/json, text/event-stream"},
            json={
                "jsonrpc": "2.0", "id": 0,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "trade-browseros-client", "version": "1.0"},
                },
            },
        )
        r.raise_for_status()
        session_id = r.headers.get("mcp-session-id", "")
        if not session_id:
            raise RuntimeError("browseros_no_session_id_in_initialize_response")
        return session_id

    def open_session(self, *, timeout_s: float = 30.0) -> str:
        """Perform the ``initialize`` handshake and return the resulting
        ``mcp-session-id``, for callers that need several ``tools/call``s to
        land in the *same* agent session — e.g. opening a page with one call
        and acting on it (screenshot, close) with later ones. BrowserOS ties
        page/tab ownership to the session (live-verified 2026-09-04: a page
        opened under one session is rejected by a tool call made under a
        fresh, separately-initialized session with "page N is not owned by
        this agent"), so those calls cannot each go through the independent
        handshake ``call_tool``/``run``/``search`` do.
        """
        with httpx.Client(timeout=timeout_s) as client:
            return self._initialize_session(client)

    def call_tool(self, name: str, arguments: dict, *, timeout_s: float = 60.0,
                  session_id: str | None = None) -> dict:
        """POST a ``tools/call`` for any MCP tool BrowserOS exposes (``run``,
        ``search``, ``screenshot``, ``tabs``, ...). With no ``session_id``,
        performs its own one-off ``initialize`` handshake (fine for a single
        independent call). Pass a ``session_id`` from ``open_session()`` to
        reuse an existing agent session instead — required for a sequence of
        calls that act on the same page/tab. Returns the parsed JSON-RPC
        result.
        """
        if not self.base_url:
            return {"error": "BROWSEROS_MCP_URL not set"}
        try:
            with httpx.Client(timeout=timeout_s) as client:
                sid = session_id or self._initialize_session(client)
                r = client.post(
                    self.base_url,
                    headers={"Content-Type": "application/json",
                             "Accept": "application/json, text/event-stream",
                             "mcp-session-id": sid},
                    json={
                        "jsonrpc": "2.0", "id": 1,
                        "method": "tools/call",
                        "params": {"name": name, "arguments": arguments},
                    },
                )
                r.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            logger.warning("[browseros_client] %s failed: %s", name, exc)
            return {"error": f"browseros_{name}_failed: {exc}"}
        return _parse_sse(r.text)

    # ── guaranteed-cleanup page lifecycle ───────────────────────────────
    # Live-verified 2026-09-04: a page opened under one MCP session is
    # rejected ("page N is not owned by this agent") by a tools/call made
    # under any other session, including a fresh one from this same
    # client/process — there is no cross-session "reap my old pages" API,
    # so a page that outlives its opening session's last close call is
    # stuck open until a human closes it from the BrowserOS cockpit. This
    # context manager is the fix: every call site that opens a page for a
    # scoped operation (screenshot, read, ...) goes through here so the
    # close is structural (a `finally`), not something each call site has
    # to remember — ad hoc/manual calls (raw curl, a debugging shell) are
    # the only way to still leak a page, since they bypass this entirely.
    @contextlib.contextmanager
    def open_page(self, url: str, *, wait_ms: int = 2500,
                  timeout_s: float = 60.0) -> Iterator[tuple[str, int]]:
        """Open ``url`` in a fresh page, yield ``(session_id, page_id)``, and
        close the page (best-effort) on the way out — including when the
        ``with`` block raises. Use this for any operation that opens a page,
        acts on it, and is done with it; never open a page via ``run``/
        ``call_tool`` directly outside this helper.
        """
        session_id = self.open_session(timeout_s=timeout_s)
        opened = self.call_tool(
            "run", {"code": f"return await browser.pages.newPage({json.dumps(url)});"},
            timeout_s=timeout_s, session_id=session_id)
        page_id = extract_structured_value(opened)
        if not isinstance(page_id, int):
            _, err = extract_run_text(opened)
            raise BrowserOSPageError(
                f"browseros_could_not_open_page: {err or opened}")
        # The wait is a separate call and sits inside the try: when it was folded into the
        # newPage script, a wait that threw left an opened page whose id never reached us,
        # so it could not be closed ([[2026-09-18-browseros-tab-state-degrades-across-repeated-fetches]]).
        try:
            self.call_tool("run", {"code": f"await browser.wait({page_id}, {{ value: {int(wait_ms)} }});"},
                           timeout_s=timeout_s, session_id=session_id)
            yield session_id, page_id
        finally:
            self.call_tool("tabs", {"action": "close", "page": page_id},
                           timeout_s=timeout_s, session_id=session_id)

    def run(self, code: str, *, timeout_s: float = 120.0) -> dict:
        """POST a ``tools/call`` to BrowserOS MCP invoking ``run`` with the given
        JavaScript code. Returns the parsed result (extracting the ``run`` tool's
        structured content). Large results are auto-saved by BrowserOS to a
        file on disk; the returned ``path`` field carries the file location.
        """
        return self.call_tool("run", {"code": code}, timeout_s=timeout_s)

    def search(self, query: str, *, max_results: int = 10) -> list[dict]:
        """Convenience: invoke the MCP ``search`` tool. Returns a flat list of
        result dicts (each with at least ``url`` and ``title``)."""
        if not self.base_url:
            return [{"error": "BROWSEROS_MCP_URL not set"}]
        result = self.call_tool("search", {"query": query, "max_results": max_results},
                                timeout_s=60.0)
        if isinstance(result, dict) and result.get("error"):
            return [{"error": result["error"]}]
        # MCP run tools return nested {"content":[{"type":"text","text":"..."}]}.
        # For ``search`` the text is usually JSON-encoded results.
        if isinstance(result, dict):
            content = result.get("content") or []
            if isinstance(content, list) and content and isinstance(content[0], dict):
                text = content[0].get("text") or ""
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    return [{"raw_text": text}]
        return [result]


def extract_run_text(result: Any) -> tuple[str, str]:
    """Pull the text payload out of an MCP ``tools/call`` reply.

    Returns ``(text, error)`` — exactly one is non-empty. BrowserOS nests the
    payload as ``{"result": {"content": [{"type": "text", "text": "..."}]}}``,
    but a plain ``{"content": [...]}`` shape also occurs depending on version,
    so both are handled.

    PR 6 of the 2026-09-04 audit item: ``browseros_client.py``'s own
    docstring documents that large results are auto-saved to disk by
    BrowserOS, with a ``path`` field carrying the file location — but
    nothing here ever read that field; a large result (e.g. a full-page
    screenshot) fell through to the generic, misleading
    ``no_text_content_in_reply``. This doesn't implement reading the
    saved file (no file-read tool exists on ``BrowserOSClient`` yet — that
    would be new scope), but it does surface a distinct, honest error
    instead of the generic one, so a caller/operator can tell "the result
    was too large and saved to disk, which this backend can't fetch yet"
    apart from "something else went wrong entirely".
    """
    if not isinstance(result, dict):
        return "", f"unexpected_result_type: {type(result).__name__}"
    if "error" in result and result["error"]:
        return "", str(result["error"])[:500]
    payload = result.get("result") if isinstance(result.get("result"), dict) else result
    content = (payload or {}).get("content") or []
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("text"):
                return str(block["text"]), ""
    saved_path = (payload or {}).get("path") or (payload or {}).get("file")
    if saved_path:
        return "", (
            "browseros_large_result_saved_to_disk_unsupported: "
            f"result exceeded BrowserOS's inline-reply threshold and was "
            f"saved to {saved_path!r} on the BrowserOS host — this backend "
            f"has no file-read tool to fetch it yet"
        )
    return "", f"no_text_content_in_reply: {json.dumps(result)[:400]}"


def extract_structured_value(result: Any) -> Any:
    """Pull the ``run`` tool's actual JS return value out of a ``tools/call``
    reply, from ``structuredContent.value`` (the real server's typed
    channel — confirmed live to carry e.g. a numeric page id), falling
    back to ``None`` if the reply has no structured content (an error, or
    a server build that only returns the free-text summary)."""
    if not isinstance(result, dict):
        return None
    payload = result.get("result") if isinstance(result.get("result"), dict) else result
    structured = (payload or {}).get("structuredContent")
    if isinstance(structured, dict) and "value" in structured:
        return structured["value"]
    return None


def _parse_sse(text: str) -> Any:
    """Parse an SSE response into a single JSON-RPC result dict.

    MCP-over-HTTP wraps replies in SSE ``data: {...}`` events. We grab the
    first one — that's the actual reply; subsequent events are noise.
    """
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            payload = line[len("data:"):].strip()
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                continue
    return {"error": "no_data_event_in_sse", "raw": text[:2000]}
