"""Shared plumbing: env loading, TLS via the OS trust store, provider loader."""
import importlib
import json
import os
import re
import time
from pathlib import Path

import requests
import truststore
import yaml
from dotenv import load_dotenv

truststore.inject_into_ssl()  # use macOS trust store; verification stays ON

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")


def env(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        raise RuntimeError(f"Missing {name} in environment (.env)")
    return v


def load_provider(kind: str):
    """Instantiate providers.yaml[kind] via class_path + init_args."""
    cfg = yaml.safe_load((ROOT / "config" / "providers.yaml").read_text())[kind]
    if cfg.get("enabled", True) is False:  # per-block toggle: keep the config + adapter, switch it off
        raise RuntimeError(f"Provider '{kind}' is disabled in config/providers.yaml (enabled: false)")
    mod, cls = cfg["class_path"].rsplit(".", 1)
    return getattr(importlib.import_module(mod), cls)(**(cfg.get("init_args") or {}))


def guarded_get(url: str, timeout: int = 300, max_redirects: int = 5, **kw):
    """requests.get for URLs we did not write ourselves (provider-returned asset links): the news_rss SSRF guard runs on the
    URL and on every redirect hop (public http(s) only). Returns the final Response (caller closes / reads it)."""
    from urllib.parse import urljoin

    from adapters import news_rss
    for _ in range(max_redirects + 1):
        news_rss._check_url(url)
        r = requests.get(url, timeout=timeout, allow_redirects=False, **kw)
        if r.is_redirect or r.status_code in (301, 302, 303, 307, 308):
            url = urljoin(url, r.headers.get("Location", ""))
            r.close()
            continue
        return r
    raise ValueError("too many redirects")


def download(url: str, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    r = guarded_get(url, timeout=300)
    r.raise_for_status()
    out.write_bytes(r.content)
    return out


def minimax_headers() -> dict:
    return {"Authorization": f"Bearer {env('MINIMAX_API_KEY')}", "Content-Type": "application/json"}


def minimax_check(payload: dict, what: str) -> dict:
    br = payload.get("base_resp") or {}
    if br.get("status_code", 0) != 0:
        raise RuntimeError(f"MiniMax {what} failed: {br.get('status_code')} {br.get('status_msg')}")
    return payload


def poll(fn, every=10, timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        res = fn()
        if res is not None:
            return res
        time.sleep(every)
    raise TimeoutError("polling timed out")


def provider_cfg(kind: str) -> dict:
    """Config block for a provider (class_path + init_args); used for cache fingerprints."""
    return yaml.safe_load((ROOT / "config" / "providers.yaml").read_text())[kind]


def secrets_dir() -> Path:
    d = ROOT / ".secrets"
    d.mkdir(exist_ok=True)
    return d


def google_service_info() -> dict:
    import base64
    import json
    raw = env("GOOGLE_CREDENTIALS_JSON")
    try:
        return json.loads(raw)
    except Exception:
        return json.loads(base64.b64decode(raw))


def parse_json(text: str):
    """Tolerant JSON extraction: drops <think> blocks, strips ``` fences, decodes the FIRST complete JSON value (ignores trailing prose), repairs trailing commas.
    Same idea as vendor/ViMax utils/robust_json_parser.py (MIT)."""
    t = re.sub(r"(?s)<think>.*?</think>", "", text)
    t = re.sub(r"(?s)<think>.*", "", t)  # unclosed block (ran out of tokens); same handling as worker/src/llm/structuredJson.ts
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t.strip(), flags=re.S)
    starts = [i for i in (t.find("{"), t.find("[")) if i != -1]
    if starts:
        t = t[min(starts):]
    dec = json.JSONDecoder()
    try:
        return dec.raw_decode(t)[0]
    except json.JSONDecodeError:
        return dec.raw_decode(re.sub(r",\s*([}\]])", r"\1", t))[0]


class JsonLLM:
    """Base for LLM adapters (config/providers.yaml llm / llm_write / llm_verify). Subclasses implement
    generate(prompt, system, json_mode, temperature) -> str; this adds JSON parsing with retry on unparsable output (pattern: ViMax utils/retry.py)."""

    def generate(self, prompt: str, system: str = "", json_mode: bool = True, temperature=None) -> str:
        raise NotImplementedError

    def generate_json(self, prompt: str, system: str = "", retries: int = 2, **kw):
        for attempt in range(retries + 1):
            try:
                return parse_json(self.generate(prompt, system, json_mode=True, **kw))
            except json.JSONDecodeError:
                if attempt == retries:
                    raise
        raise RuntimeError("unreachable")
