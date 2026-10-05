"""Compact allowed-keys/enums view of direction/episode.schema.json for the director prompt (bug D4: the writer never saw the
`direction` / `shot` / `continuity` shapes and invented keys such as `seconds` and `dialect`).

    import schema_skeleton
    schema_skeleton.schema_skeleton("direction.cold_open")
    -> {"path": "direction.cold_open", "closed": True, "keys": {"archetype": "string", "duration_s": "number", "bridge": [...], ...},
        "required": [], "required_when": [{"when": {"direction.mode": ["cold-open-drama", "hybrid"]}, "required": [...]}]}
    schema_skeleton.prompt_block()  # all five kinds as one compact JSON text block

Kinds: direction, direction.cold_open, direction.style_segments[], continuity, scenes[].shot (KINDS). Read live from the schema file,
so the prompt can never drift from what lint validates. No LLM, no network."""
import json

from adapters.common import ROOT

SCHEMA_FILE = ROOT / "direction" / "episode.schema.json"
KINDS = ("direction", "direction.cold_open", "direction.style_segments[]", "continuity", "scenes[].shot")


def _schema() -> dict:
    return json.loads(SCHEMA_FILE.read_text())


def _node(schema: dict, path: str):
    """Walk 'a.b[]' paths: '.' = object property, '[]' = array items. Returns (node, parent, last_key)."""
    node, parent, key = schema, None, None
    for part in path.split("."):
        arr = part.endswith("[]")
        name = part[:-2] if arr else part
        parent, key = node, name
        node = (node.get("properties") or {})[name]
        if arr:
            node = node["items"]
    return node, parent, key


def _type(p: dict):
    """Compact type: enum list, 'string', 'array<string>', 'object', 'string|null' ..."""
    if "enum" in p:
        return list(p["enum"])
    if "const" in p:
        return [p["const"]]
    t = p.get("type")
    if isinstance(t, list):
        return "|".join(t)
    if t == "array":
        it = p.get("items") or {}
        inner = _type(it) if it else "any"
        return f"array<{inner if isinstance(inner, str) else '|'.join(map(str, inner))}>"
    if t == "object" and isinstance(p.get("additionalProperties"), dict):
        return f"object<key -> {_type(p['additionalProperties'])}>"
    return t or "any"


def _archetypes() -> list:
    try:
        import brain
        return sorted(i[5:] for i in brain.cards() if i.startswith("arch-") and i not in ("arch-conventions", "arch-ai-safe", "arch-router"))
    except Exception:  # noqa: BLE001 - the skeleton must still work if a craft file is mid-edit
        return []


def _lint_values(kind: str) -> dict:
    if kind in ("scenes[].shot", "direction.cold_open"):
        a = _archetypes()
        return {"archetype": a} if a else {}
    if kind == "direction.style_segments[]":
        return {"medium": ["native", "cinematic"]}
    return {}


def _rules(owner: dict, owner_path: str):
    """(when, then) for each allOf[{if: {properties: {field: {enum|const}}}, then}] on `owner` (an enum-style condition only)."""
    for rule in owner.get("allOf") or []:
        cond = (rule.get("if") or {}).get("properties") or {}
        when = {f"{owner_path}.{f}" if owner_path else f: (c.get("enum") or ([c["const"]] if "const" in c else None)) for f, c in cond.items()}
        if when and all(when.values()):
            yield when, rule.get("then") or {}


def schema_skeleton(kind: str) -> dict:
    """Allowed keys (with compact types/enums), required keys, closed or open, and conditional requirements for one kind."""
    if kind not in KINDS:
        raise ValueError(f"unknown kind {kind!r}; one of {KINDS}")
    schema = _schema()
    node, _, key = _node(schema, kind)
    props = node.get("properties") or {}
    out = {"path": kind, "closed": node.get("additionalProperties") is False,
           "keys": {k: _type(v) for k, v in props.items()}, "required": list(node.get("required") or [])}
    rw = [{"when": w, "required": list(th["required"])} for w, th in _rules(node, kind) if th.get("required")]
    if not kind.endswith("[]"):  # a parent object may require keys of this one conditionally (direction.mode -> cold_open keys)
        ppath = kind.rsplit(".", 1)[0] if "." in kind else ""
        pnode = _node(schema, ppath)[0] if ppath else schema
        for w, th in _rules(pnode, ppath):
            sub = ((th.get("properties") or {}).get(key) or {}).get("required")
            if sub or key in (th.get("required") or []):
                rw.append({"when": w, "required": list(sub or []), **({"this_object_required": True} if key in (th.get("required") or []) else {})})
    if rw:
        out["required_when"] = rw
    vals = _lint_values(kind)
    if vals:
        out["values"] = vals  # string fields that lint checks against a fixed list (warn/error), not a schema enum
    if node.get("patternProperties"):
        out["extension_keys"] = list(node["patternProperties"])
    return out


def prompt_block() -> str:
    """One compact text block for the director's system prompt: every kind, exact key names, enums and conditional requirements."""
    lines = ["EXACT JSON SHAPES (from direction/episode.schema.json; use these key names only, unknown keys are schema errors where closed=true):"]
    for k in KINDS:
        lines.append(f"{k}: {json.dumps(schema_skeleton(k), ensure_ascii=False, separators=(',', ':'))}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(prompt_block())
