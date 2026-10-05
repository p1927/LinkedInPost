"""Shared gate report: out/<id>/gate_report.json (schema_version 1).

Schema: {"schema_version": 1, "entries": [{layer, rule, severity, evidence,
         root_cause, fix_hint, advisory, waived}, ...]}

Idempotent: add() is a no-op when (layer, rule, evidence) already exists.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

SCHEMA_VERSION = 1


def load(report_path: Path | str) -> list[dict]:
    """Return entries list from an existing gate_report.json, or [] if absent."""
    p = Path(report_path)
    if not p.exists():
        return []
    raw = json.loads(p.read_text())
    # accept both the wrapped {"entries": [...]} and a bare list (legacy)
    return raw.get("entries", raw) if isinstance(raw, dict) else list(raw)


def _key(entry: dict) -> tuple:
    return (entry["layer"], entry["rule"], entry["evidence"])


def add(
    report_path: Path | str,
    layer: str,
    rule: str,
    severity: Literal["error", "warn", "info"],
    evidence: str,
    root_cause: str,
    fix_hint: str,
    advisory: bool = True,
) -> dict:
    """Append one entry; idempotent per (layer, rule, evidence). Returns entry."""
    entry: dict = {
        "layer": layer,
        "rule": rule,
        "severity": severity,
        "evidence": evidence,
        "root_cause": root_cause,
        "fix_hint": fix_hint,
        "advisory": advisory,
        "waived": False,
    }
    entries = load(report_path)
    if _key(entry) not in {_key(e) for e in entries}:
        entries.append(entry)
        write(report_path, entries)
    return entry


def merge(report_path: Path | str, new_entries: list[dict]) -> list[dict]:
    """Merge new_entries into existing report; idempotent. Returns full list."""
    entries = load(report_path)
    seen = {_key(e) for e in entries}
    for e in new_entries:
        if _key(e) not in seen:
            entries.append(e)
            seen.add(_key(e))
    write(report_path, entries)
    return entries


def write(report_path: Path | str, entries: list[dict]) -> None:
    """Write (or overwrite) gate_report.json with the given entries."""
    p = Path(report_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"schema_version": SCHEMA_VERSION, "entries": entries}, indent=2))
