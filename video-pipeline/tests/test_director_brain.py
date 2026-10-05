"""Director + direction-brain fixes from docs/plans/youtube-automation/DIRECTION-AB-ep03.md (bugs D1-D12, L2/L7/L8 director-side).
Free: no network, no LLM, no paid call. LLMs and news are fakes; dotenv is stubbed so ../.env is never read.
  python3 tests/test_director_brain.py -v      (or: python3 -m unittest discover -s tests)"""
import contextlib
import copy
import io
import json
import random
import re
import shutil
import sys
import tempfile
import threading
import types
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
_fake_dotenv = types.ModuleType("dotenv")
_fake_dotenv.load_dotenv = lambda *a, **k: False  # never read ../.env in tests
sys.modules["dotenv"] = _fake_dotenv

import brain  # noqa: E402
import director  # noqa: E402
import lint  # noqa: E402

SCHEMA = json.loads((HERE / "direction" / "episode.schema.json").read_text())
import atexit  # noqa: E402
_TEST_DATA = Path(tempfile.mkdtemp(prefix="director-test-"))
director.DATA = _TEST_DATA  # every draft/state write in this module lands in a temp dir, never in the repo
atexit.register(shutil.rmtree, _TEST_DATA, True)


def var_for(aud, mode, **kw):
    return {"audience": aud, "card": director.cards()[aud], "formats": list(director.formats())[:3], "domains": ["food"], "mode": mode, **kw}


def quiet(fn, *a, **k):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        res = fn(*a, **k)
    return res, buf.getvalue()


class FakeLLM:
    """Records calls; answers from a list (dict or callable(prompt, system))."""

    def __init__(self, answers=()):
        self.answers, self.calls = list(answers), []

    def generate_json(self, prompt, system=None):
        self.calls.append({"prompt": prompt, "system": system})
        a = self.answers.pop(0)
        return a(prompt, system) if callable(a) else copy.deepcopy(a)


def scene(sid, narration, vtype="illustration", **vis):
    return {"id": sid, "beat": "hook" if sid == "s1" else "body", "narration": narration, "visual": {"type": vtype, **vis}}


# ---------------------------------------------------------------- (1) forced mode vs envelope


class ForcedModeEnvelope(unittest.TestCase):
    def test_older_adult_cold_open_refused_with_allowed_list(self):
        with self.assertRaises(SystemExit) as cm:
            director.variety([], random.Random(1), force_audience="older_adult", force_mode="cold-open-drama")
        msg = str(cm.exception)
        allowed = brain.style_envelope("older_adult")["modes"]
        self.assertIn("not allowed for audience 'older_adult'", msg)
        for m in allowed:
            self.assertIn(m, msg)
        self.assertIn("--force-mode", msg)

    def test_force_mode_overrides_with_warning(self):
        var, out = quiet(director.variety, [], random.Random(1), force_audience="older_adult", force_mode="cold-open-drama", override=True)
        self.assertEqual(var["modes"], ["cold-open-drama"])
        self.assertTrue(var["mode_forced_outside_envelope"])
        self.assertIn("WARNING: --force-mode", out)

    def test_allowed_and_unknown_modes(self):
        var = director.variety([], random.Random(1), force_audience="older_adult", force_mode="documentary")
        self.assertEqual(var["modes"], ["documentary"])
        self.assertFalse(var["mode_forced_outside_envelope"])
        with self.assertRaises(SystemExit):
            director.variety([], random.Random(1), force_audience="kids", force_mode="noir")

    def test_force_mode_flag_needs_mode(self):
        with self.assertRaises(SystemExit):
            director.check_args(["--topic", "x", "--force-mode"])
        director.check_args(["--topic", "x", "--mode", "hybrid", "--force-mode"])
        director.check_args(["--repair", "ep13-x", "--force-mode"])


# ---------------------------------------------------------------- (2) no self-contradiction


def allowed_modes_line(prompt):
    m = re.search(r"allowed direction modes: (\[.*?\])\n", prompt)
    return m.group(1) if m else ""


class PromptConsistency(unittest.TestCase):
    def test_mode_is_inside_the_envelope_line(self):
        for aud, mode in (("curious_adult", "cold-open-drama"), ("kids", "explainer"), ("older_adult", "documentary")):
            sp = director.system_prompt(var_for(aud, mode))
            self.assertIn(mode, allowed_modes_line(sp), (aud, mode))
            self.assertIn(f"Set `direction.mode` to '{mode}'", sp)
            self.assertNotIn("exactly '", sp)

    def test_forced_mode_is_marked_not_contradicted(self):
        sp = director.system_prompt(var_for("older_adult", "cold-open-drama", mode_forced_outside_envelope=True))
        line = allowed_modes_line(sp)
        self.assertIn("cold-open-drama (owner override for this episode)", line)
        self.assertIn("--force-mode", sp)


# ---------------------------------------------------------------- (3) bridges from one place


class Bridges(unittest.TestCase):
    def test_one_list_everywhere(self):
        schema_enum = SCHEMA["properties"]["direction"]["properties"]["cold_open"]["properties"]["bridge"]["enum"]
        self.assertEqual(set(brain.RENDERABLE_BRIDGES), set(schema_enum))
        self.assertIs(director.RENDERABLE_BRIDGES, brain.RENDERABLE_BRIDGES)
        lint_list = getattr(lint, "RENDERABLE_BRIDGES", None) or getattr(lint, "_BRIDGES", None)
        if lint_list is not None:
            self.assertEqual(set(lint_list), set(brain.RENDERABLE_BRIDGES))

    def test_sentence_derived_and_no_stale_text(self):
        s = director.bridges_sentence()
        for b in brain.RENDERABLE_BRIDGES:
            self.assertIn(b, s)
        self.assertIn(str(len(brain.RENDERABLE_BRIDGES)), s)
        sp = director.system_prompt(var_for("curious_adult", "cold-open-drama"))
        self.assertNotIn("not yet supported", sp)
        self.assertNotIn("not yet supported", Path(director.__file__).read_text())
        with mock.patch.object(brain, "RENDERABLE_BRIDGES", ("pull-back",)), mock.patch.object(director, "RENDERABLE_BRIDGES", ("pull-back",)):
            self.assertIn("all 1 render", director.bridges_sentence())


# ---------------------------------------------------------------- (4) skeleton + directed example


class Skeleton(unittest.TestCase):
    def test_skeleton_has_exact_keys_and_enums(self):
        sk = director.shape_skeleton(brain.style_envelope("curious_adult"))
        bf = SCHEMA["properties"]["direction"]["properties"]["cold_open"]["properties"]["bridge_frames"]
        for frag in ("direction: {mode?: explainer|cold-open-drama|hybrid|montage|documentary", "mode_reason", "lens?: string", "skills_used",
                     "cold_open?: {archetype", "duration_s", "bridge?: ", f"bridge_frames?: integer {bf['minimum']}-{bf['maximum']}", "question", "scene_ids",
                     "medium: native|cinematic", "continuity: {characters", "scenes[].shot: {archetype",
                     "size?: ews|ws|ms|mcu|cu|ecu|insert|pov|ots"):
            self.assertIn(frag, sk)
        self.assertIn("medium: native,", director.shape_skeleton(brain.style_envelope("kids")).replace("medium: native}", "medium: native,"))

    def test_skeleton_is_read_at_runtime(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            s = copy.deepcopy(SCHEMA)
            s["properties"]["scenes"]["items"]["properties"]["shot"]["properties"]["brand_new_key"] = {"enum": ["a", "b"]}
            (tmp / "episode.schema.json").write_text(json.dumps(s))
            with mock.patch.object(director, "D", tmp):
                self.assertIn("brand_new_key?: a|b", director.shape_skeleton())
        finally:
            shutil.rmtree(tmp)

    def test_example_matches_schema_and_director_check(self):
        import jsonschema
        ex = director.EXAMPLE_COLD_OPEN
        jsonschema.validate(ex["direction"], SCHEMA["properties"]["direction"])
        jsonschema.validate(ex["continuity"], SCHEMA["properties"]["continuity"])
        shot_schema = SCHEMA["properties"]["scenes"]["items"]["properties"]["shot"]
        for s in ex["scenes"]:
            jsonschema.validate(s["shot"], shot_schema)
            self.assertTrue(set(s["shot"]) <= set(shot_schema["properties"]), set(s["shot"]) - set(shot_schema["properties"]))
            self.assertFalse(director.CJK.search(json.dumps(s, ensure_ascii=False)))
        self.assertTrue(set(ex["direction"]) <= set(SCHEMA["properties"]["direction"]["properties"]))
        self.assertTrue(set(ex["direction"]["cold_open"]) <= set(SCHEMA["properties"]["direction"]["properties"]["cold_open"]["properties"]))
        issues = director.director_checks({"direction": ex["direction"], "scenes": ex["scenes"]})
        self.assertEqual([i for i in issues if i[0] == "error"], [])
        self.assertIn(ex["direction"]["cold_open"]["bridge"], brain.RENDERABLE_BRIDGES)
        self.assertIn(f"arch-{ex['direction']['cold_open']['archetype']}", brain.cards())

    def test_prompt_carries_skeleton_and_example_for_drama_only(self):
        drama = director.system_prompt(var_for("curious_adult", "cold-open-drama"))
        expl = director.system_prompt(var_for("curious_adult", "explainer"))
        self.assertIn("SHAPES (exact key names", drama)
        self.assertIn("SHAPES (exact key names", expl)
        self.assertIn("DIRECTED EXAMPLE", drama)
        self.assertNotIn("DIRECTED EXAMPLE", expl)


# ---------------------------------------------------------------- (5) recipe cards reach the writer; render fields


class CardsReachWriter(unittest.TestCase):
    def test_render_shows_archetype_fields(self):
        c = brain.cards()["arch-pursuit"]
        kids = brain.render([c], audience="kids")
        for k in ("RECIPE:", "DURATION_S:", "BRIDGE_OUT:", "KIDS_VARIANT"):
            self.assertIn(k, kids)
        self.assertNotIn("KIDS_VARIANT", brain.render([c], audience="curious_adult"))
        self.assertIn("PARAMS:", brain.render([brain.cards()["lens-wonder-reaction"]]))

    def test_drama_pack_has_archetype_lens_and_bridge_cards(self):
        env = brain.style_envelope("curious_adult")
        sp = director.system_prompt(var_for("curious_adult", "cold-open-drama", arch="arch-pursuit", lens=env["lenses"][0], bridge="j-cut"))
        self.assertIn("### arch-pursuit - ", sp)  # full card
        self.assertIn(f"### {env['lenses'][0]} - ", sp)
        for lens in env["lenses"][1:]:
            self.assertIn(f"- {lens}: ", sp)  # compact menu
        for b in brain.RENDERABLE_BRIDGES:
            self.assertIn(f"### mode-bridge-{b} - ", sp)
        self.assertIn("use 'pursuit' unless", sp)
        self.assertIn("use 'j-cut' unless", sp)

    def test_explainer_pack_unchanged_by_extras(self):
        self.assertEqual(brain.drama_extras("explainer", "kids"), "")
        self.assertNotIn("### mode-bridge-j-cut", director.system_prompt(var_for("kids", "explainer")))

    def test_kids_menu_respects_audience(self):
        x = brain.drama_extras("cold-open-drama", "kids", "arch-reveal", "lens-wonder-reaction")
        self.assertIn("KIDS_VARIANT", x)
        for i in brain.archetypes_for("cold-open-drama", "kids"):
            aud = brain.cards()[i].get("audience_fit")
            self.assertTrue(not aud or "kids" in aud)
        self.assertNotIn("lens-procedural-precision", x)  # not in the kids envelope

    def test_choose_shape_validates_against_menus(self):
        v = var_for("kids", "cold-open-drama")
        llm = FakeLLM([{"archetype": "reveal", "lens": "lens-wonder-reaction", "bridge": "question-card"}])
        self.assertEqual(quiet(director.choose_shape, llm, {"headline": "leaves"}, v)[0], {"arch": "arch-reveal", "lens": "lens-wonder-reaction", "bridge": "question-card"})
        llm = FakeLLM([{"archetype": "demonstrate", "lens": "lens-neon-memory", "bridge": "wipe"}])
        self.assertEqual(quiet(director.choose_shape, llm, {"headline": "leaves"}, v)[0], {"arch": None, "lens": None, "bridge": None})
        self.assertEqual(director.choose_shape(FakeLLM(), {}, var_for("kids", "explainer")), {})

        def boom(p, s):
            raise RuntimeError("rate limit")
        self.assertEqual(quiet(director.choose_shape, FakeLLM([boom]), {"headline": "x"}, v)[0], {})


# ---------------------------------------------------------------- (6) dialect


class Dialect(unittest.TestCase):
    def test_dialect_resolved_from_providers(self):
        self.assertEqual(brain.dialect_name("video"), "hailuo")
        txt = brain.clip_dialect("video")
        self.assertIn("HOUSE RULE", txt)
        self.assertIn("natural English sentence", txt)
        for head in ("## 0b.", "## 9.", "### 12.4", "### 12.6"):
            self.assertIn(head, txt)
        self.assertNotIn("## 0. What we actually call", txt)
        self.assertIn("DIALECT `direction/craft/dialects/hailuo.md`", director.system_prompt(var_for("curious_adult", "explainer")))

    def test_section_extraction_bounds(self):
        only = brain.dialect_sections("hailuo", ["12.4"])
        self.assertTrue(only.startswith("### 12.4"))
        self.assertNotIn("### 12.5", only)
        self.assertNotIn("## 0b", only)

    def test_director_prompt_does_not_demand_brackets(self):
        dp = (HERE / "direction" / "director_prompt.md").read_text()
        self.assertNotIn("Use `[Camera command]` syntax", dp)
        self.assertIn("natural English sentence", dp)
        self.assertIn("stay permitted", dp)


# ---------------------------------------------------------------- (7) id reservation + early sources.json


class TmpRoot(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "episodes").mkdir()
        self.p = mock.patch.object(director, "DATA", self.tmp)
        self.p.start()

    def tearDown(self):
        self.p.stop()
        shutil.rmtree(self.tmp)


class Reservation(TmpRoot):
    def test_sequential_and_hand_made(self):
        (self.tmp / "episodes" / "ep05-hand-made").mkdir()
        a, da = director.reserve_id("Why is the sky blue")
        b, db = director.reserve_id("Why is the sky blue")
        self.assertEqual((a, b), ("ep06-sky-blue", "ep07-sky-blue"))
        self.assertTrue(da.is_dir() and db.is_dir())
        (self.tmp / "out" / "director_ids" / "ep08").mkdir()  # another run holds 08
        self.assertTrue(director.reserve_id("x y z")[0].startswith("ep09-"))

    def test_concurrent_runs_never_share_an_id(self):
        ids, errs = [], []

        def go():
            try:
                ids.append(director.reserve_id("How Crew-13 reached the space station")[0])
            except Exception as e:  # pragma: no cover
                errs.append(e)
        ts = [threading.Thread(target=go) for _ in range(12)]
        [t.start() for t in ts]
        [t.join() for t in ts]
        self.assertEqual(errs, [])
        self.assertEqual(len(set(ids)), 12)
        self.assertEqual(len({i.split("-")[0] for i in ids}), 12)

    def test_draft_without_scenes_stays_out_of_episodes(self):
        v = var_for("kids", "explainer")
        topic = {"headline": "h", "angle": "", "why_now": "", "source_urls": []}
        quiet(director._save_draft, "ep01-x", {"title": "t"}, v, topic)
        self.assertFalse((self.tmp / "episodes" / "ep01-x" / "episode.json").exists())
        self.assertTrue((self.tmp / "out" / "ep01-x" / "draft_invalid.json").exists())

    def test_sources_written_before_the_writer_call(self):
        news_items = [
            {"title": "SpaceX Crew-13 docks with the space station - Teslarati", "url": "https://news.google.com/rss/articles/T1", "published": "2026-10-01", "source": "Teslarati", "summary": ""},
            {"title": "Crew-13 docks at the space station", "url": "https://news.google.com/rss/articles/N1", "published": "2026-10-01", "source": "NASA", "source_url": "https://www.nasa.gov", "summary": ""},
            {"title": "FOMC statement", "url": "https://www.federalreserve.gov/x", "published": "2026-10-01", "source": "Federal Reserve", "summary": ""}]
        news = mock.Mock()
        news.fetch.return_value = news_items
        seen = {}

        def writer(prompt, system):
            ep_dirs = [d for d in (self.tmp / "episodes").iterdir()]
            seen["dirs"] = ep_dirs
            seen["sources"] = json.loads((ep_dirs[0] / "sources.json").read_text())
            raise RuntimeError("simulated crash in the 15-minute writer call")
        fast, slow = FakeLLM(), FakeLLM([writer])
        forced = {"title": "Rendezvous", "url": "https://en.wikipedia.org/wiki/Space_rendezvous", "published": "", "source": "en.wikipedia.org",
                  "source_url": "https://en.wikipedia.org", "summary": "", "forced": True, "readable": True}
        prov = {"llm": fast, "news": news, "llm_write": slow}
        with mock.patch.object(director, "load_provider", side_effect=lambda k: prov[k]), mock.patch.object(director, "existing", return_value=[]), \
                mock.patch("adapters.news_rss.fetch_page", return_value=forced), mock.patch.object(director, "CANDIDATES", self.tmp / "out" / "c.json"):
            with self.assertRaises(SystemExit):
                quiet(director.main, ["--topic", "How Crew-13 reached the space station", "--audience", "curious_adult", "--mode", "explainer", "--no-analogy-check",
                                      "--source", "https://en.wikipedia.org/wiki/Space_rendezvous"])
        self.assertEqual(len(seen["dirs"]), 1)
        urls = [i["url"] for i in seen["sources"]]
        self.assertEqual(urls[0], forced["url"])  # forced source first
        self.assertIn("https://news.google.com/rss/articles/N1", urls)
        self.assertTrue((seen["dirs"][0] / "sources.json").exists())  # survives the crash -> --repair has the catalog
        self.assertIn("cite ONLY by SOURCE ID", slow.calls[0]["prompt"])
        self.assertIn("S1: Rendezvous", slow.calls[0]["prompt"])
        self.assertNotIn("https://", slow.calls[0]["prompt"].split("WORKED EXAMPLE")[0])  # the model never sees a URL to copy


# ---------------------------------------------------------------- (8) source ranking / authority / --source


class Sources(unittest.TestCase):
    ITEMS = [
        {"title": "SpaceX nails Lucky 13 astronaut launch - Teslarati", "url": "https://news.google.com/a", "source": "Teslarati", "summary": "space station crew reached"},
        {"title": "Fed holds rates", "url": "https://www.federalreserve.gov/p", "source": "Federal Reserve", "summary": ""},
        {"title": "NASA's SpaceX Crew-13 docks at space station", "url": "https://news.google.com/b", "source": "NASA", "source_url": "https://www.nasa.gov", "summary": ""},
        {"title": "Space station rendezvous explained", "url": "https://en.wikipedia.org/wiki/Space_rendezvous", "source": "Wikipedia", "summary": "orbit"},
        {"title": "Space station crew arrives", "url": "https://news.google.com/c", "source": "University of Somewhere", "summary": ""}]

    def test_authority_tiers(self):
        a = director.authority
        self.assertEqual(a(self.ITEMS[2])[0], "primary")  # publisher url behind a Google News redirect
        self.assertEqual(a("https://science.nasa.gov/x")[0], "primary")
        self.assertEqual(a("https://www.noaa.gov")[0], "primary")
        self.assertEqual(a("https://cs.stanford.edu/x")[0], "primary")  # .edu suffix
        self.assertEqual(a("https://en.wikipedia.org/wiki/X")[0], "reference")
        self.assertEqual(a("https://www.reuters.com/x")[0], "major")
        self.assertEqual(a(self.ITEMS[0])[0], "other")
        self.assertEqual(a(self.ITEMS[4])[0], "primary")  # name pattern
        self.assertEqual(a("https://news.google.com/rss/articles/zzz")[0], "other")

    def test_rank_prefers_authority_and_drops_irrelevant(self):
        ranked = director.rank_sources(self.ITEMS, "How Crew-13 reached the space station")
        urls = [i["url"] for i in ranked]
        self.assertNotIn("https://www.federalreserve.gov/p", urls)  # authoritative but irrelevant
        self.assertLess(urls.index("https://news.google.com/b"), urls.index("https://news.google.com/a"))
        self.assertLess(urls.index("https://en.wikipedia.org/wiki/Space_rendezvous"), urls.index("https://news.google.com/a"))
        self.assertEqual(len(director.rank_sources(self.ITEMS * 5, "space station", k=3)), 3)

    def test_claim_authority_warning(self):
        ep = {"claims": [{"claim": "lower orbits are faster", "url": "https://news.google.com/a"},
                         {"claim": "phasing", "url": "https://en.wikipedia.org/wiki/Space_rendezvous"}]}
        w = director.source_report(ep, self.ITEMS)
        self.assertEqual(len(w), 1)
        self.assertEqual(w[0][:2], ("warn", "director_source_authority"))
        self.assertIn("Teslarati", w[0][2])

    def test_source_flag(self):
        director.check_args(["--topic", "x", "--source", "https://a.gov/1", "--source", "https://b.edu/2"])
        with self.assertRaises(SystemExit):
            director.check_args(["--topic", "x", "--source", "not-a-url"])
        with self.assertRaises(SystemExit):
            director.check_args(["--topic", "x", "--topic", "y"])
        html = "<html><title>Space rendezvous</title><body>" + "orbit " * 200 + "</body></html>"
        resp = mock.Mock(ok=True, is_redirect=False, status_code=200, encoding="utf-8")
        resp.raw.read.return_value = html.encode()
        with mock.patch("adapters.news_rss.requests.get", return_value=resp), mock.patch("adapters.news_rss._check_url"):
            items, _ = quiet(director.fetch_forced, ["https://en.wikipedia.org/wiki/Space_rendezvous"])
        self.assertEqual(items[0]["title"], "Space rendezvous")
        self.assertTrue(items[0]["forced"] and items[0]["readable"])
        self.assertEqual(director.authority(items[0])[0], "reference")


# ---------------------------------------------------------------- (9) repair loop


def long_ep(aud="curious_adult", mode="explainer"):
    lim = director.sentence_limit(director.cards()[aud])
    long_ = " ".join(["word"] * (lim + 5)) + "."
    return {"id": "ep99-t", "title": "t", "audience": aud, "direction": {"mode": mode},
            "scenes": [scene("s1", "Why is it so?"), scene("s2", long_ + " Short one."), scene("s3", "Fine sentence here.")]}, lim


class RepairLoop(unittest.TestCase):
    def test_repair_var_reroutes_forbidden_mode(self):
        ep, _ = long_ep("older_adult", "cold-open-drama")
        v, out = quiet(director.repair_var, ep)
        self.assertEqual(v["mode"], "explainer")
        self.assertEqual(v["mode_changed_from"], "cold-open-drama")
        self.assertIn("not allowed", out)
        v2, _ = quiet(director.repair_var, ep, True)
        self.assertEqual(v2["mode"], "cold-open-drama")
        self.assertTrue(v2["mode_forced_outside_envelope"])

    def test_prompt_lists_sentences_counts_limit_and_fixed(self):
        ep, lim = long_ep()
        v = var_for("curious_adult", "explainer")
        long_now = director.long_sentences(ep, v["card"])
        self.assertEqual(len(long_now), 1)
        p = director.repair_prompt(ep, [("error", "sentence_words_max", "s2: long")], long_now, {"s4": ["Kept short."]}, v)
        self.assertIn(f"- s2 ({lim + 5} words, limit {lim}): \"{long_now[0][1]}\"", p)
        self.assertIn("rewrite ONLY these", p)
        self.assertIn("ALREADY FIXED IN AN EARLIER PASS", p)
        self.assertIn("- s4 (2 words): \"Kept short.\"", p)

    def test_refine_tracks_fixed_sentences_and_uses_short_pack(self):
        ep, lim = long_ep()
        v = var_for("curious_adult", "explainer")
        long_s3 = " ".join(["more"] * (lim + 3)) + "."

        def pass1(prompt, system):  # patch: fixes the first s2 sentence, keeps a long one, and tries to lengthen out-of-scope s3
            scenes = json.loads(prompt.split("SCENES TO FIX: ", 1)[1])
            self.assertEqual([s["id"] for s in scenes], ["s2"])  # scene-local errors -> only the failing scene goes out
            scenes[0]["narration"] = "Now it is short. " + long_s3
            return {"scenes": scenes + [{"id": "s3", "beat": "body", "narration": long_s3, "visual": {"type": "illustration", "prompt": "x"}}]}

        def pass2(prompt, system):
            return {"scenes": json.loads(prompt.split("SCENES TO FIX: ", 1)[1])}
        llm = FakeLLM([pass1, pass2])

        def fake_check(e, urls, items=None):
            return [("error", "sentence_words_max", f"{sid}: {n}-word sentence") for sid, _, n, _ in director.long_sentences(e, v["card"])]
        with mock.patch.object(director, "check", side_effect=fake_check), mock.patch.object(director, "_save_draft"), \
                mock.patch.object(director.verify, "run", return_value={"issues": [], "passed": True, "comprehension": {"grade": {"score": 5}}}):
            (out, _), _ = quiet(director.refine, llm, ep, "ep99-t", v, {"source_urls": []}, [], 2)
        self.assertEqual(len(llm.calls), 2)
        self.assertEqual(out["scenes"][2]["narration"], "Fine sentence here.")  # out-of-scope scene untouched: no oscillation possible
        second = llm.calls[1]["prompt"]
        self.assertIn("- s2 (", second)
        self.assertIn("ALREADY FIXED", second)
        self.assertIn("\"Now it is short.\"", second)
        for c in llm.calls:
            self.assertNotIn("## shots.md", c["system"])
            self.assertLess(director.token_count(c["system"]), director.token_count(director.system_prompt(v)) / 5)

    def test_refine_never_keeps_forbidden_mode(self):
        ep, _ = long_ep("older_adult", "cold-open-drama")
        v, _ = quiet(director.repair_var, ep)

        def keeps_drama(prompt, system):
            e = json.loads(prompt.split("EPISODE:\n", 1)[1])
            e["direction"] = {"mode": "cold-open-drama", "cold_open": {"bridge": "pull-back"}}
            return e
        llm = FakeLLM([keeps_drama])
        with mock.patch.object(director, "check", return_value=[("error", "dir_mode_allowed", "x")]), mock.patch.object(director, "_save_draft"), \
                mock.patch.object(director.verify, "run", return_value={"issues": [], "passed": True, "comprehension": {"grade": {"score": 5}}}):
            (out, _), _ = quiet(director.refine, llm, ep, "ep99-t", v, {"source_urls": []}, [], 1)
        self.assertEqual(out["direction"]["mode"], "explainer")
        self.assertNotIn("cold_open", out["direction"])
        self.assertIn("MODE CHANGE: set direction.mode to 'explainer'", llm.calls[0]["prompt"])


# ---------------------------------------------------------------- (10) prompt size / tokens


class PromptSize(unittest.TestCase):
    PROBLEMS = [("error", "sentence_words_max", "s3: 23-word sentence: '...'"), ("error", "analogy_misleads", "lane analogy inverts speed"),
                ("error", "real-text-counts", "s4 term sticker"), ("error", "director_cold_open_required", "missing ['duration_s']")]

    def test_repair_pack_is_small_and_targeted(self):
        rows = []
        for aud, mode in (("curious_adult", "cold-open-drama"), ("curious_adult", "explainer"), ("kids", "cold-open-drama"), ("older_adult", "explainer")):
            v = var_for(aud, mode, arch="arch-reveal" if mode != "explainer" else None)
            full = director.token_count(director.system_prompt(v))
            short = director.token_count(director.repair_system_prompt(v, self.PROBLEMS))
            rows.append((aud, mode, full, short))
            self.assertLess(short, full * 0.15, (aud, mode, full, short))
            self.assertLess(full, 40000, "writer system prompt regressed past 40k tokens")
        rp = director.repair_system_prompt(var_for("curious_adult", "cold-open-drama"), self.PROBLEMS)
        for cid in ("real-text-counts", "mode-cold-open-drama"):
            self.assertIn(f"### {cid} - ", rp)
        self.assertNotIn("### gram-lens-picker", rp)  # an uncited card
        self.assertIn("sentence_words_max", rp)  # the cited qa_checklist rule
        sys.stderr.write("\n  tokens (cl100k proxy) full writer prompt vs repair prompt; before this change every repair re-sent the full prompt:\n")
        for aud, mode, full, short in rows:
            sys.stderr.write(f"    {aud:14} {mode:16} full {full:6}  repair {short:5}  (per-repair saving {full - short})\n")

    def test_repair_pack_pulls_packaging_only_when_cited(self):
        v = var_for("kids", "explainer")
        self.assertNotIn("## packaging.md", director.repair_system_prompt(v, [("error", "sentence_words_max", "x")]))
        self.assertIn("## packaging.md", director.repair_system_prompt(v, [("error", "title_length", "x")]))
        self.assertIn("## hooks.md", director.repair_system_prompt(v, [("error", "hook_length_max", "x")]))

    def test_packs_deduplicated(self):
        ids = director._card_ids(var_for("curious_adult", "explainer"))
        self.assertEqual(len(ids), len(set(ids)))
        sp = director.system_prompt(var_for("curious_adult", "explainer"))
        self.assertEqual(sp.count("### arch-mechanism-demo - "), 1)


# ---------------------------------------------------------------- (11) required cold-open fields


class ColdOpenRequired(unittest.TestCase):
    def test_missing_fields_fail(self):
        ep = {"direction": {"mode": "cold-open-drama", "skills_used": ["x"], "cold_open": {"bridge": "question-card"}}, "scenes": [scene("s1", "Hook?")]}
        errs = [i for i in director.director_checks(ep) if i[1] == "director_cold_open_required"]
        self.assertEqual(len(errs), 1)
        for k in ("archetype", "duration_s", "scene_ids", "question"):
            self.assertIn(k, errs[0][2])
        ep["direction"]["cold_open"] = {"archetype": "reveal", "duration_s": 6, "bridge": "pull-back", "scene_ids": ["s1"]}
        self.assertFalse([i for i in director.director_checks(ep) if i[1] == "director_cold_open_required"])
        ep["direction"] = {"mode": "hybrid"}
        self.assertTrue([i for i in director.director_checks(ep) if i[1] == "director_cold_open_required"])
        self.assertFalse(director.director_checks({"direction": {"mode": "explainer"}, "scenes": []}))

    def test_prompt_states_required(self):
        sp = director.system_prompt(var_for("kids", "cold-open-drama"))
        self.assertIn("REQUIRED for mode 'cold-open-drama'", sp)
        for k in ("cold_open.archetype", "cold_open.duration_s", "cold_open.bridge", "cold_open.scene_ids"):
            self.assertIn(k, sp)
        self.assertIn("audience cap 8 s", sp)

    def test_other_shot_checks(self):
        ep = {"scenes": [{"id": "s1", "narration": "x", "visual": {"type": "clip"}, "shot": {"archetype": "demonstrate", "duration_s": 8}}]}
        rids = {i[1] for i in director.director_checks(ep)}
        self.assertIn("director_shot_archetype", rids)
        if director.video_clip_seconds() and director.video_clip_seconds() < 8:
            self.assertIn("director_clip_duration", rids)


# ---------------------------------------------------------------- (12) CJK leakage


class CJKLeakage(unittest.TestCase):
    def test_cjk_rejected_in_visual_prompts(self):
        for bad in ("The camera pushes in, 镜头 slow.", "slow カメラ push", "카메라 push in", "push in。"):
            ep = {"scenes": [scene("s5", "Fine.", "clip", motion_prompt=bad, keyframe_prompt="a tree")]}
            self.assertEqual([i[1] for i in director.director_checks(ep)], ["director_prompt_cjk"], bad)
        ok = {"scenes": [scene("s1", "Fine.", "clip", motion_prompt="Café crème — the camera holds a static shot.", keyframe_prompt="naïve façade")]}
        self.assertEqual(director.director_checks(ok), [])

    def test_director_copy_steps_aside_when_lint_reports_it(self):
        ep = {"id": "ep99-x", "scenes": [scene("s1", "Hook?", "clip", motion_prompt="push 镜头")]}
        with mock.patch.object(lint, "schema_issues", return_value=[]), mock.patch.object(lint, "provenance", return_value=[]):
            with mock.patch.object(lint, "run", return_value=[("error", "prompt_cjk_leak", "s1")]):
                self.assertEqual([i[1] for i in director.check(ep, set(), [])], ["prompt_cjk_leak"])
            with mock.patch.object(lint, "run", return_value=[]):
                self.assertEqual([i[1] for i in director.check(ep, set(), [])], ["director_prompt_cjk"])

    def test_not_hidden_behind_schema_errors(self):
        ep = {"id": "ep99-x", "title": "t", "audience": "older_adult", "direction": {"mode": "cold-open-drama"},
              "scenes": [scene("s1", "Hook?", "clip", motion_prompt="镜头 push")]}
        issues = director.check(ep, set(), [])
        rids = [i[1] for i in issues]
        self.assertIn("schema", rids)
        self.assertTrue({"director_prompt_cjk", "prompt_cjk_leak"} & set(rids))  # lint now runs on invalid drafts too (best effort)
        self.assertTrue({"director_mode_allowed", "dir_mode_allowed"} & set(rids))
        self.assertTrue({"director_cold_open_required", "dir_cold_open_fields", "dir_cold_open_present"} & set(rids))
        self.assertEqual(rids[:len([i for i in issues if i[0] == "error"])], [i[1] for i in issues if i[0] == "error"])  # errors first



# ================================================================ round 2 (DIRECTION-AB-ep03 section 6)

ITEMS2 = [{"title": "Orbit phasing", "url": "https://en.wikipedia.org/wiki/Orbit_phasing", "source": "Wikipedia", "summary": "space station orbit"},
          {"title": "Crew-13 docks", "url": "https://news.google.com/rss/articles/CBMiVERYLONGREDIRECTxyz?oc=5", "source": "NASA",
           "source_url": "https://www.nasa.gov", "summary": "space station crew"}]


class R2ChooseShapePrefixes(unittest.TestCase):
    def test_prefixed_and_bare_answers_both_accepted(self):
        v = var_for("kids", "cold-open-drama")
        for ans in ({"archetype": "arch-reveal", "lens": "lens-wonder-reaction", "bridge": "mode-bridge-question-card"},
                    {"archetype": "reveal", "lens": "wonder-reaction", "bridge": "question-card"}):
            res, _ = quiet(director.choose_shape, FakeLLM([ans]), {"headline": "leaves"}, v)
            self.assertEqual(res, {"arch": "arch-reveal", "lens": "lens-wonder-reaction", "bridge": "question-card"}, ans)


class R2SchemaKeys(unittest.TestCase):
    def test_claim_key_from_schema_and_no_stale_text(self):
        self.assertEqual(director.claim_key(), "url")
        self.assertNotIn("claims[].source_url", Path(director.__file__).read_text())
        self.assertNotIn("claims[].source_url", (HERE / "direction" / "director_prompt.md").read_text())

    def test_writer_prompt_uses_ids_and_resolves_urls(self):
        v = var_for("curious_adult", "explainer")
        topic = {"headline": "How Crew-13 reached the space station", "angle": "", "why_now": "", "audience_misconception": "", "source_urls": [i["url"] for i in ITEMS2]}

        def writer(p, s):
            return {"claims": [{"claim": "phasing", "url": "S1"}, {"claim": "docked", "url": "[S2]"}, {"claim": "bad", "url": "S9"}],
                    "news_hook": {"event": "docking", "url": "S2"}, "mechanism": [{"step": "drop lower", "scene": "s2", "source": "S1"}],
                    "packaging": {"description": "Sources: {S1} and {S2}"}}
        llm = FakeLLM([writer])
        ep, out = quiet(director.write_episode, llm, topic, ITEMS2, v, "ep99-x", [])
        self.assertEqual(ep["claims"][0]["url"], ITEMS2[0]["url"])
        self.assertEqual(ep["claims"][1]["url"], ITEMS2[1]["url"])  # exact 100+ char redirect, never typed by the model
        self.assertEqual(ep["claims"][2]["url"], "S9")  # unknown id stays visible for provenance
        self.assertEqual(ep["news_hook"]["url"], ITEMS2[1]["url"])
        self.assertEqual(ep["mechanism"][0]["source"], ITEMS2[0]["url"])
        self.assertIn(ITEMS2[0]["url"], ep["packaging"]["description"])
        prompt = llm.calls[0]["prompt"]
        self.assertNotIn("http", prompt.split("WORKED EXAMPLE")[0])
        self.assertIn("claims[].url", prompt)
        self.assertNotIn("source_url", prompt.split("WORKED EXAMPLE")[0])
        self.assertIn("LLM writer: ~", out)  # (11) size printed before the call

    def test_round_trip(self):
        ids = director.source_ids(ITEMS2)
        ep = {"claims": [{"claim": "c", "url": ITEMS2[1]["url"]}], "packaging": {"pinned_comment": "Source: " + ITEMS2[1]["url"]}}
        x = director.to_ids(ep, ids)
        self.assertEqual(x["claims"][0]["url"], "S2")
        self.assertEqual(x["packaging"]["pinned_comment"], "Source: {S2}")
        self.assertEqual(director.from_ids(x, ids)[0], ep)


class R2Skeleton(unittest.TestCase):
    def test_contract_and_visual_shapes(self):
        sk = director.shape_skeleton(brain.style_envelope("curious_adult"))
        for frag in ("mechanism: [{step: string (the step as a short sentence", "claims: [{claim: string, url: string (a SOURCE ID",
                     "sources: [{claim: string, url: string", "packaging: {primary_keyword: string", "long_form?: {", "OMIT unless a real long-form",
                     "intent?: string (10-120 chars)", "term lives inside visual", "compare: {type: \"compare\", colA: string, colB: string, rows: [{a: string, b: string}], winner?: A|B}",
                     "steps: {type: \"steps\", title: string, steps: [string]}", "clip: {type: \"clip\", motion_prompt: string", "No field accepts null",
                     "OMIT the key when there is no lens (never null)", "FREE Remotion: chart, timeline, forces"):
            self.assertIn(frag, sk)
        self.assertNotIn("orbit: {type", sk)
        self.assertIn("orbit: {type: \"orbit\"", director.shape_skeleton(None, space=True))
        self.assertIn("never emit visual.type diagram / photo / remotion / orbit", sk)

    def test_required_visual_keys_come_from_schema(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            s = copy.deepcopy(SCHEMA)
            vis = s["properties"]["scenes"]["items"]["properties"]["visual"]
            for rule in vis["allOf"]:
                if rule["if"]["properties"]["type"].get("const") == "number":
                    rule["then"]["required"] = ["value", "label", "unit"]
            (tmp / "episode.schema.json").write_text(json.dumps(s))
            with mock.patch.object(director, "D", tmp):
                self.assertIn("label: string, unit: string", director.shape_skeleton())
        finally:
            shutil.rmtree(tmp)


class R2VisualTypes(unittest.TestCase):
    def ep(self, vis, title="Why do leaves change color"):
        return {"title": title, "scenes": [{"id": "s1", "narration": "x", "visual": vis}]}

    def rids(self, ep):
        return [i[1] for i in director.director_checks(ep) if i[1] in ("director_visual_type", "director_orbit_shape")]

    def test_hand_authored_types_rejected_unless_flagged(self):
        self.assertEqual(self.rids(self.ep({"type": "diagram", "nodes": []})), ["director_visual_type"])
        self.assertEqual(self.rids(self.ep({"type": "photo", "still": "x.png"})), ["director_visual_type"])
        self.assertEqual(self.rids({**self.ep({"type": "diagram", "nodes": []}), "x-hand_authored": True}), [])
        self.assertEqual(self.rids(self.ep({"type": "diagram", "nodes": [], "x-hand_authored": True})), [])

    def test_orbit_only_for_space_and_documented_shape(self):
        good = {"type": "orbit", "mode": "orbit", "rings": [{"id": "iss", "r": 0.635}, {"id": "low", "r": 0.57}],
                "bodies": [{"id": "st", "ring": "iss", "label": "Station"}, {"id": "you", "ring": "low", "label": "You", "startAngle": 40}]}
        self.assertEqual(self.rids(self.ep(good)), ["director_visual_type"])  # leaves topic
        space = "How Crew-13 reached the space station"
        self.assertEqual(self.rids(self.ep(good, space)), [])
        bad = copy.deepcopy(good)
        bad["bodies"][1]["ring"] = "nope"
        self.assertEqual(self.rids(self.ep(bad, space)), ["director_orbit_shape"])
        kf = copy.deepcopy(good)
        kf["bodies"][0]["keyframes"] = [{"at": 0, "angle": 1}]
        self.assertEqual([i[0] for i in director.director_checks(self.ep(kf, space)) if i[1] == "director_orbit_shape"], ["warn"])
        self.assertEqual(self.rids(self.ep({"type": "orbit", "mode": "cannon"}, space)), [])


class R2RepairBudgets(unittest.TestCase):
    VERIFY_FAIL = {"issues": [["error", "analogy_misleads", "analogy predicts 'the inner car is slower' but reality: a lower orbit is faster"]],
                   "passed": False, "comprehension": {"grade": {"score": 3}}}

    def run_refine(self, check_results, verify_result, mech=2, sem=2, budget=None):
        ep, _ = long_ep()
        v = var_for("curious_adult", "explainer")
        def echo(p, s):  # a whole-episode rewrite that changes something (so verify sees a new draft)
            e = json.loads(p.split("EPISODE:\n", 1)[1])
            e["title"] = e["title"] + "+"
            return e
        llm = FakeLLM([echo] * 10)
        with mock.patch.object(director, "check", side_effect=check_results), mock.patch.object(director, "_save_draft"), \
                mock.patch.object(director.verify, "run", return_value=verify_result) as vr:
            (out, _), log = quiet(director.refine, llm, ep, "ep99-t", v, {"source_urls": []}, [], mech, sem, budget)
        return llm, vr, log

    def test_verifier_gets_its_own_budget_and_exact_findings(self):
        mech_err = [("error", "schema", "mechanism/0/step: 1 is not of type 'string'")]
        llm, vr, log = self.run_refine([mech_err, [], [], []], self.VERIFY_FAIL)
        labels = [c["prompt"].split("\n")[0] for c in llm.calls]
        self.assertEqual(len(llm.calls), 3)  # 1 mechanical + 2 semantic
        self.assertEqual(vr.call_count, 3)
        sem = llm.calls[1]["prompt"]
        self.assertIn("analogy predicts 'the inner car is slower' but reality: a lower orbit is faster", sem)
        self.assertIn("EVERY mapped pair predicts the real behaviour", sem)
        self.assertIn("explain the mechanism literally", sem)
        self.assertIn("Fix the problems", labels[0])
        self.assertIn("LLM semantic repair 2", log)

    def test_mechanical_budget_does_not_eat_semantic(self):
        llm, vr, log = self.run_refine([[("error", "schema", "x")]] * 5, self.VERIFY_FAIL, mech=2, sem=2)
        self.assertEqual(len(llm.calls), 2)  # mechanical budget used up; no semantic repair on a draft with schema errors
        self.assertEqual(vr.call_count, 1)  # ... but the gate still runs once and reports (DIRECTION-AB 7.4 #2)
        self.assertIn("schema/lint errors remain", log)

    def test_run_cap_stops_calls(self):
        llm, _, log = self.run_refine([[("error", "schema", "x")]] * 5, self.VERIFY_FAIL, budget=director.Budget(cap=1000))
        self.assertEqual(len(llm.calls), 0)
        self.assertIn("would exceed the run cap", log)

    def test_unfixable_warning_not_repaired(self):
        self.assertNotIn("no_text_in_image_prompts", director.FIX_WARNINGS)


class R2RestoreRequired(unittest.TestCase):
    def test_dropped_keys_restored_and_bad_new_items_dropped(self):
        prev = {"id": "e", "title": "t", "packaging": {"title": "p"}, "claims": [{"claim": "a", "url": "u"}], "sources": [{"claim": "a", "url": "u"}],
                "direction": {"mode": "cold-open-drama", "cold_open": {"archetype": "reveal", "duration_s": 6, "bridge": "pull-back", "scene_ids": ["s1"]}},
                "scenes": [{"id": "s1", "beat": "hook", "narration": "Look up.", "visual": {"type": "clip", "motion_prompt": "The camera holds.", "keyframe_prompt": "k"}}]}
        new = copy.deepcopy(prev)
        del new["packaging"]
        del new["scenes"][0]["visual"]["motion_prompt"]
        del new["direction"]["cold_open"]["archetype"]
        new["sources"].append({"url": "S3"})  # ep16: a new sources item without `claim`
        new["claims"][0].pop("url")  # same claim text: restorable
        out, notes = director.restore_required(prev, new)
        self.assertEqual(out["packaging"], prev["packaging"])
        self.assertEqual(out["scenes"][0]["visual"]["motion_prompt"], "The camera holds.")
        self.assertEqual(out["direction"]["cold_open"]["archetype"], "reveal")
        self.assertEqual(out["sources"], prev["sources"])
        self.assertEqual(out["claims"][0]["url"], "u")
        self.assertTrue(any("dropped" in n for n in notes))

    def test_changed_visual_type_is_not_patched(self):
        prev = {"scenes": [{"id": "s1", "beat": "b", "narration": "n n", "visual": {"type": "clip", "motion_prompt": "m"}}]}
        new = {"scenes": [{"id": "s1", "beat": "b", "narration": "n n", "visual": {"type": "illustration"}}]}
        out, _ = director.restore_required(prev, new)
        self.assertNotIn("motion_prompt", out["scenes"][0]["visual"])


class R2SourceRelevance(unittest.TestCase):
    def test_single_shared_word_is_not_enough(self):
        items = [{"title": "Major Economic Indicators", "url": "https://www.bls.gov/x", "source": "BLS", "summary": "percent change from last month"},
                 {"title": "Why leaves change color in autumn", "url": "https://www.usda.gov/leaves", "source": "USDA", "summary": ""},
                 {"title": "Fall foliage: leaves color peak", "url": "https://news.google.com/f", "source": "Local TV", "summary": ""}]
        ranked = director.rank_sources(items, "Why do leaves change color in autumn")
        urls = [i["url"] for i in ranked]
        self.assertNotIn("https://www.bls.gov/x", urls)
        self.assertEqual(urls, ["https://www.usda.gov/leaves", "https://news.google.com/f"])

    def test_no_relevant_source_asks_for_source(self):
        news = mock.Mock()
        news.fetch.return_value = [{"title": "FOMC statement", "url": "https://www.federalreserve.gov/x", "source": "Federal Reserve", "summary": ""}]
        prov = {"llm": FakeLLM(), "news": news}
        with mock.patch.object(director, "load_provider", side_effect=lambda k: prov[k]), mock.patch.object(director, "existing", return_value=[]):
            with self.assertRaises(SystemExit) as cm:
                quiet(director.main, ["--topic", "Why do leaves change color in autumn", "--audience", "kids", "--mode", "explainer"])
        self.assertIn("--source", str(cm.exception))


class R2RefuseBeforeNetwork(unittest.TestCase):
    def test_envelope_refusal_makes_no_provider_call(self):
        with mock.patch.object(director, "load_provider", side_effect=AssertionError("network/LLM touched")) as lp, \
                mock.patch.object(director, "existing", return_value=[]):
            with self.assertRaises(SystemExit) as cm:
                director.main(["--topic", "Why do leaves change color", "--audience", "older_adult", "--mode", "cold-open-drama"])
        self.assertIn("not allowed for audience 'older_adult'", str(cm.exception))
        lp.assert_not_called()


class R2SkillsHonesty(unittest.TestCase):
    def ep(self, used, prompt="a woman with a grey scarf at the window", shot=None, lens=None):
        d = {"mode": "explainer", "skills_used": used}
        if lens:
            d["lens"] = lens
        return {"direction": d, "continuity": {"characters": [{"id": "pax", "identity_string": "a woman with a grey scarf"}]},
                "scenes": [{"id": "s1", "narration": "x", "visual": {"type": "clip", "keyframe_prompt": prompt, "motion_prompt": "m"},
                            "shot": shot if shot is not None else {"continuity_ids": ["pax"], "light_source": "window"}}]}

    def warns(self, ep):
        return [i[2] for i in director.director_checks(ep) if i[1] == "director_skills_honest"]

    def test_claims_checked(self):
        self.assertEqual(self.warns(self.ep(["cont-identity-string"])), [])
        w = self.warns(self.ep(["cont-identity-string"], prompt="a woman at the window"))
        self.assertTrue(w and "skills_used claims cont-identity-string but" in w[0])
        self.assertTrue(self.warns(self.ep(["cont-axis-eyelines"])))
        self.assertEqual(self.warns(self.ep(["cont-axis-eyelines"], shot={"continuity_ids": ["pax"], "eyeline": "frame-left", "light_source": "w"})), [])
        self.assertTrue(self.warns(self.ep(["real-light-source"], shot={"continuity_ids": ["pax"]})))
        self.assertTrue(self.warns(self.ep(["arch-reveal"])))
        self.assertTrue(self.warns(self.ep(["lens-wonder-reaction"])))
        self.assertEqual(self.warns(self.ep(["lens-wonder-reaction", "mode-selection", "gram-shot-size"], lens="lens-wonder-reaction")), [])


class R2NativeCinematicWords(unittest.TestCase):
    def ep(self, aud, prompt, segments=None):
        d = {"mode": "explainer"}
        if segments:
            d["style_segments"] = segments
        return {"audience": aud, "direction": d, "scenes": [{"id": "s1", "narration": "x", "visual": {"type": "clip", "keyframe_prompt": prompt, "motion_prompt": "m"}}]}

    def hits(self, ep):
        return [i for i in director.director_checks(ep) if i[1] == "director_native_cinematic_words"]

    def test_kids_cinematic_lens_words_warn(self):
        h = self.hits(self.ep("kids", "A maple tree, cinematic, soft natural light, shallow depth of field, soft bokeh, 35mm"))
        self.assertEqual(len(h), 1)
        self.assertEqual(h[0][0], "warn")
        for w in ("cinematic", "shallow depth of field", "bokeh", "35mm"):
            self.assertIn(w, h[0][2])
        self.assertIn("rewrite", h[0][2])
        self.assertEqual(self.hits(self.ep("kids", "A maple tree in soft gouache, thick friendly outlines")), [])

    def test_adults_only_when_segment_is_native(self):
        p = "cinematic, shallow depth of field"
        self.assertEqual(self.hits(self.ep("curious_adult", p)), [])
        self.assertEqual(len(self.hits(self.ep("curious_adult", p, [{"id": "a", "medium": "native", "scene_ids": ["s1"]}]))), 1)
        self.assertEqual(self.hits(self.ep("curious_adult", p, [{"id": "a", "medium": "cinematic", "scene_ids": ["s1"]}])), [])

    def test_vocabulary_includes_lens_focal_lengths(self):
        terms = director.cinematic_terms()
        self.assertIn("bokeh", terms)
        self.assertTrue(any(re.fullmatch(r"\d{2,3}\s?mm", t) for t in terms))



# ================================================================ round 3 (DIRECTION-AB-ep03 section 7.4); ep17/ep19 drafts are offline fixtures


def fixture(ep_id):
    d = HERE / "episodes" / ep_id
    if not (d / "episode.json").exists():
        raise unittest.SkipTest(f"fixture {ep_id} not present")
    return json.loads((d / "episode.json").read_text()), json.loads((d / "sources.json").read_text()) if (d / "sources.json").exists() else []


PASS = {"issues": [], "passed": True, "comprehension": {"grade": {"score": 5}}}


class R3VerifyAlwaysRuns(unittest.TestCase):
    def test_exhausted_mechanical_budget_still_runs_the_gate_and_reports(self):
        ep17, items = fixture("ep17-crew13-reached-space")
        v = var_for("curious_adult", "cold-open-drama")
        fail = {"issues": [["error", "analogy_misleads", "raise your orbit, get ahead: inverted"]], "passed": False, "comprehension": {"grade": {"score": 5}}}
        llm = FakeLLM([lambda p, s: {"scenes": []}] * 4)  # patches that change nothing: errors stay
        with mock.patch.object(director, "_save_draft"), mock.patch.object(director.verify, "run", return_value=fail) as vr:
            (out, issues), log = quiet(director.refine, llm, ep17, ep17["id"], v, {"source_urls": []}, items, 1, 2)
        self.assertEqual(vr.call_count, 1)
        self.assertIn("analogy_misleads", [i[1] for i in issues])  # the gate's findings are reported
        self.assertEqual(len(llm.calls), 1)  # no semantic repair while schema/lint errors remain


class R3AllLayersAtOnce(unittest.TestCase):
    def test_schema_errors_no_longer_hide_lint(self):
        ep17, items = fixture("ep17-crew13-reached-space")
        issues = director.check(ep17, {i["url"] for i in items}, items)
        rids = [i[1] for i in issues]
        self.assertIn("schema", rids)
        self.assertTrue([r for r in rids if r not in ("schema",) and not r.startswith("director_")], "lint findings missing")
        self.assertIn("term_after_picture", rids)  # a lint error that only surfaced after repair 1 in the real run
        self.assertTrue({"director_placeholder_narration", "dir_cold_open_narration_empty"} & set(rids))  # lint now carries this rule (LINT_EQUIVALENT drops the director copy)
        sev = [i[0] for i in issues]
        self.assertEqual(sev, sorted(sev, key=lambda s: 0 if s == "error" else 1))

    def test_lint_crash_is_contained(self):
        ep = {"id": "x", "scenes": [{"id": "s1", "narration": "Hi there.", "visual": {"type": "clip"}}]}
        with mock.patch.object(lint, "run", side_effect=KeyError("boom")):
            rids = [i[1] for i in director.check(ep, set(), [])]
        self.assertIn("lint_unavailable", rids)
        self.assertIn("schema", rids)


class R3ValueLevelRestore(unittest.TestCase):
    def test_repair_cannot_regress_a_valid_intent(self):
        ep17, _ = fixture("ep17-crew13-reached-space")
        prev = copy.deepcopy(ep17)
        prev["scenes"][2]["intent"] = "Pose the core question in plain words."
        new = copy.deepcopy(ep17)  # s3 intent 170 chars: invalid
        out, notes = director.restore_invalid(prev, new)
        self.assertEqual(out["scenes"][2]["intent"], "Pose the core question in plain words.")
        self.assertTrue(any("s3: restored previous valid intent" in n for n in notes))

    def test_placeholder_narration_is_flagged_not_restored(self):
        for bad in ("", "...", " - "):
            ep = {"scenes": [scene("s1", bad)]}
            self.assertIn("director_placeholder_narration", [i[1] for i in director.director_checks(ep)])
        self.assertNotIn("director_placeholder_narration", [i[1] for i in director.director_checks({"scenes": [scene("s1", "Hiss.")]})])
        prev = {"scenes": [scene("s1", "...")]}
        new = {"scenes": [scene("s1", "")]}
        out, _ = director.restore_invalid(prev, new)
        self.assertEqual(out["scenes"][0]["narration"], "")  # never restore a placeholder; the check asks for a real line


class R3RetryAndResume(unittest.TestCase):
    def test_adapter_retries_timeouts_with_backoff(self):
        import requests
        from adapters.llm_minimax import MiniMaxLLM
        ok = mock.Mock(status_code=200, ok=True)
        ok.json.return_value = {"choices": [{"message": {"content": "{\"a\": 1}"}}], "base_resp": {"status_code": 0}}
        slow = mock.Mock(status_code=503, ok=False)
        with mock.patch("adapters.llm_minimax.minimax_headers", return_value={}), mock.patch("adapters.llm_minimax.time.sleep") as sl, \
                mock.patch("adapters.llm_minimax.requests.post", side_effect=[requests.ReadTimeout("420 s"), slow, ok]):
            out, _ = quiet(MiniMaxLLM(models=["MiniMax-M3"]).generate, "p")
        self.assertEqual(out, "{\"a\": 1}")
        self.assertEqual([c.args[0] for c in sl.call_args_list], [30, 90])
        with mock.patch("adapters.llm_minimax.minimax_headers", return_value={}), mock.patch("adapters.llm_minimax.time.sleep") as sl, \
                mock.patch("adapters.llm_minimax.requests.post", side_effect=requests.ReadTimeout("t")) as post:
            with self.assertRaises(RuntimeError):
                quiet(MiniMaxLLM(models=["MiniMax-M3", "MiniMax-M2.7"]).generate, "p")
        self.assertEqual(post.call_count, 8)  # 4 attempts per model, then the fallback model
        self.assertEqual([c.args[0] for c in sl.call_args_list], [30, 90, 180, 30, 90, 180])

    def test_crash_saves_state_and_repair_resumes_same_budget(self):
        ep19, items = fixture("ep19-moon-change-shape")
        v = var_for("kids", "cold-open-drama")
        bad = copy.deepcopy(ep19)
        bad["scenes"][3]["narration"] = " ".join(["word"] * 30) + "."

        def boom(p, s):
            raise RuntimeError("ReadTimeout after retries")
        budget = director.Budget(spent=42_500)
        with mock.patch.object(director, "_save_draft"), mock.patch.object(director.verify, "run", return_value=PASS):
            with self.assertRaises(SystemExit) as cm:
                quiet(director.refine, FakeLLM([boom]), bad, "ep19-moon-change-shape", v, {"source_urls": []}, items, 2, 2, budget)
        self.assertIn("--repair ep19-moon-change-shape", str(cm.exception))
        st = director.load_state("ep19-moon-change-shape")
        self.assertEqual((st["status"], st["mechanical_used"]), ("crashed", 1))
        self.assertGreaterEqual(st["tokens_spent"], 42_500)
        tmp = Path(tempfile.mkdtemp())
        try:
            (tmp / "episode.json").write_text(json.dumps(bad))
            (tmp / "sources.json").write_text(json.dumps(items))
            seen = {}

            def fake_refine(llm, ep, ep_id, var, topic, items, max_repairs, max_semantic, budget, mech_used, sem_used):
                seen.update(spent=budget.spent, mech=mech_used, sem=sem_used, maxm=max_repairs)
                return ep, []
            with mock.patch.object(director.registry, "resolve", return_value=tmp), mock.patch.object(director, "load_provider", return_value=FakeLLM()), \
                    mock.patch.object(director, "refine", side_effect=fake_refine), mock.patch.object(director, "finish"):
                quiet(director.repair, "ep19-moon-change-shape", 2)
            self.assertEqual(seen["spent"], st["tokens_spent"])  # SAME token budget, not a fresh Budget
            self.assertEqual((seen["mech"], seen["maxm"]), (1, 2))
        finally:
            shutil.rmtree(tmp)


class R3PatchRepairs(unittest.TestCase):
    def test_scope_and_tokens_saved_on_ep17(self):
        ep17, items = fixture("ep17-crew13-reached-space")
        v = var_for("curious_adult", "cold-open-drama", space=True)
        problems = [i for i in director.check(ep17, {i["url"] for i in items}, items) if i[0] == "error"]
        scope = director.repair_scope(problems, ep17)
        self.assertTrue(scope, problems)
        self.assertTrue(set(scope) <= {s["id"] for s in ep17["scenes"]} and len(scope) < len(ep17["scenes"]))
        long_now = director.long_sentences(ep17, v["card"])
        whole_in = director.token_count(director.repair_prompt(ep17, problems, long_now, {}, v, items))
        whole_out = director.token_count(json.dumps(ep17, ensure_ascii=False))
        patch_in = director.token_count(director.patch_prompt(ep17, problems, scope, long_now, {}, v))
        patch_out = director.token_count(json.dumps([s for s in ep17["scenes"] if s["id"] in scope], ensure_ascii=False)) + 600
        sys.stderr.write(f"\n  ep17 mechanical repair, user prompt + expected output tokens: whole-episode {whole_in} + {whole_out} = {whole_in + whole_out}; "
                         f"patch {scope} {patch_in} + {patch_out} = {patch_in + patch_out} (output -{100 - 100 * patch_out // whole_out}%)\n")
        self.assertLess(patch_out, whole_out * 0.6)
        self.assertLess(patch_in + patch_out, (whole_in + whole_out) * 0.75)

    def test_global_errors_rewrite_whole(self):
        ep17, _ = fixture("ep17-crew13-reached-space")
        self.assertIsNone(director.repair_scope([("error", "analogy_misleads", "x")], ep17))
        self.assertIsNone(director.repair_scope([("error", "schema", "mechanism/0/step: bad")], ep17))
        self.assertEqual(director.repair_scope([("error", "schema", "scenes/2/intent: too long"), ("error", "term_after_picture", "s4: term")], ep17), ["s3", "s4"])
        self.assertEqual(director.repair_scope([("error", "dir_cold_open_narration", "cold open ['s1', 's2'] carries 18 words")], ep17), ["s1", "s2"])

    def test_merge_patch_by_id(self):
        ep = {"scenes": [scene("s1", "One."), scene("s2", "Two."), scene("s3", "Three.")], "direction": {"mode": "explainer"}}
        out, notes = director.merge_patch(ep, {"scenes": [scene("s2", "Two fixed."), scene("s3", "sneaky")], "direction": {"mode": "explainer", "lens": "lens-x"}}, ["s2"])
        self.assertEqual([s["narration"] for s in out["scenes"]], ["One.", "Two fixed.", "Three."])
        self.assertEqual(out["direction"]["lens"], "lens-x")
        self.assertTrue(any("out-of-scope" in n for n in notes))


class R3AnalogyPrecheck(unittest.TestCase):
    TOPIC = {"headline": "How Crew-13 reached the space station", "source_urls": ["https://en.wikipedia.org/wiki/Orbit_phasing"]}
    ITEMS = [{"title": "Orbit phasing", "url": "https://en.wikipedia.org/wiki/Orbit_phasing", "source": "Wikipedia", "forced": True}]
    WRONG = {"domain": "transport", "picture": "two lanes", "limitation": "cars have engines",
             "mapping": [{"real": "higher orbit", "analogy": "outer lane car pulls ahead", "analogy_predicts": "higher = gets ahead",
                          "real_behaviour": "a higher orbit is slower: you fall behind", "ok": False},
                         {"real": "station", "analogy": "car ahead", "analogy_predicts": "x", "real_behaviour": "x", "ok": True}]}
    RIGHT = {"domain": "running track", "picture": "inner lane runner", "limitation": "runners choose speed; orbits do not",
             "mapping": [{"real": "lower orbit", "analogy": "inner lane", "analogy_predicts": "shorter lap, catches up", "real_behaviour": "faster, closes the gap", "ok": True},
                         {"real": "raise orbit at the end", "analogy": "step out to the outer lane", "analogy_predicts": "match the leader", "real_behaviour": "match the station", "ok": True}]}

    def run_pc(self, cands):
        llm = FakeLLM([{"mechanism": [{"step": "launch lower and behind", "source": "S1", "quote": "lower orbit ... faster"}], "candidates": cands}])
        with mock.patch("adapters.news_rss.read_article", return_value="orbit phasing lower orbit faster catch up " * 50):
            res, _ = quiet(director.analogy_precheck, llm, self.TOPIC, self.ITEMS, var_for("curious_adult", "explainer"))
        return res, llm

    def test_wrong_mapping_forces_another_analogy(self):
        res, llm = self.run_pc([self.WRONG, self.RIGHT])
        self.assertEqual(res["analogy"]["domain"], "running track")
        block = director.precheck_block(res)
        self.assertIn("USE THIS ANALOGY (running track", block)
        self.assertIn("REJECTED (transport", block)
        self.assertIn("a higher orbit is slower", block)
        self.assertIn("[S1]", llm.calls[0]["prompt"])
        self.assertLess(director.token_count(llm.calls[0]["prompt"]), 3000)  # one short call

    def test_no_candidate_passes_means_literal(self):
        res, _ = self.run_pc([self.WRONG])
        self.assertIsNone(res["analogy"])
        self.assertIn("explain the mechanism literally", director.precheck_block(res))

    def test_flag_skips_and_block_reaches_writer(self):
        director.check_args(["--topic", "x", "--no-analogy-check"])
        v = var_for("curious_adult", "explainer", precheck={"mechanism": [], "analogy": self.RIGHT, "rejected": [self.WRONG]})
        llm = FakeLLM([{"title": "t"}])
        quiet(director.write_episode, llm, {**self.TOPIC, "angle": "", "why_now": "", "audience_misconception": ""}, self.ITEMS, v, "ep99-x", [])
        self.assertIn("USE THIS ANALOGY", llm.calls[0]["prompt"])


class R3HonestyAndColdOpen(unittest.TestCase):
    def test_skills_honesty_is_a_repair_target_and_strip(self):
        self.assertIn("director_skills_honest", director.FIX_WARNINGS)
        self.assertIn("removing is acceptable", director.REPAIR_RULES)
        ep = {"direction": {"skills_used": ["cont-identity-string", "mode-selection"]}}
        out = quiet(director._strip_unmet_skills, ep, [("warn", "director_skills_honest", "skills_used claims cont-identity-string but ...")])[0]
        self.assertEqual(out["direction"]["skills_used"], ["mode-selection"])

    def test_required_block_and_example_match_the_lint_rule(self):
        rb = director.required_block(var_for("curious_adult", "cold-open-drama"), brain.style_envelope("curious_adult"))
        self.assertIn("at most ONE short in-scene line, <= 12 words", rb)
        self.assertIn("never '...'", rb)
        ex = director.EXAMPLE_COLD_OPEN
        sids = ex["direction"]["cold_open"]["scene_ids"]
        words = sum(len(s["narration"].split()) for s in ex["scenes"] if s["id"] in sids)
        self.assertLessEqual(words, 12)
        self.assertFalse([s for s in ex["scenes"] if director.PLACEHOLDER.match(s["narration"])])


if __name__ == "__main__":
    unittest.main()


class FetchGuard(unittest.TestCase):
    """Code review 2026-10-05: page fetchers must refuse non-public targets and cap body size."""

    def test_blocks_internal_and_bad_schemes(self):
        from adapters import news_rss
        for u in ("http://127.0.0.1/x", "http://169.254.169.254/latest/meta-data/", "http://10.1.2.3/", "http://localhost/a", "file:///etc/passwd", "ftp://example.com/x"):
            with self.assertRaises(ValueError, msg=u):
                news_rss._check_url(u)
        self.assertEqual(news_rss.read_article("http://127.0.0.1:1/x"), "")  # swallowed: no evidence, never a fetch

    def test_redirect_to_internal_is_blocked_and_body_is_capped(self):
        from adapters import news_rss
        redir = mock.Mock(is_redirect=True, status_code=302, headers={"Location": "http://169.254.169.254/x"})
        with mock.patch("adapters.news_rss.requests.get", return_value=redir), mock.patch("adapters.news_rss._check_url", side_effect=[None, ValueError("blocked")]):
            with self.assertRaises(ValueError):
                news_rss._get("https://example.com/start")
        big = mock.Mock(ok=True, is_redirect=False, status_code=200, encoding="utf-8")
        big.raw.read.return_value = b"x" * 10
        with mock.patch("adapters.news_rss.requests.get", return_value=big), mock.patch("adapters.news_rss._check_url"):
            news_rss._get("https://example.com/")
        big.raw.read.assert_called_once_with(news_rss.MAX_BODY, decode_content=True)

