"""Asset manifest + cost estimate before any paid generation (free, local; creates and changes no assets).
  python run.py manifest <episode> [--json]

No planning logic of its own: it runs the REAL stage functions from run.py (tts, illustrations, keyframes, clips) against the REAL provider
objects, but with generation swapped for a recorder, in a scratch output folder of symlinks to the existing assets. Whatever a stage would
generate, given its own cache keys, is recorded instead of generated, so the manifest cannot drift from what a build would actually pay for.
Prices: only what config/providers.yaml records (today: video price_per_second with its source/date). Other units are counted, not priced.
Known limit: if a keyframe will be regenerated, its clip is counted as regenerated too (a real run re-hashes the new keyframe)."""
import contextlib
import io
import json
import tempfile
from pathlib import Path

import registry
import run
from adapters.common import ROOT, provider_cfg

ORDER = ("tts", "illustrations", "keyframes", "clips")  # PAID stages, in build order
_REAL = run.load_provider  # captured before plan() swaps run.load_provider
_KIND = {"audio": "voice line", "illustrations": "image", "keyframes": "keyframe", "clips": "video clip"}


def _mirror(real: Path, scratch: Path) -> None:
    """Scratch copy of out/<id> made of symlinks: stages can read assets and stamps, and anything they write lands in the scratch folder."""
    for name in ("audio", "keyframes", "clips", "illustrations"):  # the dirs run.load() creates; stages assume they exist
        (scratch / name).mkdir()
        if (real / name).is_dir():
            for f in (real / name).iterdir():
                if f.suffix in (".json", ".key", ".txt"):  # stamps/metadata are WRITTEN by stages (cache.mark, meta.write_text): copy, never symlink,
                    (scratch / name / f.name).write_bytes(f.read_bytes())  # or the write lands in the real file (ep03 s3.json was zeroed this way)
                else:
                    (scratch / name / f.name).symlink_to(f.resolve())


def _recorder(kind: str, calls: list):
    inst = _REAL(kind)  # the real adapter (keys are read lazily at call time, so building one needs no credentials)

    def rec_generate(prompt, out_path, *a, **k):
        calls.append((Path(out_path).parent.name, Path(out_path).stem, len(str(prompt))))

    def rec_synth(text, out_path):
        calls.append(("audio", Path(out_path).stem, len(text)))
        return {"duration": 0.0, "characters": len(text)}

    if hasattr(inst, "synth"):
        inst.synth = rec_synth
    if hasattr(inst, "generate"):
        inst.generate = rec_generate
    return inst


def _snapshot(real: Path) -> dict:
    """(mtime_ns, size) of every file under out/<id> asset dirs: a manifest must never change a real asset."""
    return {str(f): (f.stat().st_mtime_ns, f.stat().st_size) for name in ("audio", "keyframes", "clips", "illustrations")
            if (real / name).is_dir() for f in (real / name).iterdir() if f.is_file()}


def plan(ep_ref: str) -> dict:
    d = registry.resolve(ep_ref)
    ep = registry.read(d)
    ep["_card"] = run.audience_card(ep)
    calls, notes = [], []
    real_out = ROOT / "out" / ep["id"]
    saved = (run.load_provider, run.FORCE_COST)
    before = _snapshot(real_out)
    run.load_provider, run.FORCE_COST = (lambda kind: _recorder(kind, calls)), True  # FORCE_COST: see the plan even when over the cap
    try:
        with tempfile.TemporaryDirectory() as td:
            scratch = Path(td)
            _mirror(real_out, scratch)
            for name in ORDER:
                buf = io.StringIO()
                try:
                    with contextlib.redirect_stdout(buf):
                        run.STAGES[name](ep, scratch, False)
                except SystemExit as e:  # a stage that would refuse to run (e.g. last frame missing) is reported, not hidden
                    notes.append(f"{name}: blocked: {e}")
    finally:
        run.load_provider, run.FORCE_COST = saved
    if _snapshot(real_out) != before:  # hard guard (code review 2026-10-05): a plan that touched a real asset is a bug, never a silent one
        raise RuntimeError(f"manifest changed real files under out/{ep['id']}: the scratch mirror leaked a write; investigate before building")
    todo = {(sub, sid) for sub, sid, _ in calls}
    # a regenerated keyframe re-hashes into its clip key: count that clip as regenerated too
    todo |= {("clips", sid) for sub, sid in list(todo) if sub == "keyframes" and not sid.endswith("_last")}
    rows = []
    for sc in ep["scenes"]:
        v, sid = sc["visual"], sc["id"]
        need = [("audio", sid)]
        if v["type"] in ("illustration", "photo"):
            need.append(("illustrations", sid))
        if v["type"] == "clip":
            need += ([("keyframes", sid)] if v.get("keyframe_prompt") else []) + [("clips", sid)]
        rows.append({"scene": sid, "assets": [{"kind": _KIND[k], "state": "GENERATE" if (k, s) in todo else "cached"} for k, s in need]})
    n_clips = sum(1 for k, _ in todo if k == "clips")
    vcfg = provider_cfg("video")
    dur, pps, cap = (vcfg.get("init_args") or {}).get("duration", 6), vcfg.get("price_per_second"), vcfg.get("max_clip_cost_usd")
    est = round(n_clips * dur * pps, 2) if pps is not None else None
    counts = {kind: sum(1 for k, _ in todo if k == key) for key, kind in _KIND.items()}
    return {"id": ep["id"], "status": registry.status_of(ep), "rows": rows, "counts": counts,
            "chars_to_voice": sum(c for sub, _, c in calls if sub == "audio"),
            "clip_cost_usd": est, "clip_price_per_second": pps, "clip_seconds_each": dur, "cap_usd": cap,
            "over_cap": bool(est is not None and cap is not None and est > cap), "notes": notes}


def render(m: dict) -> str:
    L = [f"# Asset manifest: {m['id']} (status {m['status']})", "", "| scene | assets |", "|---|---|"]
    for r in m["rows"]:
        L.append(f"| {r['scene']} | " + ", ".join(f"{a['kind']}: {a['state']}" for a in r["assets"]) + " |")
    c = m["counts"]
    L += ["", "To generate: " + ", ".join(f"{n} {k}" + ("s" if n != 1 else "") for k, n in c.items() if n) if any(c.values()) else "", ""]
    if m["counts"]["voice line"]:
        L.append(f"- voice: {m['chars_to_voice']} characters (price not recorded in providers.yaml)")
    if m["counts"]["image"] + m["counts"]["keyframe"]:
        L.append(f"- images: {m['counts']['image'] + m['counts']['keyframe']} (price not recorded in providers.yaml)")
    if m["counts"]["video clip"]:
        if m["clip_cost_usd"] is None:
            L.append(f"- clips: {m['counts']['video clip']} x {m['clip_seconds_each']}s, price unknown")
        else:
            L.append(f"- clips: {m['counts']['video clip']} x {m['clip_seconds_each']}s x ${m['clip_price_per_second']}/s = **${m['clip_cost_usd']:.2f}**"
                     + (f" ({'OVER' if m['over_cap'] else 'under'} the ${m['cap_usd']:.2f} cap)" if m["cap_usd"] is not None else " (no cap)"))
    L += [f"- NOTE {n}" for n in m["notes"]]
    return "\n".join(x for x in L if x is not None)


def main(args: list) -> int:
    ref = next((a for a in args if not a.startswith("--")), None)
    if not ref:
        print((__doc__ or "").split("\n\n")[0])
        return 1
    m = plan(ref)
    print(json.dumps(m, indent=2) if "--json" in args else render(m))
    return 0
