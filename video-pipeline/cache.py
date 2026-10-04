"""Content-hash cache: an asset is fresh only if the inputs that made it are unchanged.
Assets created before this existed are adopted as-is (grandfathered) so they are never re-paid."""
import hashlib
import json
from pathlib import Path


def key(*parts) -> str:
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


def file_hash(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16] if p.exists() else ""


def _stamp(asset: Path) -> Path:
    return asset.with_name(asset.name + ".key")


def fresh(asset: Path, k: str) -> bool:
    if not asset.exists():
        return False
    s = _stamp(asset)
    if not s.exists():
        s.write_text(k)  # grandfather
        return True
    return s.read_text().strip() == k


def mark(asset: Path, k: str) -> None:
    _stamp(asset).write_text(k)
