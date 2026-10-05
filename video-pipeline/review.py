"""Episode review helper (E1): write the owner's taste-log for a preview.

  review.add(ep_id, tags, understood, note="")   # write episodes/<id>/review.json
  review.load(ep_id)                              # read back or None
  python run.py review <ep_id>  is NOT implemented here — run.py is owned by another layer.
  Call this module directly from a CLI or from the review UI hook.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import jsonschema

_ROOT = Path(__file__).resolve().parent
_SCHEMA_FILE = _ROOT / "direction" / "review.schema.json"
_VALID_TAGS = {"keep", "too_similar", "too_flat", "confusing", "off_brand"}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ep_dir(ep_id: str) -> Path:
    return _ROOT / "episodes" / ep_id


def add(
    ep_id: str,
    tags: list[str],
    understood: bool,
    note: str = "",
) -> dict:
    """Write episodes/<ep_id>/review.json. Returns the written record.

    Args:
        ep_id:      Episode id string, e.g. 'ep23-india-market-crash-recovery'.
        tags:       One or more of: keep | too_similar | too_flat | confusing | off_brand.
        understood: Owner verdict — did I understand this video?
        note:       Optional free-text note (max 500 chars).
    Raises:
        ValueError on bad tags, unknown ep, or schema violation.
    """
    bad = set(tags) - _VALID_TAGS
    if bad:
        raise ValueError(f"unknown tag(s): {bad!r}; allowed: {sorted(_VALID_TAGS)}")
    if not tags:
        raise ValueError("at least one tag is required")

    ep_dir = _ep_dir(ep_id)
    if not ep_dir.is_dir():
        raise ValueError(f"episode directory not found: {ep_dir}")

    record = {
        "schema_version": "1",
        "ep_id": ep_id,
        "reviewed_at": _now(),
        "understood": bool(understood),
        "tags": list(tags),
    }
    if note:
        record["note"] = note[:500]

    # Validate against schema
    schema = json.loads(_SCHEMA_FILE.read_text())
    jsonschema.validate(record, schema)

    out = ep_dir / "review.json"
    out.write_text(json.dumps(record, indent=2))
    return record


def load(ep_id: str) -> dict | None:
    """Return the review.json for ep_id, or None if not yet reviewed."""
    f = _ep_dir(ep_id) / "review.json"
    if not f.exists():
        return None
    return json.loads(f.read_text())


# ------------------------------------------------------------------ CLI
def _cli(argv: list[str]) -> int:
    """Minimal CLI: python review.py <ep_id> [--tags keep,confusing] [--understood yes/no] [--note TEXT]"""
    if not argv:
        print(__doc__)
        return 1
    ep_id = argv[0]
    existing = load(ep_id)
    if existing:
        print(f"Existing review for {ep_id}: {json.dumps(existing, indent=2)}")
        if "--show" in argv:
            return 0

    # Parse args
    def _get(flag: str, default=None):
        if flag in argv and argv.index(flag) + 1 < len(argv):
            return argv[argv.index(flag) + 1]
        return default

    tags_raw = _get("--tags", "keep")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    understood_raw = _get("--understood", "yes")
    understood = understood_raw.lower() in ("yes", "true", "1", "y")
    note = _get("--note", "")

    rec = add(ep_id, tags, understood, note)
    print(f"Written review.json for {ep_id}: {json.dumps(rec, indent=2)}")
    return 0


if __name__ == "__main__":
    sys.exit(_cli(sys.argv[1:]))
