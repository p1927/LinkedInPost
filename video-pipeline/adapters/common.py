"""Shared plumbing: env loading, TLS via the OS trust store, provider loader."""
import importlib
import os
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
    mod, cls = cfg["class_path"].rsplit(".", 1)
    return getattr(importlib.import_module(mod), cls)(**(cfg.get("init_args") or {}))


def download(url: str, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=300)
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
