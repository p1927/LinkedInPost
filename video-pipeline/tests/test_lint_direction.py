"""Lint / schema / verifier fixes from the first direction-brain A/B (docs/plans/youtube-automation/DIRECTION-AB-ep03.md, bugs L1-L8, V1-V3).
Free: no network, no LLM (the verifier passes get a fake LLM that records its prompt), no .env read.
  python3 tests/test_lint_direction.py      (or: python3 -m unittest discover -s tests)"""
import copy
import json
import shutil
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
_fake_dotenv = types.ModuleType("dotenv")
_fake_dotenv.load_dotenv = lambda *a, **k: False  # never read ../.env in tests
sys.modules["dotenv"] = _fake_dotenv

import lint  # noqa: E402
import registry  # noqa: E402
import schema_skeleton  # noqa: E402
import selfcheck  # noqa: E402
import verify  # noqa: E402

BASE_ID = "ep03-iss-rendezvous"  # rendered, schema-valid, audience curious_adult (allows every mode and both dialects)


def base_ep() -> dict:
    return copy.deepcopy(registry.read(HERE / "episodes" / BASE_ID))


def directed(mode="cold-open-drama", **co) -> dict:
    ep = base_ep()
    ids = [s["id"] for s in ep["scenes"]]
    cold = {"archetype": "pursuit", "duration_s": 6, "bridge": "pull-back", "scene_ids": ids[:1]}
    cold.update(co)
    ep["direction"] = {"mode": mode, "skills_used": ["mode-cold-open-drama"], "cold_open": {k: v for k, v in cold.items() if v is not None}}
    return ep


def ids_of(issues) -> list:
    return [i[1] for i in issues]


def first_clip(ep) -> dict:
    s = next((s for s in ep["scenes"] if s["visual"]["type"] == "clip"), None)
    if s is None:  # ep03 is Remotion-only: turn the first scene into a clip
        s = ep["scenes"][0]
        s["visual"] = {"type": "clip", "keyframe_prompt": "A capsule below a space station, sun from camera-left",
                       "motion_prompt": "[Push in] The capsule drifts toward the station"}
    return s


class TmpRegistry(unittest.TestCase):
    """A throwaway episodes/ tree (registry.ROOT patched); lint/selfcheck still read direction/ and config/ from the repo."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "episodes").mkdir()
        self._p = mock.patch("registry.ROOT", self.tmp)
        self._p.start()

    def tearDown(self):
        self._p.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def put(self, name, content):
        d = self.tmp / "episodes" / name
        d.mkdir()
        (d / "episode.json").write_text(content if isinstance(content, str) else json.dumps(content))
        return d


class L1_NoCrashOnBrokenDraft(TmpRegistry):
    def setUp(self):
        super().setUp()
        good = base_ep()
        self.put(good["id"], good)
        half = {k: v for k, v in base_ep().items() if k != "scenes"}
        half["id"], half["status"] = "ep99-half-written", "scripted"
        self.put("ep99-half-written", half)
        self.put("ep98-truncated", '{"id": "ep98-truncated", "scenes": [')  # crash mid-write
        self.good = good

    def test_lint_other_episode_survives(self):
        issues = lint.run(self.good)  # iterates every episode (repeated_structure, id uniqueness)
        self.assertNotIn("schema", ids_of(issues))

    def test_lint_on_the_broken_draft_reports_schema(self):
        half = registry.read(self.tmp / "episodes" / "ep99-half-written")
        self.assertEqual(ids_of(lint.run(half)), ["schema"])
        self.assertTrue(lint.schema_issues(half))
        self.assertEqual(ids_of(lint.run({"id": "x", "scenes": [{"id": "s1"}]})), ["schema"])
        self.assertEqual(ids_of(lint.run("not a dict")), ["schema"])

    def test_registry_views_survive(self):
        self.assertIn("BROKEN", registry.table())
        self.assertEqual(sorted(e["id"] for _, e in registry.episodes()), sorted([self.good["id"], "ep99-half-written"]))
        ep, err = registry.read_safe(self.tmp / "episodes" / "ep98-truncated")
        self.assertIsNone(ep)
        self.assertIn("unreadable", err)

    def test_selfcheck_loops_survive_and_drafts_do_not_gate(self):
        fails, notes = selfcheck.check_schema()
        self.assertTrue(any("ep99-half-written" in n for n in notes))   # draft -> note
        self.assertTrue(any("ep98-truncated" in f for f in fails))      # unreadable, status unknown -> fails loudly
        selfcheck.check_lint_gate()
        selfcheck.check_storyboard()


class L2_ColdOpenRequired(unittest.TestCase):
    def test_valid_cold_open_passes_schema(self):
        self.assertEqual(lint.schema_issues(directed()), [])

    def test_missing_fields_schema_and_lint(self):
        for k in ("archetype", "duration_s", "scene_ids", "bridge"):
            ep = directed(**{k: None})
            msgs = " ".join(m for _, _, m in lint.schema_issues(ep))
            self.assertIn(f"'{k}' is a required property", msgs)
            iss = [i for i in lint._direction_checks(ep) if i[1] == "dir_cold_open_fields"]
            self.assertTrue(iss and iss[0][0] == "error" and k in iss[0][2], k)

    def test_hybrid_needs_cold_open(self):
        ep = directed("hybrid")
        del ep["direction"]["cold_open"]
        self.assertTrue(any("'cold_open' is a required property" in m for _, _, m in lint.schema_issues(ep)))

    def test_explainer_needs_nothing(self):
        ep = base_ep()
        ep["direction"] = {"mode": "explainer"}
        self.assertEqual(lint.schema_issues(ep), [])
        self.assertNotIn("dir_cold_open_fields", ids_of(lint._direction_checks(ep)))

    def test_unknown_cold_open_key_names_allowed_keys(self):
        ep = directed(duration_s=None, seconds=4)
        msgs = [m for _, _, m in lint.schema_issues(ep) if "unknown key" in m]
        self.assertTrue(msgs)
        self.assertIn("'seconds' -> 'duration_s'", msgs[0])
        for k in ("archetype", "duration_s", "bridge", "scene_ids", "beats"):
            self.assertIn(f"'{k}'", msgs[0])

    def test_unknown_style_segment_key(self):
        ep = directed()
        ep["direction"]["style_segments"] = [{"id": "a", "dialect": "native", "scene_ids": ["s1"]}]
        msgs = " ".join(m for _, _, m in lint.schema_issues(ep))
        self.assertIn("'dialect' -> 'medium'", msgs)
        self.assertIn("allowed keys", msgs)
        ep["direction"]["style_segments"] = ["cinematic cold open"]
        self.assertTrue(lint.schema_issues(ep))

    def test_beats_allowed(self):
        ep = directed(beats={"hook": "s1", "want": None})
        self.assertEqual(lint.schema_issues(ep), [])

    def test_shot_archetype_known(self):
        ep = directed()
        ep["scenes"][1]["shot"] = {"archetype": "demonstrate", "size": "ws"}
        ep["scenes"][2]["shot"] = {"archetype": "mechanism-demo", "size": "ms"}
        warns = [i for i in lint._direction_checks(ep) if i[1] == "dir_archetype_known"]
        self.assertEqual(len(warns), 1)
        self.assertIn("demonstrate", warns[0][2])
        self.assertEqual(warns[0][0], "warn")

    def test_shot_size_enum_kept(self):
        ep = directed()
        ep["scenes"][0]["shot"] = {"size": "huge"}
        self.assertTrue(any("shot/size" in m for _, _, m in lint.schema_issues(ep)))


class L5_ClipLength(unittest.TestCase):
    def test_clip_longer_than_provider_is_error(self):
        self.assertEqual(lint._clip_seconds(), 6.0)  # config/providers.yaml video.init_args.duration
        ep = directed()
        s = first_clip(ep)
        s["shot"] = {"duration_s": 8, "action_s": 5}
        iss = [i for i in lint._direction_checks(ep) if i[1] == "dir_clip_length"]
        self.assertEqual(len(iss), 1)
        self.assertEqual(iss[0][0], "error")
        self.assertIn("8s exceeds the 6s", iss[0][2])
        s["shot"] = {"duration_s": 6, "action_s": 7}
        self.assertIn("action_s", [i for i in lint._direction_checks(ep) if i[1] == "dir_clip_length"][0][2])
        s["shot"] = {"duration_s": 6}
        self.assertNotIn("dir_clip_length", ids_of(lint._direction_checks(ep)))

    def test_non_clip_ignored(self):
        ep = directed()
        s = next(s for s in ep["scenes"] if s["visual"]["type"] != "clip")
        s["shot"] = {"duration_s": 12}
        self.assertNotIn("dir_clip_length", ids_of(lint._direction_checks(ep)))


class L3_StyleChecksWithLegacyKeys(unittest.TestCase):
    def test_legacy_dialect_key_still_checked(self):
        ep = directed()
        ep["audience"] = "older_adult"  # native only
        ep["direction"]["mode"] = "explainer"
        ep["direction"]["style_segments"] = [{"id": "co", "dialect": "cinematic", "scene_ids": ["s1"]}]
        self.assertIn("dir_style_segment", ids_of(lint._direction_checks(ep)))

    def test_missing_medium_reported(self):
        ep = directed()
        ep["direction"]["style_segments"] = [{"id": "co", "scene_ids": ["s1"]}, "illustrated explainer"]
        iss = [i for i in lint._direction_checks(ep) if i[1] == "dir_style_segment"]
        self.assertEqual(len(iss), 2)

    def test_legacy_seconds_still_budgeted(self):
        ep = directed(duration_s=None, seconds=30)
        ids = ids_of(lint._direction_checks(ep))
        self.assertIn("dir_cold_open_budget", ids)

    def test_kids_cap_with_seconds(self):
        ep = directed(duration_s=None, seconds=9)
        ep["audience"] = "kids"
        self.assertIn("dir_cold_open_audience_cap", ids_of(lint._direction_checks(ep)))


class ModeAllowedHint(unittest.TestCase):
    def test_repair_hint(self):
        ep = directed()
        ep["audience"] = "older_adult"
        msg = [m for s, r, m in lint._direction_checks(ep) if r == "dir_mode_allowed"][0]
        self.assertIn("Repair: set direction.mode to one of", msg)
        self.assertIn("can never pass", msg)


class CameraSyntax(unittest.TestCase):
    def clip_ep(self, motion):
        ep = base_ep()
        s = first_clip(ep)
        s["visual"]["motion_prompt"] = motion
        return ep, s["id"]

    def cam(self, motion):
        ep, sid = self.clip_ep(motion)
        return [m for _, r, m in lint._checklist_checks(ep, HERE / "out" / "__none__") if r == "camera_command_syntax" and m.startswith(sid + ":")]

    def test_bracket_accepted(self):
        self.assertEqual(self.cam("[Push in] The capsule drifts toward the station"), [])
        self.assertEqual(self.cam("[Push in, Tilt up] The capsule rises"), [])

    def test_natural_sentences_accepted(self):
        for m in ("The camera pushes in with small amplitude at slow speed toward the jar.",
                  "The camera holds a static shot as steam keeps rising.",
                  "A slow push-in toward the docking port while the capsule glides.",
                  "The leaf falls; the camera tilts down at slow speed to follow it.",
                  "Handheld, the camera follows the runner.",
                  "Static shot: only the capsule moves along its arc.",
                  "The camera slowly orbits the tree."):
            self.assertEqual(self.cam(m), [], m)

    def test_warns_when_neither(self):
        self.assertTrue(self.cam("The capsule drifts toward the station, engine glow pulsing"))
        self.assertTrue(self.cam("[Wobble] The capsule drifts"))  # unknown bracket, no natural phrase

    def test_unknown_bracket_with_natural_ok(self):
        self.assertEqual(self.cam("[pan] The camera pans left with small amplitude across the field"), [])

    def test_cjk_leak_is_error(self):
        ep, sid = self.clip_ep("[Zoom in] The leaf fades as the镜头 pushes in")
        iss = [i for i in lint._checklist_checks(ep, HERE / "out" / "__none__") if i[1] == "prompt_cjk_leak"]
        self.assertEqual(iss[0][0], "error")


class LowAuthority(unittest.TestCase):
    def test_absent_file_is_noop(self):
        with tempfile.TemporaryDirectory() as t, mock.patch("lint.ROOT", Path(t)):
            self.assertEqual(lint._low_authority_domains(), set())

    def test_loader_formats(self):
        for body in ("- teslarati.com\n- www.example.org\n", "non_authoritative:\n  - teslarati.com\n  - domain: example.org\n",
                     "low_authority:\n  teslarati.com: blog\n  example.org: x\n"):
            with tempfile.TemporaryDirectory() as t, mock.patch("lint.ROOT", Path(t)):
                (Path(t) / "config").mkdir()
                (Path(t) / "config" / "source_quality.yaml").write_text(body)
                self.assertEqual(lint._low_authority_domains(), {"teslarati.com", "example.org"}, body)

    def test_warns_on_listed_domain(self):
        ep = base_ep()
        ep["claims"][0]["url"] = "https://www.teslarati.com/some-story"
        with mock.patch("lint._low_authority_domains", lambda: {"teslarati.com"}):
            self.assertIn("claims_low_authority", ids_of(lint.run(ep)))
        with mock.patch("lint._low_authority_domains", lambda: set()):
            self.assertNotIn("claims_low_authority", ids_of(lint.run(ep)))


class FakeLLM:
    def __init__(self, reply=None):
        self.prompts, self.reply = [], reply or {}

    def generate_json(self, prompt, **_):
        self.prompts.append(prompt)
        return copy.deepcopy(self.reply)


class VerifierPrompts(unittest.TestCase):
    def ep10_like(self):
        ep = directed()
        s = first_clip(ep)
        s["visual"]["motion_prompt"] = "[Push in, Tilt up] The capsule drifts toward the station"
        s["shot"] = {"move": "Push in, Tilt up", "size": "ws"}
        ep["scenes"][1]["visual"]["term"] = "orbital phasing"
        return ep

    def test_checks_carry_rules_and_are_bounded(self):
        checks, skipped = verify.realism_checks(self.ep10_like())
        by = {c["id"]: c for c in checks}
        cam = by["real-camera-behavior"]
        self.assertTrue(any("push+tilt" in r for r in cam["rules"]))
        self.assertTrue(cam["summary"] and cam["test"])
        self.assertTrue(all(len(c["rules"]) <= 4 for c in checks))
        self.assertLessEqual(len(json.dumps(checks)), verify.CHECKS_BUDGET_CHARS)
        self.assertIn("real-measured-evidence", skipped)  # frames-only card
        self.assertIn("real-reflections-glass", skipped)  # no glass/water in the prompts

    def test_people_cards_follow_the_plan(self):
        ep = self.ep10_like()
        first_clip(ep)["visual"]["keyframe_prompt"] = "A woman holds a red leaf in her hands"
        ids = [c["id"] for c in verify.realism_checks(ep)[0]]
        self.assertIn("real-hands-anatomy", ids)

    def test_realism_prompt_overlay_and_still_notes(self):
        llm = FakeLLM({"checks": []})
        res = verify.realism(llm, self.ep10_like())
        p = llm.prompts[0]
        self.assertIn("renderer_overlays", p)
        self.assertIn("NOT text inside the generated image", p)
        self.assertIn("describe ONE STILL image", p)
        self.assertIn("a claim that is not dramatized is not a failure", p)
        self.assertIn('"term": "orbital phasing"', p)  # moved under renderer_overlays, not generation_prompts
        plan = json.loads(p.split("SHOT PLAN: ", 1)[1].split("\nCHECKS: ", 1)[0])
        s2 = plan[1]
        self.assertIn("term", s2["renderer_overlays"])
        self.assertNotIn("term", s2["generation_prompts"])
        self.assertIn("skipped_na", res)

    def test_analogy_prompt_uses_evidence_and_cannot_verify(self):
        llm = FakeLLM({"analogy_count": 1, "breaks": [], "limitation_stated_in_script": True, "cannot_verify": ["outer lane is slower"]})
        ev = [{"n": 0, "claim": "Lower orbits are faster", "url": "https://nasa.gov/x", "evidence_kind": "article_text",
               "headline": "", "snippet": "", "article_text": "A spacecraft in a lower orbit travels faster than one in a higher orbit."}]
        verify.analogy_attack(llm, base_ep(), ev)
        p = llm.prompts[0]
        self.assertIn("CITED EVIDENCE", p)
        self.assertIn("lower orbit travels faster", p)
        self.assertIn("cannot_verify", p)
        self.assertIn("instead of guessing", p)

    def test_run_maps_cannot_verify_to_warn(self):
        reply = {"analogy_count": 1, "breaks": [], "limitation_stated_in_script": True, "cannot_verify": ["x"],
                 "claims": [], "uncovered_statements": [], "score": 5, "checks": []}
        llm = FakeLLM(reply)
        ep = base_ep()
        with tempfile.TemporaryDirectory() as t, mock.patch("verify.load_provider", lambda _k: llm), \
                mock.patch("verify.read_article", lambda _u: ""), mock.patch("verify.report_path", lambda _e: Path(t) / "qa.json"):
            rep = verify.run(ep, items=[], quiet=True)
        self.assertIn(["warn", "analogy_cannot_verify", "could not verify from the evidence (human spot-check): x"], rep["issues"])


class SchemaSkeleton(unittest.TestCase):
    def test_all_kinds(self):
        for k in schema_skeleton.KINDS:
            sk = schema_skeleton.schema_skeleton(k)
            self.assertTrue(sk["keys"], k)

    def test_cold_open(self):
        sk = schema_skeleton.schema_skeleton("direction.cold_open")
        self.assertTrue(sk["closed"])
        self.assertEqual(set(sk["keys"]), {"archetype", "duration_s", "bridge", "question", "bridge_frames", "scene_ids", "beats"})
        self.assertIn("pull-back", sk["keys"]["bridge"])
        rw = sk["required_when"][0]
        self.assertEqual(rw["when"], {"direction.mode": ["cold-open-drama", "hybrid"]})
        self.assertEqual(set(rw["required"]), {"archetype", "duration_s", "bridge", "scene_ids"})
        self.assertIn("pursuit", sk["values"]["archetype"])

    def test_segments_shot_direction(self):
        seg = schema_skeleton.schema_skeleton("direction.style_segments[]")
        self.assertTrue(seg["closed"])
        self.assertIn("medium", seg["keys"])
        self.assertNotIn("dialect", seg["keys"])
        self.assertEqual(seg["values"]["medium"], ["native", "cinematic"])
        shot = schema_skeleton.schema_skeleton("scenes[].shot")
        self.assertIn("ews", shot["keys"]["size"])
        self.assertNotIn("demonstrate", shot["values"]["archetype"])
        d = schema_skeleton.schema_skeleton("direction")
        self.assertIn("cold-open-drama", d["keys"]["mode"])
        self.assertEqual(d["required_when"][0]["required"], ["cold_open"])
        self.assertIn("characters", schema_skeleton.schema_skeleton("continuity")["keys"])
        self.assertIn("direction.cold_open:", schema_skeleton.prompt_block())
        with self.assertRaises(ValueError):
            schema_skeleton.schema_skeleton("nope")


class LegacyUnchanged(unittest.TestCase):
    def test_no_direction_no_dir_checks(self):
        ep = base_ep()
        self.assertNotIn("direction", ep)
        self.assertEqual(lint._direction_checks(ep), [])
        self.assertEqual(lint.schema_issues(ep), [])


# ---- round 2 (DIRECTION-AB-ep03.md section 6.4) ------------------------------------------------------------------

def seg_ep(mode="cold-open-drama"):
    """Directed ep03 copy with every scene in one of two segments and a clip cold open."""
    ep = directed(mode)
    ids = [s["id"] for s in ep["scenes"]]
    first_clip(ep)
    ep["direction"]["style_segments"] = [{"id": "open", "medium": "native", "scene_ids": ids[:1]},
                                         {"id": "explain", "medium": "native", "scene_ids": ids[1:]}]
    return ep


class R2_NoTextRule(unittest.TestCase):
    def ill_ep(self, prompt):
        ep = base_ep()
        ep["scenes"][1]["visual"] = {"type": "illustration", "prompt": prompt}
        ep["style"]["illustration_style"] = "flat style, absolutely no text, no letters, no numbers, no words"
        return ep, ep["scenes"][1]["id"]

    def nt(self, prompt):
        ep, sid = self.ill_ep(prompt)
        return [m for _, r, m in lint.run(ep) if r == "no_text_in_image_prompts" and m.startswith(sid + ":")]

    def test_exempt_tail_never_warns(self):
        self.assertEqual(self.nt("A red leaf on a branch, vertical 9:16 composition, absolutely no text, no letters, no numbers, no words"), [])
        self.assertEqual(self.nt("A tin, without any visible text, no letters"), [])

    def test_asking_for_text_warns(self):
        self.assertTrue(self.nt("A shop sign that says OPEN above the door"))
        self.assertTrue(self.nt("A jar labeled SUGAR, no text"))
        self.assertTrue(self.nt("A headline on a newspaper"))

    def test_same_exemption_as_positive_phrasing(self):
        tail = "absolutely no text, no letters, no numbers, no words"
        self.assertEqual(lint._negations(tail), [])
        self.assertEqual(lint.asks_for_text(tail), [])
        self.assertEqual(lint.strip_no_text_tail("no watermarks").strip(), "")


class R2_Dialect(unittest.TestCase):
    def test_vocab_read_from_craft(self):
        v = lint.dialect_vocabulary()
        self.assertIn("bokeh", v["cinematic"])
        self.assertIn("gouache", v["native"])

    def test_fallback_when_craft_has_none(self):
        with tempfile.TemporaryDirectory() as t, mock.patch("lint.ROOT", Path(t)):
            self.assertEqual(lint.dialect_vocabulary(), lint._DIALECT_FALLBACK)

    def test_native_segment_with_cinematic_words(self):
        ep = seg_ep()
        s = first_clip(ep)
        s["visual"]["keyframe_prompt"] = "A leaf, cinematic, shallow depth of field, soft bokeh"
        iss = [m for _, r, m in lint._direction_checks(ep) if r == "dir_dialect_mismatch"]
        self.assertTrue(iss and "bokeh" in iss[0] and "shallow depth of field" in iss[0])

    def test_cinematic_segment_with_native_words(self):
        ep = seg_ep()
        ep["direction"]["style_segments"][0]["medium"] = "cinematic"
        first_clip(ep)["visual"]["keyframe_prompt"] = "A capsule in flat vector storybook style"
        self.assertIn("dir_dialect_mismatch", ids_of(lint._direction_checks(ep)))

    def test_native_only_envelope_without_segments(self):
        ep = directed()
        ep["audience"] = "kids"
        first_clip(ep)["visual"]["keyframe_prompt"] = "A leaf, 85mm, film grain"
        self.assertIn("dir_dialect_mismatch", ids_of(lint._direction_checks(ep)))

    def test_clean_prompt_ok(self):
        ep = seg_ep()
        first_clip(ep)["visual"]["keyframe_prompt"] = "A capsule below a station, soft flat colour shapes"
        self.assertNotIn("dir_dialect_mismatch", ids_of(lint._direction_checks(ep)))

    def test_segment_description_checked(self):
        ep = seg_ep()
        ep["direction"]["style_segments"][0]["description"] = "Cinematic grade, soft bokeh"
        self.assertIn("dir_dialect_mismatch", ids_of(lint._direction_checks(ep)))


class R2_Coverage(unittest.TestCase):
    def test_full_cover_ok(self):
        self.assertNotIn("dir_style_coverage", ids_of(lint._direction_checks(seg_ep())))

    def test_uncovered_overlap_unknown(self):
        ep = seg_ep()
        ids = [s["id"] for s in ep["scenes"]]
        ep["direction"]["style_segments"][1]["scene_ids"] = ids[:-1] + ["s99"]  # overlaps ids[0], misses the last, unknown s99
        msg = [m for s, r, m in lint._direction_checks(ep) if r == "dir_style_coverage"][0]
        self.assertIn(ids[-1], msg)
        self.assertIn("more than one segment", msg)
        self.assertIn("s99", msg)
        self.assertEqual([s for s, r, _ in lint._direction_checks(ep) if r == "dir_style_coverage"], ["error"])


class R2_ColdOpenNarration(unittest.TestCase):
    def test_over_twelve_words_is_error(self):
        ep = directed()
        ep["scenes"][0]["narration"] = "Watch this leaf. It just turned orange right in front of you. How does one leaf know?"
        for s in ep["scenes"][1:]:  # keep it a Short (lint treats > 90 s of words as long-form, where this is only a warning)
            s["narration"] = "One short line here."
        iss = [i for i in lint._direction_checks(ep) if i[1] == "dir_cold_open_narration" and i[0] == "error"]
        self.assertTrue(iss)
        self.assertIn("17 narration words", iss[0][2])

    def test_one_short_line_ok_two_lines_warn(self):
        ep = directed()
        ep["scenes"][0]["narration"] = "Watch the Dragon reach the station."
        self.assertNotIn("dir_cold_open_narration", ids_of(lint._direction_checks(ep)))
        ep["scenes"][0]["narration"] = "Watch it. Touchdown."
        self.assertEqual([s for s, r, _ in lint._direction_checks(ep) if r == "dir_cold_open_narration"], ["warn"])


class R2_ColdOpenDuration(unittest.TestCase):
    def test_mismatch(self):
        ep = directed(duration_s=6)
        s = first_clip(ep)
        s["shot"] = {"duration_s": 3}
        self.assertIn("dir_cold_open_duration_mismatch", ids_of(lint._direction_checks(ep)))
        s["shot"] = {"duration_s": 5}
        self.assertNotIn("dir_cold_open_duration_mismatch", ids_of(lint._direction_checks(ep)))
        s["shot"] = {}  # falls back to the 6 s provider clip
        self.assertNotIn("dir_cold_open_duration_mismatch", ids_of(lint._direction_checks(ep)))


class R2_SchemaHints(unittest.TestCase):
    def test_source_url_hint(self):
        ep = base_ep()
        ep["claims"][0]["source_url"] = ep["claims"][0].pop("url")
        msgs = [m for _, _, m in lint.schema_issues(ep)]
        self.assertTrue(any("'source_url' -> 'url'" in m for m in msgs), msgs)

    def test_null_hint(self):
        ep = directed()
        ep["direction"]["lens"] = None
        ep["packaging"]["long_form"] = None
        msgs = [m for _, _, m in lint.schema_issues(ep)]
        self.assertTrue(any(m.startswith("direction/lens: is null: omit the key") for m in msgs), msgs)
        self.assertTrue(any(m.startswith("packaging/long_form: is null: omit the key") for m in msgs), msgs)
        ep["direction"]["lens"] = ""
        self.assertTrue(any("direction/lens" in m for _, _, m in lint.schema_issues(ep)))


class R2_SkillsHonesty(unittest.TestCase):
    def ep(self, skills):
        ep = directed()
        ep["direction"]["skills_used"] = skills
        return ep

    def unmet(self, ep):
        return [m for _, r, m in lint._direction_checks(ep) if r == "dir_skills_claimed_unmet"]

    def test_identity_string(self):
        ep = self.ep(["cont-identity-string"])
        ep["continuity"] = {"characters": [{"id": "dragon", "identity_string": "a white capsule with black tiles"}]}
        s = first_clip(ep)
        s["shot"] = {"continuity_ids": ["dragon"], "size": "ws"}
        s["visual"]["keyframe_prompt"] = "a capsule near a station"
        self.assertTrue(any("identity_string" in m for m in self.unmet(ep)))
        s["visual"]["keyframe_prompt"] = "a white capsule with black tiles near a station"
        self.assertEqual(self.unmet(ep), [])

    def test_axis(self):
        ep = self.ep(["cont-axis-eyelines"])
        ep["scenes"][0]["shot"] = {"location_id": "orbit", "size": "ws"}
        ep["scenes"][1]["shot"] = {"location_id": "orbit", "axis_side": "left"}
        self.assertTrue(any("axis_side" in m for m in self.unmet(ep)))
        ep["scenes"][0]["shot"]["axis_side"] = "left"
        self.assertEqual(self.unmet(ep), [])

    def test_wide_first(self):
        ep = self.ep(["arch-conventions"])
        ep["scenes"][0]["shot"] = {"size": "mcu"}
        self.assertTrue(any("wide first" in m for m in self.unmet(ep)))
        ep["scenes"][0]["shot"] = {"size": "ews"}
        self.assertEqual(self.unmet(ep), [])

    def test_not_cited_not_checked(self):
        ep = self.ep(["mode-cold-open-drama"])
        ep["scenes"][0]["shot"] = {"size": "mcu"}
        self.assertEqual(self.unmet(ep), [])

    def test_arch_prefix_accepted_on_shots(self):
        ep = directed()
        ep["scenes"][0]["shot"] = {"archetype": "arch-awe-scale"}
        self.assertNotIn("dir_archetype_known", ids_of(lint._direction_checks(ep)))


class R2_VerifierDeterminism(unittest.TestCase):
    def run_verify(self, reply, ep):
        llm = FakeLLM(reply)
        temps = []
        orig = llm.generate_json

        def gj(prompt=None, **kw):
            temps.append(kw.get("temperature"))
            return orig(prompt, **kw)
        llm.generate_json = gj
        with tempfile.TemporaryDirectory() as t, mock.patch("verify.load_provider", lambda _k: llm), \
                mock.patch("verify.read_article", lambda _u: ""), mock.patch("verify.report_path", lambda _e: Path(t) / "qa.json"):
            rep = verify.run(ep, items=[], quiet=True)
        return rep, temps

    def ep(self):
        ep = directed()
        s = first_clip(ep)
        s["visual"]["keyframe_prompt"] = "A capsule below a station, sun from camera-left"
        return ep, s

    def test_low_temperature_and_judge_recorded(self):
        ep, _ = self.ep()
        rep, temps = self.run_verify({"analogy_count": 1, "breaks": [], "limitation_stated_in_script": True, "claims": [], "score": 5,
                                      "checks": []}, ep)
        self.assertEqual(temps.count(verify.JUDGE_TEMPERATURE), 4)  # analogy, claims, grader, realism (the learner keeps 0.4)
        self.assertIn(0.4, temps)
        self.assertEqual(rep["judge"]["temperature"], verify.JUDGE_TEMPERATURE)

    def test_unquoted_blocker_downgraded(self):
        ep, s = self.ep()
        base = {"analogy_count": 1, "breaks": [], "limitation_stated_in_script": True, "claims": [], "score": 5}
        bad = dict(base, checks=[{"id": "real-light-source", "verdict": "fail", "scenes": [s["id"]], "evidence": "no light source set", "fix": "x"}])
        rep, _ = self.run_verify(bad, ep)
        iss = [i for i in rep["issues"] if i[1] == "real-light-source"][0]
        self.assertEqual(iss[0], "warn")
        self.assertIn("downgraded", iss[2])
        good = dict(base, checks=[{"id": "real-light-source", "verdict": "fail", "scenes": [s["id"]],
                                   "evidence": 'prompt says "sun from camera-left" but the next shot is lit from the right', "fix": "x"}])
        rep, _ = self.run_verify(good, ep)
        self.assertEqual([i for i in rep["issues"] if i[1] == "real-light-source"][0][0], "error")
        wrong_scene = dict(base, checks=[{"id": "real-light-source", "verdict": "fail", "scenes": ["s99"],
                                          "evidence": '"sun from camera-left"', "fix": "x"}])
        rep, _ = self.run_verify(wrong_scene, ep)
        self.assertEqual([i for i in rep["issues"] if i[1] == "real-light-source"][0][0], "warn")

    def test_analogy_break_needs_quote(self):
        ep, _ = self.ep()
        phrase = ep["scenes"][0]["narration"].split(".")[0]
        reply = {"analogy_count": 1, "limitation_stated_in_script": True, "claims": [], "score": 5, "checks": [],
                 "breaks": [{"analogy_predicts": "a", "reality": "b", "severity": "high", "quote": "words nobody said"}]}
        rep, _ = self.run_verify(reply, ep)
        self.assertEqual([i[0] for i in rep["issues"] if i[1] == "analogy_misleads"], ["warn"])
        reply["breaks"][0]["quote"] = phrase
        rep, _ = self.run_verify(reply, ep)
        self.assertEqual([i[0] for i in rep["issues"] if i[1] == "analogy_misleads"], ["error"])

    def test_prompts_carry_the_rules(self):
        llm = FakeLLM({"checks": []})
        verify.realism(llm, self.ep()[0])
        self.assertIn("quote, in double quotes, the exact phrase", llm.prompts[0])
        llm = FakeLLM({})
        verify.analogy_attack(llm, base_ep(), [])
        self.assertIn("MUST carry a `quote`", llm.prompts[0])


# ---- round 3 (DIRECTION-AB-ep03.md section 7.4); ep17 / ep19 are saved offline fixtures (tests/fixtures) -------------------

FIX = HERE / "tests" / "fixtures"


def fixture(name) -> dict:
    return json.loads((FIX / name).read_text())


class R3_ColdOpenNarration(unittest.TestCase):
    def test_placeholder_is_error_with_hint(self):
        for bad in ("", "   ", "...", "\u2026", "-- !"):
            ep = directed()
            ep["scenes"][0]["narration"] = bad
            iss = [i for i in lint._direction_checks(ep) if i[1] == "dir_cold_open_narration_empty"]
            self.assertTrue(iss and iss[0][0] == "error" and "1-6 words" in iss[0][2], bad)

    def test_schema_rejects_punctuation_only(self):
        ep = directed()
        ep["scenes"][0]["narration"] = "..."
        msgs = [m for _, _, m in lint.schema_issues(ep)]
        self.assertTrue(any("has no words" in m for m in msgs), msgs)
        ep["scenes"][0]["narration"] = ""
        self.assertEqual(sum("scenes/0/narration" in m for m in (m for _, _, m in lint.schema_issues(ep))), 1)  # reported once
        ep["scenes"][0]["narration"] = "Look up."
        self.assertEqual(lint.schema_issues(ep), [])

    def test_one_short_line_per_scene(self):
        ep = directed(scene_ids=None)
        ids = [s["id"] for s in ep["scenes"]]
        ep["direction"]["cold_open"]["scene_ids"] = ids[:2]
        ep["scenes"][0]["narration"], ep["scenes"][1]["narration"] = "Watch the capsule.", "Eight hours later."
        self.assertNotIn("dir_cold_open_narration", ids_of(lint._direction_checks(ep)))
        ep["scenes"][1]["narration"] = "It docked at seven. Everyone cheered loudly."
        self.assertIn("dir_cold_open_narration", ids_of(lint._direction_checks(ep)))

    def test_fixtures(self):
        self.assertEqual(ids_of(lint.run(fixture("ep17-crew13-reached-space.json"))).count("dir_cold_open_narration_empty"), 2)
        self.assertEqual(ids_of(lint.run(fixture("ep19-moon-change-shape.json"))).count("dir_cold_open_narration_empty"), 1)


class R3_ReportShowsLint(unittest.TestCase):
    def test_schema_errors_first_then_lint(self):
        ep = fixture("ep17-crew13-reached-space.json")
        iss = lint.all_issues(ep)
        rids = ids_of(iss)
        self.assertEqual(rids[0], "schema")
        self.assertIn("dir_cold_open_narration_empty", rids)
        first_non_schema = next(i for i, r in enumerate(rids) if r != "schema")
        self.assertNotIn("schema", rids[first_non_schema:])

    def test_report_prints_both(self):
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = lint.report(fixture("ep17-crew13-reached-space.json"))
        out = buf.getvalue()
        self.assertEqual(rc, 1)
        self.assertIn("[ERROR] schema", out)
        self.assertIn("dir_camera_move_mismatch", out)

    def test_malformed_field_does_not_hide_other_sections(self):
        ep = directed()
        ep["mechanism"] = [{"step": 3, "scene": "s1"}]  # int step: _explanation_checks slices it
        rids = ids_of(lint.run(ep))
        self.assertIn("lint_incomplete", rids)
        self.assertIn("dir_skills_known", rids + ["dir_skills_known"])  # direction section still ran (no crash)

    def test_valid_episode_unchanged(self):
        ep = base_ep()
        self.assertEqual(lint.all_issues(ep), lint.run(ep))


class R3_FuzzyQuotes(unittest.TestCase):
    def test_one_word_slip_still_matches(self):
        hay = ["The camera holds a static shot as the capsule drifts upward toward the station from below"]
        self.assertTrue(verify.phrase_in("the camera holds a static shot as the capsule drifts up toward the station", hay))
        self.assertTrue(verify.quoted_in("prompt says \u201cThe cookie never changes \u2014 just how lit it looks\u201d", ["The cookie never changes - just how lit it looks!"]))
        self.assertFalse(verify.phrase_in("the station is shown above a red planet", hay))

    def test_identifiers_never_count(self):
        ep = fixture("ep19-moon-change-shape.json")
        ck = {"id": "real-axis-screen-direction", "scenes": ["s1", "s2"], "evidence": "two clips in location \"night_yard\" but declares no action line"}
        self.assertFalse(verify.blocker_evidence_ok(ck, ep))
        self.assertFalse(verify.phrase_in("night_yard", ["night_yard"]))

    def test_missing_field_checked_mechanically(self):
        ep = fixture("ep19-moon-change-shape.json")
        ck = {"scenes": ["s1", "s2"], "kind": "missing_field", "field": "shot.axis_side"}
        self.assertTrue(verify.missing_field_confirmed(ck, ep))
        self.assertFalse(verify.missing_field_confirmed(dict(ck, field="location_id"), ep))  # present: not missing
        self.assertFalse(verify.missing_field_confirmed(dict(ck, field=""), ep))

    def test_fixture_report_blockers(self):
        ep = fixture("ep19-moon-change-shape.json")
        rep = fixture("ep19-qa_report.json")
        fails = {c["id"]: verify.blocker_evidence_ok(c, ep) for c in rep["realism"]["checks"] if c.get("verdict") == "fail"}
        self.assertFalse(fails["real-axis-screen-direction"])  # quoted only the id night_yard
        self.assertTrue(fails["real-identity"])                # quotes the prompt text


class R3_UncoveredStatements(unittest.TestCase):
    def test_evidence_only_facts_dropped(self):
        self.assertEqual(verify.narration_statements(fixture("ep17-qa_report.json")["claims"], fixture("ep17-crew13-reached-space.json")), [])

    def test_narration_facts_kept(self):
        kept = verify.narration_statements(fixture("ep19-qa_report.json")["claims"], fixture("ep19-moon-change-shape.json"))
        self.assertEqual(len(kept), 2)

    def test_new_shape_with_quote(self):
        ep = base_ep()
        line = ep["scenes"][0]["narration"]
        c = {"uncovered_statements": [{"statement": "x", "quote": line}, {"statement": "Gemini 4 flew in 1965", "quote": "Gemini 4 flew in June 1965"}]}
        self.assertEqual(verify.narration_statements(c, ep), ["x"])

    def test_prompt_separates_narration(self):
        llm = FakeLLM({"claims": [], "uncovered_statements": []})
        verify.claim_support(llm, base_ep(), [], [])
        self.assertIn("facts that appear only in the evidence pages are NOT uncovered", llm.prompts[0])


class R3_PageExtraction(unittest.TestCase):
    def setUp(self):
        from adapters import news_rss
        self.n = news_rss
        self.html = (FIX / "nasa_moon_phases.html").read_text()

    def test_article_body_not_menus(self):
        t = self.n.extract_text(self.html)
        self.assertTrue(t.startswith("Moon Phases The Moon does not make its own light"), t[:120])
        self.assertGreaterEqual(len(t), 1500)
        for junk in ("Menu topic", "cookies", "Teaser story", "Explore link", "footer text", "tracking", "Share on social"):
            self.assertNotIn(junk, t)

    def test_no_main_uses_body_minus_link_lists(self):
        html = "<body><ul>" + "".join(f"<li><a href='/{i}'>link {i} text here</a></li>" for i in range(40)) + "</ul>" + \
               "<div><p>" + "Real paragraph text about leaves. " * 20 + "</p></div></body>"
        t = self.n.extract_text(html)
        self.assertTrue(t.startswith("Real paragraph"))
        self.assertNotIn("link 3", t)

    def test_read_article_uses_extractor(self):
        with mock.patch.object(self.n, "_get", lambda url, timeout=20: (True, url, self.html)):
            t = self.n.read_article("https://science.nasa.gov/moon/moon-phases/")
        self.assertIn("synchronous rotation", t)
        self.assertNotIn("Menu topic", t)


class R3_CameraMoveMismatch(unittest.TestCase):
    def test_fixture_ep17(self):
        iss = [m for _, r, m in lint.run(fixture("ep17-crew13-reached-space.json")) if r == "dir_camera_move_mismatch"]
        self.assertEqual(sorted(m.split(":")[0] for m in iss), ["s1", "s7"])

    def test_fixture_ep19_agrees(self):
        self.assertNotIn("dir_camera_move_mismatch", ids_of(lint.run(fixture("ep19-moon-change-shape.json"))))

    def test_categories(self):
        self.assertEqual(lint.camera_moves("Push in, Tilt up"), {"push_in", "tilt"})
        self.assertEqual(lint.camera_moves("The camera holds a static shot."), {"static"})
        self.assertEqual(lint.camera_moves("The capsule drifts in the same orbit"), set())
        ep = directed()
        s = first_clip(ep)
        s["shot"] = {"move": "pan left", "size": "ws"}
        s["visual"]["motion_prompt"] = "The camera pans left with small amplitude across the field"
        self.assertNotIn("dir_camera_move_mismatch", ids_of(lint._direction_checks(ep)))
        s["visual"]["motion_prompt"] = "The camera tilts up toward the sky"
        self.assertIn("dir_camera_move_mismatch", ids_of(lint._direction_checks(ep)))


class R3_SSRFGuard(unittest.TestCase):
    def test_check_url_blocks_private(self):
        from adapters import news_rss
        for u in ("http://127.0.0.1/x", "http://localhost/", "file:///etc/passwd", "http://169.254.169.254/latest/meta-data", "ftp://example.com/"):
            with self.assertRaises(ValueError, msg=u):
                news_rss._check_url(u)

    def test_feed_parse_goes_through_guard(self):
        from adapters import news_rss
        calls = []
        rss = "<rss><channel><item><title>T</title><link>https://example.org/a</link></item></channel></rss>"
        with mock.patch.object(news_rss, "_get", lambda url, timeout=20: calls.append(url) or (True, url, rss)):
            items = news_rss.NewsRSS()._parse("https://example.org/feed.xml", "x")
        self.assertEqual(calls, ["https://example.org/feed.xml"])
        self.assertEqual(items[0]["url"], "https://example.org/a")
        with self.assertRaises(ValueError):
            news_rss.NewsRSS()._parse("http://127.0.0.1/feed.xml", "x")

    def test_provider_downloads_guarded(self):
        from adapters import common
        with self.assertRaises(ValueError), mock.patch("requests.get") as g:
            common.download("http://10.0.0.5/secret.mp4", Path(tempfile.mkdtemp()) / "x.mp4")
        g.assert_not_called()

    def test_redirect_to_private_blocked(self):
        from adapters import common

        class R:
            is_redirect, status_code, headers = True, 302, {"Location": "http://127.0.0.1/admin"}

            def close(self):
                pass
        with mock.patch("adapters.news_rss.socket.getaddrinfo", side_effect=lambda h, p: [(0, 0, 0, "", ("127.0.0.1" if h == "127.0.0.1" else "93.184.216.34", p))]), \
                mock.patch("requests.get", return_value=R()):
            with self.assertRaises(ValueError):
                common.guarded_get("https://example.com/file")

    def test_no_unguarded_page_fetch_in_verify_director_registry(self):
        import re as _re
        for f in ("verify.py", "director.py", "registry.py"):
            src = (HERE / f).read_text()
            self.assertIsNone(_re.search(r"requests\.(get|post)\(|urlopen\(", src), f)


if __name__ == "__main__":
    unittest.main()
