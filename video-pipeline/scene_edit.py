"""Scene edits that leave a trail: validated, reasoned, logged (free, local, no paid calls).
  python run.py scene <episode> <scene-id> set <path> <value> --reason "why" [--actor agent|owner] [--dry] [--allow-rendered] [--allow-lint-errors] [--string]
  python run.py scene <episode> <scene-id> unset <path> --reason "why" [same flags]
  python run.py decisions <episode> [<scene-id>]

<path> is relative to the scene, dotted: narration | visual.prompt | visual.term.label | shot.size ...
<value> is the token right after <path> (it may start with "--"). It is parsed as JSON (numbers, true/false, lists, objects) unless the field already
holds a string or you pass --string, in which case it stays a string. Single-user tool: two simultaneous edits of one episode can overwrite each other.
A change is refused (nothing written) when it breaks the schema, introduces a new lint ERROR, changes a scene id, or touches an episode that is
already rendered/posted without --allow-rendered. A reason is mandatory. Every applied change appends one line to episodes/<id>/decisions.jsonl:
{ts, actor, scene, op, path, before, after, reason, lint_new, lint_resolved}. Only scenes whose content hash changed regenerate on the next build
(cache.py); `verify` goes stale automatically when narration/claims/analogy/mechanism/concepts/loops change (verify.fingerprint)."""
import copy
import json

import lint
import registry
import verify

LOG = "decisions.jsonl"


def log_path(ep_dir):
    return ep_dir / LOG


def read_log(ep_dir) -> list:
    p = log_path(ep_dir)
    return [json.loads(x) for x in p.read_text().splitlines() if x.strip()] if p.exists() else []


def _get(d, parts):
    for k in parts:
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


def _set(d, parts, value):
    for k in parts[:-1]:
        d = d.setdefault(k, {})
        if not isinstance(d, dict):
            raise SystemExit(f"cannot set below non-object '{k}'")
    d[parts[-1]] = value


def _unset(d, parts):
    for k in parts[:-1]:
        d = d.get(k) if isinstance(d, dict) else None
        if d is None:
            return
    if isinstance(d, dict):
        d.pop(parts[-1], None)


def _errors(ep) -> set:
    return {(r, m) for s, r, m in lint.run(ep) if s == "error"}


def edit(ep_ref: str, sid: str, op: str, path: str, raw, reason: str, actor="agent", dry=False, allow_rendered=False, allow_lint=False, force_string=False) -> int:
    d = registry.resolve(ep_ref)
    ep = registry.read(d)
    sc = next((s for s in ep["scenes"] if s["id"] == sid), None)
    if sc is None:
        raise SystemExit(f"no scene '{sid}' in {ep['id']} (scenes: {', '.join(s['id'] for s in ep['scenes'])})")
    parts = path.split(".")
    if parts == ["id"]:
        raise SystemExit("scene ids are referenced by mechanism/concepts/loops; changing one is not an edit this command makes")
    if len((reason or "").strip()) < 10:
        raise SystemExit("--reason is required (at least 10 characters): say why, not what")
    status = registry.status_of(ep)
    if registry.STATUSES.index(status) >= registry.STATUSES.index("rendered") and not allow_rendered:
        raise SystemExit(f"{ep['id']} is '{status}': this edit would no longer match the rendered/posted video. Re-run with --allow-rendered if intended.")
    before_v = _get(sc, parts)
    new = copy.deepcopy(ep)
    nsc = next(s for s in new["scenes"] if s["id"] == sid)
    if op == "set":
        value = raw
        if not force_string and not isinstance(before_v, str):  # an existing string field stays a string ("42" is text there)
            try:
                value = json.loads(raw)
            except (TypeError, ValueError):
                pass
        _set(nsc, parts, value)
    else:
        value = None
        _unset(nsc, parts)
    after_v = _get(nsc, parts)
    if before_v == after_v:
        print("no change")
        return 0
    bad = lint.schema_issues(new)
    if bad:
        print("REFUSED: result does not validate against the schema")
        for _, _, m in bad:
            print(f"  {m}")
        return 1
    b_err, a_err = _errors(ep), _errors(new)
    new_err, fixed = sorted(a_err - b_err), sorted(b_err - a_err)
    if new_err and not allow_lint:
        print("REFUSED: introduces new lint error(s) (override with --allow-lint-errors)")
        for r, m in new_err:
            print(f"  {r}: {m}")
        return 1
    stale = verify.fingerprint(ep) != verify.fingerprint(new)
    print(f"{ep['id']} {sid}.{path}: {json.dumps(before_v, ensure_ascii=False)[:120]}  ->  {json.dumps(after_v, ensure_ascii=False)[:120]}")
    for r, m in fixed:
        print(f"  resolves lint error {r}: {m}")
    for r, m in new_err:
        print(f"  NEW lint error {r}: {m}")
    if stale:
        print(f"  QA report is now stale: run `run.py verify {ep['id']}` before approving")
    if dry:
        print("(dry run, nothing written)")
        return 0
    registry.write(d, new)
    entry = {"ts": registry.now(), "actor": actor, "scene": sid, "op": op, "path": path, "before": before_v, "after": after_v, "reason": reason.strip(),
             "lint_new": [f"{r}: {m}" for r, m in new_err], "lint_resolved": [f"{r}: {m}" for r, m in fixed]}
    with log_path(d).open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    import storyboard
    storyboard.main([str(d)])
    return 0


def show(ep_ref: str, sid=None) -> int:
    rows = [r for r in read_log(registry.resolve(ep_ref)) if sid in (None, r["scene"])]
    if not rows:
        print("no decisions logged")
    for r in rows:
        print(f"{r['ts']} [{r['actor']}] {r['scene']}.{r['path']}: {json.dumps(r['after'], ensure_ascii=False)[:80]}  - {r['reason']}")
    return 0


def main(args: list) -> int:
    """args after `scene`: <ep> <sid> set|unset <path> [<value>] --reason ..."""
    flags = {"--dry", "--allow-rendered", "--allow-lint-errors", "--string"}
    vopts = {"--reason", "--actor"}
    pos, opts, i = [], {}, 0
    while i < len(args):
        a = args[i]
        if a in flags:
            opts[a] = True
            i += 1
        elif a in vopts:
            if i + 1 >= len(args):
                raise SystemExit(f"{a} needs a value")
            opts[a] = args[i + 1]
            i += 2
        elif a.startswith("--") and not (len(pos) == 4 and pos[2] == "set"):  # the token after <path> is the value, even if it starts with "--"
            raise SystemExit(f"unknown option {a!r}")
        else:
            pos.append(a)
            i += 1
    if len(pos) < 4 or pos[2] not in ("set", "unset") or (pos[2] == "set") != (len(pos) == 5) or len(pos) > 5:
        print((__doc__ or "").split("\n\n")[0])
        return 1
    return edit(pos[0], pos[1], pos[2], pos[3], pos[4] if len(pos) == 5 else None, opts.get("--reason", ""), opts.get("--actor", "agent"),
                "--dry" in opts, "--allow-rendered" in opts, "--allow-lint-errors" in opts, "--string" in opts)
