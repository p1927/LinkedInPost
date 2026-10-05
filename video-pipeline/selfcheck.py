"""Consistency guard: free, local, no paid calls. `python run.py selfcheck` (exit 1 on any failure).
  1 schema      every episode.json validates against direction/episode.schema.json
  2 lint gate   no unwaived lint ERROR on episodes at status approved or later (drafts only report)
  3 checklist   every rule in direction/qa_checklist.yaml declares enforced_by, and the claim is true
  4 safe zones  config/safe_zones.yaml presets are valid and every profile names an existing one
  5 storyboard  storyboard.build works for every valid episode (scene coverage, positive durations)
  6 doc refs    file paths named in backticks in direction/*.md and *.yaml exist"""
import json
import re
import sys

import yaml

import lint
import registry
from adapters.common import ROOT

ALLOWED = {"lint", "schema", "superseded", "planned"}
GATED = registry.STATUSES.index("approved")


def _gated(ep, default: str = "approved") -> bool:
    """Approved or later. Drafts (idea/scripted) only report. `default` = status assumed when the episode has none
    (schema: approved, as before; lint gate: idea, as before)."""
    st = ep.get("status") or default
    return registry.STATUSES.index(st) >= GATED if st in registry.STATUSES else True


def check_schema():
    """(fails, notes). A schema-invalid or unreadable DRAFT is a note, never a failure: a half-written director draft
    must not break selfcheck for everyone else. Approved+ episodes must validate."""
    fails, notes = [], []
    for d in registry.episode_dirs():
        ep, err = registry.read_safe(d)
        iss = [m for _, _, m in lint.schema_issues(ep, limit=5)] if ep is not None else [err]
        (fails if ep is None or _gated(ep) else notes).extend(f"{d.name}: {m}" for m in iss)
    return fails, notes


def _valid_episodes():
    for d in registry.episode_dirs():
        ep, err = registry.read_safe(d)
        if ep is not None and not err and not lint.schema_issues(ep):
            yield d, ep  # invalid ones are reported by check_schema


def check_lint_gate():
    fails, notes = [], []
    for d, ep in _valid_episodes():
        errs = [i for i in lint.run(ep) if i[0] == "error"]
        if not errs:
            continue
        (fails if _gated(ep, "idea") else notes).append(f"{ep['id']} ({ep.get('status', 'idea')}): {len(errs)} lint error(s), e.g. {errs[0][1]}")
    return fails, notes


def check_safe_zones() -> list:
    out = []
    cfg = yaml.safe_load((ROOT / "config" / "safe_zones.yaml").read_text())
    presets = cfg.get("presets") or {}
    if cfg.get("default") not in presets:
        out.append(f"safe_zones.yaml: default {cfg.get('default')!r} is not a preset")
    for name, z in presets.items():
        w, h = z["canvas"]
        if not (0 <= z["x_min"] < z["x_max"] <= w and 0 <= z["y_min"] < z["y_max"] <= h):
            out.append(f"safe_zones.yaml: preset {name} is not inside its {w}x{h} canvas")
    for f in sorted((ROOT / "config" / "profiles").glob("*.json")):
        z = json.loads(f.read_text()).get("safeZone")
        if z is not None and z not in presets:
            out.append(f"{f.name}: safeZone {z!r} is not a preset")
    return out


def check_storyboard() -> list:
    """The storyboard generator must build for every valid episode and cover every scene exactly once with a positive duration."""
    import storyboard
    out = []
    for d, ep in _valid_episodes():
        try:
            sb = storyboard.build(ep, d)
        except Exception as e:  # noqa: BLE001 - report which episode broke the generator
            out.append(f"{d.name}: storyboard.build raised {type(e).__name__}: {e}")
            continue
        if [s["id"] for s in sb["scenes"]] != [s["id"] for s in ep["scenes"]] or any(s["duration_s"] <= 0 for s in sb["scenes"]):
            out.append(f"{d.name}: storyboard does not cover the scenes with positive durations")
    return out


def check_skill_copies() -> list:
    """direction/EPISODE_SKILL.md must stay byte-identical to the project skill (documented invariant; it drifted once)."""
    a, b = ROOT / "direction" / "EPISODE_SKILL.md", ROOT.parent / ".claude" / "skills" / "episode" / "SKILL.md"
    try:
        same = a.read_text() == b.read_text()
    except FileNotFoundError as e:
        return [f"skill copy missing: {e.filename}"]
    return [] if same else ["direction/EPISODE_SKILL.md and .claude/skills/episode/SKILL.md differ; edit one and copy it over the other"]


def check_news_web() -> list:
    """No-network check of the news provider's ordering/shape contract (director.py takes items[-10:] as the topic's sources)."""
    from adapters.news_web import NewsWeb
    nw = NewsWeb(feeds=(), read_top=0)  # read_top=0: no page fetches in this offline check
    res = [{"title": f"Nifty FII DII options {i}", "snippet": "On 2026-09-30 FIIs sold index options", "url": f"https://example.com/{i}", "via": "stub"} for i in range(4)]
    nw.search = lambda q: list(res)  # type: ignore[method-assign]
    items = nw.fetch("FII DII options Nifty")
    out = []
    if [i["url"] for i in items][-1] != "https://example.com/0":
        out.append("news_web: best-ranked result must come last (director uses items[-10:])")
    need = {"title", "url", "published", "source", "source_url", "summary"}
    if any(need - set(i) for i in items) or items[0]["published"] != "2026-09-30" or items[0]["source"] != "example.com":
        out.append("news_web: item shape or snippet date parsing changed")
    return out


def check_live() -> list:
    """No-network check of the live-runs viewer's safety contract: key-like strings are redacted, run ids cannot traverse paths."""
    import live_server
    import runlog
    out = []
    red = live_server.redact("Authorization: Bearer abcdefghijklmnop1234 api_key=sk-secretsecret123456 ok text")
    if "abcdefghijklmnop1234" in red or "secretsecret123456" in red or "ok text" not in red:
        out.append("live_server.redact: a key-like string leaked or normal text was damaged")
    if any(live_server.RUN_ID.match(x) for x in ("../etc", "20261005-120000-1/../x", "", "abc")):
        out.append("live_server.RUN_ID accepts an unsafe run id")
    try:
        runlog.list_runs(1)
    except Exception as e:  # noqa: BLE001
        out.append(f"runlog.list_runs raised {type(e).__name__}: {e}")
    return out


def check_checklist() -> list:
    out = []
    rules = yaml.safe_load((ROOT / "direction" / "qa_checklist.yaml").read_text())["rules"]
    src = (ROOT / "lint.py").read_text() + (ROOT / "packaging.py").read_text()  # lint calls packaging.run
    ids = {r["id"] for r in rules}
    for r in rules:
        by = r.get("enforced_by")
        if by not in ALLOWED:
            out.append(f"{r['id']}: enforced_by must be one of {sorted(ALLOWED)} (got {by!r})")
        elif by == "lint" and f'"{r["id"]}"' not in src:
            out.append(f"{r['id']}: claims enforced_by lint but lint.py never emits that id")
        elif by == "superseded" and f'"{r.get("superseded_by")}"' not in src:
            out.append(f"{r['id']}: superseded_by {r.get('superseded_by')!r} is not emitted by lint.py")
        elif by == "planned" and not r.get("owner"):
            out.append(f"{r['id']}: planned rules need an `owner`")
    if len(ids) != len(rules):
        out.append("duplicate rule ids in qa_checklist.yaml")
    return out


_REF = re.compile(r"`([A-Za-z0-9_./-]+\.(?:yaml|yml|md|py|json))`")
_GENERIC = {"episode.json", "sources.json", "research.json", "props.json", "qa_report.json"}  # per-episode filenames, not fixed paths
_SKIP = ("<", "*", "{", "out/", ".secrets", "vendor/", "reference/", "node_modules", "episodes/")


def check_doc_refs() -> list:
    out = []
    roots = [ROOT, ROOT / "direction", ROOT.parent, ROOT.parent / "docs", ROOT.parent / "docs" / "research" / "video", ROOT.parent / "docs" / "plans" / "youtube-automation"]
    files = sorted((ROOT / "direction").glob("*.md")) + sorted((ROOT / "direction").glob("*.yaml"))
    for f in files:
        for m in sorted(set(_REF.findall(f.read_text()))):
            if m in _GENERIC or any(s in m for s in _SKIP) or m.startswith("."):
                continue
            if not any((r / m).exists() for r in roots):
                out.append(f"{f.relative_to(ROOT)}: `{m}` does not exist")
    return out


def main() -> int:
    bad = 0
    sfails, snotes = check_schema()
    bad += bool(sfails)
    print(f"{'FAIL' if sfails else 'ok  '} schema (approved+ episodes)")
    for i in sfails:
        print(f"       {i}")
    for i in snotes:
        print(f"       (draft, not gating) {i}")
    for name, fn in (("safe zones", check_safe_zones), ("storyboard", check_storyboard), ("skill copies", check_skill_copies), ("news web", check_news_web), ("live runs", check_live), ("checklist", check_checklist), ("doc refs", check_doc_refs)):
        issues = fn()
        bad += bool(issues)
        print(f"{'FAIL' if issues else 'ok  '} {name}")
        for i in issues:
            print(f"       {i}")
    fails, notes = check_lint_gate()
    bad += bool(fails)
    print(f"{'FAIL' if fails else 'ok  '} lint gate (approved+ episodes)")
    for i in fails:
        print(f"       {i}")
    for i in notes:
        print(f"       (draft, not gating) {i}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
