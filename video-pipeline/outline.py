"""L3 outline layer — build a story outline from brief.json + research.json.

  python run.py outline <ep-id>

Builds episodes/<id>/outline.json (schema_version 1) with explainer beats:
  hook -> concept explained plainly -> the event/data -> the why -> payoff

Each beat has: id, question_ids, one_idea, terms_introduced[], visual_type (from
SCENES.md valid types), evidence_ids, target_seconds.

Validators (free, instant — reuse lint.py helpers where they fit):
  - Every brief question answered by a beat IN THE BRIEF'S ORDER
  - Terms introduced before use across beats
  - Chronology monotone for dated events (when field)
  - Visual types valid and at least 3 distinct types
  - Every number beat has an evidence id

If approvals.outline is true in brief.json, prints the outline and exits 3
(owner must approve). Otherwise validates and continues.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from adapters.common import ROOT, load_provider

# ---------------------------------------------------------------------------
# Valid scene types from remotion-app/SCENES.md and episode.schema.json
# ---------------------------------------------------------------------------
VALID_VISUAL_TYPES = {
    "chart", "timeline", "forces", "number", "compare", "steps", "diagram",
    "illustration", "clip", "photo", "numberline",
}

# Slice 1 explainer: data-led visuals only (no clips, photos or illustrations; owner decision, saves cost and avoids invented imagery)
EXPLAINER_TYPES = {"chart", "timeline", "forces", "number", "compare", "steps", "diagram"}

# Explainer genre beats (seeds for the outline, brief order wins)
EXPLAINER_BEATS = [
    ("hook",    "Hook: pose the question or show the surprising fact"),
    ("concept", "Concept: define the key terms plainly"),
    ("event",   "Event/Data: what actually happened, with numbers"),
    ("why",     "Why: the mechanism or cause"),
    ("payoff",  "Payoff: answer the brief question directly"),
]

# ---------------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------------

def validate(outline: dict, brief: dict) -> list[tuple[str, str]]:
    """Return [(severity, message)] for all validation failures.
    severity is 'error' (blocks run) or 'warn' (advisory)."""
    issues: list[tuple[str, str]] = []
    beats = outline.get("beats") or []

    # --- every brief question answered ---
    brief_qids = [q["id"] for q in brief.get("questions") or []]
    answered: list[str] = []
    for b in beats:
        answered.extend(b.get("question_ids") or [])
    for qid in brief_qids:
        if qid not in answered:
            issues.append(("error", f"outline_question_unanswered: question {qid!r} not answered by any beat"))

    # --- brief order preserved ---
    answered_order = [qid for qid in answered if qid in brief_qids]
    seen: list[str] = []
    for qid in answered_order:
        if qid not in seen:
            seen.append(qid)
    if seen != brief_qids and brief_qids:
        issues.append(("error", f"outline_question_order: beats answer questions in wrong order. "
                       f"Brief: {brief_qids}, outline: {seen}"))

    # --- terms introduced before use ---
    introduced_so_far: set[str] = set()
    for b in beats:
        for term in (b.get("terms_used") or []):
            if term and term not in introduced_so_far:
                issues.append(("error", f"outline_term_before_use: term {term!r} used in beat {b['id']!r} before introduction"))
        for term in (b.get("terms_introduced") or []):
            introduced_so_far.add(term)

    # --- chronology monotone for dated events ---
    prev_when: str | None = None
    for b in beats:
        when = b.get("when")
        if when and prev_when and when < prev_when:
            issues.append(("warn", f"outline_chronology: beat {b['id']!r} when={when!r} is before previous when={prev_when!r}"))
        if when:
            prev_when = when

    # --- valid visual types ---
    for b in beats:
        vt = b.get("visual_type") or ""
        if vt and vt not in VALID_VISUAL_TYPES:
            issues.append(("error", f"outline_visual_type: beat {b['id']!r} has unknown visual_type {vt!r} "
                           f"(valid: {sorted(VALID_VISUAL_TYPES)})"))

    # --- explainer (Slice 1): data-led visuals only; number/chart/forces beats must carry a figure; first beat is a short hook; 55-80 s total ---
    if (brief.get("genre") or "explainer") == "explainer":
        for bi, b in enumerate(beats):
            vt = b.get("visual_type") or ""
            if vt and vt not in EXPLAINER_TYPES:
                issues.append(("error", f"outline_visual_type: beat {b['id']!r} uses {vt!r}; the explainer uses only {sorted(EXPLAINER_TYPES)}"))
            if bi > 0 and vt in ("number", "chart", "forces") and not re.search(r"\d", b.get("one_idea") or ""):
                issues.append(("error", f"outline_figure_missing: beat {b['id']!r} ({vt}) names no figure in one_idea; put the real number or date in it"))
        if beats and len((beats[0].get("one_idea") or "").split()) > 14:
            issues.append(("error", "outline_hook_long: beat 1 is the hook and must be a short question or fact (at most 12 words)"))
        total = sum(float(b.get("target_seconds") or 0) for b in beats)
        if total and not 55 <= total <= 80:
            issues.append(("error", f"outline_duration: total {total:.0f}s; the explainer targets 60-75s"))

    # --- at least 3 distinct visual types ---
    distinct_vt = {b.get("visual_type") for b in beats if b.get("visual_type")}
    if len(distinct_vt) < 3:
        issues.append(("warn", f"outline_visual_variety: only {len(distinct_vt)} distinct visual type(s); aim for 3+"))

    # --- every number/chart/timeline beat has an evidence id ---
    NUMBER_BEATS = {"chart", "timeline", "number", "forces"}
    for b in beats:
        if b.get("visual_type") in NUMBER_BEATS and not b.get("evidence_ids"):
            issues.append(("error", f"outline_number_no_evidence: beat {b['id']!r} (visual_type={b.get('visual_type')!r}) has no evidence_ids"))

    return issues


# ---------------------------------------------------------------------------
# Outline prompt (small, ~3-4k tokens)
# ---------------------------------------------------------------------------

def _build_prompt(brief: dict, research: dict) -> str:
    questions_text = "\n".join(
        f"  {q['id']}: {q['text']}" for q in brief.get("questions") or []
    )
    # Compact evidence summaries
    ev_lines: list[str] = []
    for row in (research.get("questions") or []):
        summary = row.get("answer_summary") or ""
        if summary:
            ev_lines.append(f"  {row['id']} ({row.get('evidence_ids', [])}): {summary[:480]}")
    evidence_text = "\n".join(ev_lines) if ev_lines else "  (no research summaries available)"

    # Valid types list
    valid_types_str = ", ".join(sorted(EXPLAINER_TYPES))

    return f"""You are a story designer for short-form explainer videos (60-75 seconds).

BRIEF QUESTIONS (in order — beats must answer them in this order):
{questions_text}

RESEARCH SUMMARIES:
{evidence_text}

VALID VISUAL TYPES (choose from these only):
{valid_types_str}

TASK: Design an outline for an EXPLAINER video. Use these beats: hook, concept, event, why, payoff.
Map brief questions to beats. Each beat answers one or more questions.

Rules:
- Beats must answer all brief questions IN THE BRIEF'S ORDER.
- Define terms (terms_introduced) before using them (terms_used) in later beats.
- Use at least 3 distinct visual_type values across all beats.
- Show the information itself with the listed visual types only (no clips, photos or illustrations).
- No analogies or invented props in one_idea: say the real thing (who sells, who buys, how much, why).
- For beats with visual_type in [chart, timeline, number, forces]: always include evidence_ids.
- Beat 1 is the hook: id b1, one short question or surprising fact (at most 12 spoken words), 5-6 seconds. Then 5-6 more beats of 8-14 seconds each. target_seconds must total 60-75.
- For every beat with visual_type chart, number, forces, timeline or compare, one_idea MUST contain the exact figures and names from the research summaries (for example the rupee amounts bought and sold, index levels, the date). A number scene without its number is wrong.
- Define FII and DII in the concept beat in plain words before any beat that uses them.
- one_idea: one short sentence, plain language (no jargon unless defined).

Return JSON only:
{{
  "beats": [
    {{
      "id": "b1",
      "question_ids": ["q1"],
      "one_idea": "short plain sentence",
      "terms_introduced": ["FII"],
      "terms_used": [],
      "visual_type": "number",
      "evidence_ids": ["ev-1"],
      "target_seconds": 8,
      "when": null
    }}
  ]
}}"""


# ---------------------------------------------------------------------------
# Main outline run
# ---------------------------------------------------------------------------

def run(ep_id: str) -> int:
    from brief import load as load_brief
    from research import load as load_research

    try:
        brief = load_brief(ep_id)
    except FileNotFoundError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    try:
        research = load_research(ep_id)
    except FileNotFoundError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    # Check approval gate
    approvals = brief.get("approvals") or {}
    if approvals.get("outline"):
        # outline approval is ON — print and exit 3 (owner must approve)
        out_path = ROOT / "episodes" / ep_id / "outline.json"
        if out_path.exists():
            outline = json.loads(out_path.read_text())
            _print_outline(outline)
            print("\nOutline approval is required (approvals.outline=true in brief.json).\n"
                  "Review the outline above, then set approvals.outline to false in brief.json to continue.",
                  file=sys.stderr)
            return 3
        print("Outline approval required but outline.json does not exist yet. Generating...")

    llm = load_provider("llm")
    prompt = _build_prompt(brief, research)

    print(f"Building outline for {ep_id}...")
    try:
        result = llm.generate_json(prompt, system="You are a story designer. Return only valid JSON.")
    except Exception as exc:
        print(f"error: LLM call failed: {exc}", file=sys.stderr)
        return 1

    beats = result.get("beats") or []
    if not beats:
        print("error: LLM returned no beats", file=sys.stderr)
        return 1

    outline: dict = {
        "schema_version": 1,
        "id": ep_id,
        "genre": brief.get("genre") or "explainer",
        "beats": beats,
    }

    # Validate; on errors give the model the beats back with the exact errors, up to 2 repair calls (outline_repair, small prompt)
    issues = validate(outline, brief)
    errors = [(s, m) for s, m in issues if s == "error"]
    for attempt in (1, 2):
        if not errors:
            break
        print(f"outline repair {attempt}: {len(errors)} validator error(s)")
        fix = (prompt + "\n\nYOUR PREVIOUS OUTLINE:\n" + json.dumps({"beats": outline["beats"]}, ensure_ascii=False)
               + "\n\nVALIDATOR ERRORS (fix exactly these, keep everything else; a term must be introduced in an EARLIER beat than the first beat that uses it, "
               "so either add it to terms_introduced of an earlier beat or stop using it before it is introduced):\n" + "\n".join(f"- {m}" for _, m in errors)
               + "\nReturn the full corrected JSON.")
        try:
            rep = llm.generate_json(fix, system="You are a story designer. Return only valid JSON.")
        except Exception as exc:
            print(f"error: outline repair call failed: {exc}", file=sys.stderr)
            break
        if rep.get("beats"):
            outline["beats"] = rep["beats"]
        issues = validate(outline, brief)
        errors = [(s, m) for s, m in issues if s == "error"]
    warnings = [(s, m) for s, m in issues if s == "warn"]

    for _, msg in warnings:
        print(f"  warn: {msg}")

    if errors:
        for _, msg in errors:
            print(f"  error: {msg}", file=sys.stderr)
        print("Outline validation failed — not written. Fix the brief or re-run.", file=sys.stderr)
        return 1

    # Write outline.json
    ep_dir = ROOT / "episodes" / ep_id
    ep_dir.mkdir(parents=True, exist_ok=True)
    out_path = ep_dir / "outline.json"
    out_path.write_text(json.dumps(outline, indent=2, ensure_ascii=False))
    print(f"outline.json written: {out_path}")
    _print_outline(outline)
    return 0


def _print_outline(outline: dict):
    beats = outline.get("beats") or []
    print(f"\nOutline ({outline.get('id')}, {outline.get('genre')}, {len(beats)} beats):")
    total = 0
    for b in beats:
        t = b.get("target_seconds", 0)
        total += t
        print(f"  {b['id']:6s}  {b.get('visual_type','?'):12s}  {t:3.0f}s  {b.get('one_idea','')[:60]}")
    print(f"  total: {total}s")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    if not argv:
        print("usage: run.py outline <ep-id>", file=sys.stderr)
        return 1
    return run(argv[0])


def load(ep_id: str) -> dict:
    """Load outline.json for ep_id. Raises FileNotFoundError if missing."""
    p = ROOT / "episodes" / ep_id / "outline.json"
    if not p.exists():
        raise FileNotFoundError(f"outline.json not found for {ep_id}: {p}")
    return json.loads(p.read_text())
