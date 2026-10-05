# NOTICE: copied unmodified from upstream path:
#   Trade/integrations/trade_integrations/browser_research/browseros_client/probe.py
# Owner: Mishra, Pratyush. Not a third-party file; owner copied their own code here
# to avoid importing trade_integrations (its __init__.py loads Trade's .env).

"""Cached startup probe — is the BrowserOS MCP reachable?

Cheap (≤5s) HTTP initialize handshake against ``$BROWSEROS_MCP_URL``.
Cached for ``BROWSEROS_PROBE_CACHE_S`` (default 60). Called from ``agent.py``
and ``research/ui/server.py`` to fail-soft when BrowserOS isn't running.

The probe never raises — it returns ``False`` on any error (timeout,
connection refused, JSON parse failure, missing url). That's the contract
callers expect: ``if not browseros_configured(): skip the browser tools``.
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_PROBE_TIMEOUT_S = 5.0
_DEFAULT_CACHE_S = 60.0
# Keyed by the URL actually probed (PR 6 of the 2026-09-04 audit item —
# previously a single _last_result tuple keyed to nothing, so a caller
# probing a non-default URL got whichever URL's result happened to be
# cached last, not its own).
_cache: dict[str, tuple[float, bool]] = {}


def _url() -> str:
    return os.environ.get("BROWSEROS_MCP_URL", "").strip()


def browseros_configured(url: str | None = None) -> bool:
    """Return True iff the BrowserOS MCP at ``url`` (default:
    ``$BROWSEROS_MCP_URL``) responded to ``initialize`` within
    ``_PROBE_TIMEOUT_S``.

    Result is cached per-URL for ``BROWSEROS_PROBE_CACHE_S`` (default 60 s)
    so a import-time ``agent`` builder doesn't hammer the server.

    ``url`` (PR 6 of the 2026-09-04 audit item): previously this function
    always read ``$BROWSEROS_MCP_URL`` from the environment, even when a
    caller had constructed a client with an explicit, different
    ``base_url`` — meaning reachability and the actual endpoint used could
    diverge. ``BrowserOSBackend.available()`` now passes its own
    ``self._client.base_url`` explicitly.
    """
    global _cache
    target = (url if url is not None else _url()).strip()
    if not target:
        return False
    cache_s = float(os.environ.get("BROWSEROS_PROBE_CACHE_S", str(_DEFAULT_CACHE_S)))
    now = time.time()
    cached = _cache.get(target)
    if cached is not None and (now - cached[0]) < cache_s:
        return cached[1]

    try:
        with httpx.Client(timeout=_PROBE_TIMEOUT_S) as client:
            r = client.post(
                target,
                headers={"Content-Type": "application/json",
                         "Accept": "application/json, text/event-stream"},
                json={
                    "jsonrpc": "2.0", "id": 1, "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {"name": "trade-browseros-probe", "version": "1.0.0"},
                    },
                },
            )
            r.raise_for_status()
            # The response is SSE — but the first event contains the JSON-RPC reply.
            data: dict[str, Any] = {}
            for line in r.text.splitlines():
                line = line.strip()
                if line.startswith("data:"):
                    try:
                        data = json.loads(line[len("data:"):].strip())
                    except json.JSONDecodeError:
                        continue
                    break
            ok = "result" in data and "serverInfo" in (data.get("result") or {})
            _cache[target] = (now, ok)
            return ok
    except Exception as exc:  # noqa: BLE001 — probe must never raise
        logger.debug("[browseros_probe] failed: %s", exc)
        _cache[target] = (now, False)
        return False


def reset_probe_cache() -> None:
    """Drop all cached probe results. Useful in tests and when the user
    toggles ``BROWSEROS_MCP_URL`` (or an explicit per-instance URL) mid-process."""
    global _cache
    _cache = {}
