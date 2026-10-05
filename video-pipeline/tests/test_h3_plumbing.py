"""H3 plumbing in run.py: last_frame, subject_reference, cost gate, cache keys. Free: adapters are mocked,
no network, no .env read (python-dotenv is stubbed before the pipeline is imported).
  python3 tests/test_h3_plumbing.py      (or: python3 -m unittest discover -s tests)"""
import contextlib
import io
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

import cache  # noqa: E402
import lint  # noqa: E402
import run  # noqa: E402
from adapters.image_minimax import MiniMaxImage  # noqa: E402
from adapters.video_minimax import MiniMaxVideo  # noqa: E402


class FakeImage:
    def __init__(self, supports=True):
        self.supports_subject_reference = supports
        self.calls = []

    def generate(self, prompt, out_path, aspect_ratio="9:16", seed=None, **kw):
        self.calls.append({"prompt": prompt, "out": Path(out_path), "seed": seed, **kw})
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_bytes(prompt.encode())  # content (and so file hash) follows the prompt
        return Path(out_path)


class FakeVideo:
    def __init__(self, supports=True):
        self.supports_last_frame = supports
        self.calls = []

    def generate(self, prompt, out_path, first_frame=None, **kw):
        self.calls.append({"prompt": prompt, "out": Path(out_path), "first_frame": first_frame, **kw})
        Path(out_path).write_bytes(b"mp4")
        return Path(out_path)


IMAGE_CFG = {"class_path": "fake.Image", "init_args": {"model": "image-01"}}


def video_cfg(**over):
    c = {"class_path": "fake.Video", "init_args": {"model": "MiniMax-H3", "duration": 6},
         "price_per_second": 0.08, "max_clip_cost_usd": 6.0}
    c.update(over)
    return c


def scene(sid, **visual):
    v = {"type": "clip", "motion_prompt": f"[Static shot] {sid} moves", "keyframe_prompt": f"still of {sid}"}
    v.update(visual)
    return {"id": sid, "beat": "story", "narration": "A short line here.", "visual": v}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.ep_dir = self.tmp / "episodes" / "epT"
        (self.ep_dir / "refs").mkdir(parents=True)
        (self.ep_dir / "refs" / "hero.png").write_bytes(b"hero-v1")
        self.out = self.tmp / "out" / "epT"
        for d in ("keyframes", "clips"):
            (self.out / d).mkdir(parents=True)
        self.img, self.vid = FakeImage(), FakeVideo()
        self.vcfg = video_cfg()
        cfgs = {"image": lambda: IMAGE_CFG, "video": lambda: self.vcfg}
        provs = {"image": lambda: self.img, "video": lambda: self.vid}
        for target, new in (("run.ROOT", self.tmp), ("run.provider_cfg", lambda k: cfgs[k]()),
                            ("run.load_provider", lambda k: provs[k]()), ("sys.argv", ["run.py"]),
                            ("run.FORCE_COST", False)):
            p = mock.patch(target, new)
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def ep(self, *scenes, **extra):
        return {"id": "epT", "_dir": str(self.ep_dir), "style": {"character": "", "look": ""},
                "scenes": list(scenes), **extra}

    def quiet(self, fn, *a):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            fn(*a)
        return buf.getvalue()


class LastFrame(Base):
    def test_last_frame_generated_and_passed(self):
        ep = self.ep(scene("s1", last_frame_prompt="still of s1, door now open"))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        outs = [c["out"].name for c in self.img.calls]
        self.assertEqual(outs, ["s1.png", "s1_last.png"])
        self.assertEqual(self.img.calls[1]["prompt"], "still of s1, door now open")
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertEqual(len(self.vid.calls), 1)
        self.assertEqual(self.vid.calls[0]["last_frame"], self.out / "keyframes" / "s1_last.png")
        self.assertEqual(self.vid.calls[0]["first_frame"], self.out / "keyframes" / "s1.png")

    def test_no_last_frame_prompt_sends_no_kwarg(self):
        ep = self.ep(scene("s1"))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertNotIn("last_frame", self.vid.calls[0])
        self.assertNotIn("subject_reference", self.img.calls[0])

    def test_unsupported_model_warns_and_skips(self):
        self.vid = FakeVideo(supports=False)
        self.vcfg = video_cfg(init_args={"model": "MiniMax-Hailuo-2.3", "duration": 6})
        ep = self.ep(scene("s1", last_frame_prompt="end still"))
        log = self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertIn("WARNING s1", log)
        self.assertIn("MiniMax-Hailuo-2.3", log)
        self.assertEqual([c["out"].name for c in self.img.calls], ["s1.png"])  # no paid end keyframe
        log = self.quiet(run.stage_clips, ep, self.out, False)
        self.assertIn("WARNING s1", log)
        self.assertNotIn("last_frame", self.vid.calls[0])

    def test_missing_last_keyframe_is_an_error(self):
        ep = self.ep(scene("s1", last_frame_prompt="end still"))
        with self.assertRaises(SystemExit) as e:
            self.quiet(run.stage_clips, ep, self.out, False)
        self.assertIn("keyframes stage first", str(e.exception))
        self.assertEqual(self.vid.calls, [])

    def test_stage_refuses_last_frame_with_refs(self):
        ep = self.ep(scene("s1", last_frame_prompt="end", reference_images=["refs/hero.png"]))
        for stage in (run.stage_keyframes, run.stage_clips):
            with self.assertRaises(SystemExit) as e:
                self.quiet(stage, ep, self.out, False)
            self.assertIn("last_frame_exclusive", str(e.exception))
        self.assertEqual(self.img.calls + self.vid.calls, [])

    def test_real_adapters_report_support(self):
        self.assertTrue(MiniMaxVideo(model="MiniMax-H3").supports_last_frame)
        self.assertTrue(MiniMaxVideo(model="MiniMax-H3-Max", resolution="480P").supports_last_frame)
        self.assertFalse(MiniMaxVideo(model="MiniMax-Hailuo-2.3").supports_last_frame)
        self.assertTrue(MiniMaxImage().supports_subject_reference)
        kf = self.ep_dir / "refs" / "hero.png"
        body = MiniMaxVideo(model="MiniMax-H3").build_v2_body("p", kf, kf)
        self.assertEqual([c.get("role") for c in body["content"]], [None, "first_frame", "last_frame"])


class SubjectReference(Base):
    def test_reference_images_passed(self):
        (self.ep_dir / "refs" / "other.png").write_bytes(b"other")  # every listed ref is validated; only the first is sent
        ep =self.ep(scene("s1", reference_images=["refs/hero.png", "refs/other.png"]))
        log = self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertEqual(self.img.calls[0]["subject_reference"], (self.ep_dir / "refs" / "hero.png").resolve())
        self.assertIn("subject_reference hero.png", log)

    def test_canon_frame_from_continuity(self):
        (self.out / "refs").mkdir()
        (self.out / "refs" / "bruno.png").write_bytes(b"bruno")
        s = scene("s1")
        s["shot"] = {"continuity_ids": ["char_bruno"]}
        ep = self.ep(s, continuity={"characters": [{"id": "char_bruno", "canon_frame": "out/epT/refs/bruno.png"}]})
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertEqual(self.img.calls[0]["subject_reference"], (self.out / "refs" / "bruno.png").resolve())

    def test_missing_ref_is_clear_error(self):
        ep = self.ep(scene("s1", reference_images=["refs/nope.png"]))
        with self.assertRaises(SystemExit) as e:
            self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertIn("not found: refs/nope.png", str(e.exception))
        self.assertEqual(self.img.calls, [])

    def test_ref_outside_refs_dir_rejected(self):
        (self.ep_dir / "photo.png").write_bytes(b"x")
        ep = self.ep(scene("s1", reference_images=["photo.png"]))
        with self.assertRaises(SystemExit) as e:
            self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertIn("/refs/", str(e.exception))
        self.assertEqual(self.img.calls, [])

    def test_unsupported_image_model_warns(self):
        self.img = FakeImage(supports=False)
        ep = self.ep(scene("s1", reference_images=["refs/hero.png"]))
        log = self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertIn("WARNING s1", log)
        self.assertNotIn("subject_reference", self.img.calls[0])


class CostGate(Base):
    def test_estimate_printed_and_under_cap_runs(self):
        ep = self.ep(*[scene(f"s{i}") for i in range(3)])
        log = self.quiet(run.stage_clips, ep, self.out, False)
        self.assertIn("3 clip(s) x 6s x $0.08/s", log)
        self.assertIn("$1.44", log)
        self.assertEqual(len(self.vid.calls), 3)

    def test_over_cap_refused_then_forced(self):
        ep = self.ep(*[scene(f"s{i}") for i in range(13)])  # 13 x 6 x 0.08 = 6.24 > 6.0
        with self.assertRaises(SystemExit) as e:
            self.quiet(run.stage_clips, ep, self.out, False)
        self.assertIn("exceeds max_clip_cost_usd", str(e.exception))
        self.assertEqual(self.vid.calls, [])
        with mock.patch("sys.argv", ["run.py", "epT", "clips", "--force-cost"]):
            log = self.quiet(run.stage_clips, ep, self.out, False)
        self.assertIn("--force-cost", log)
        self.assertEqual(len(self.vid.calls), 13)

    def test_only_stale_clips_are_counted(self):
        ep = self.ep(*[scene(f"s{i}") for i in range(13)])
        with mock.patch("sys.argv", ["run.py", "--force-cost"]):
            self.quiet(run.stage_clips, ep, self.out, False)
        self.vid.calls.clear()
        log = self.quiet(run.stage_clips, ep, self.out, False)  # all fresh: no estimate, no refusal
        self.assertNotIn("cost estimate", log)
        self.assertEqual(self.vid.calls, [])

    def test_missing_price_with_cap_refuses(self):
        self.vcfg = video_cfg()
        del self.vcfg["price_per_second"]
        with self.assertRaises(SystemExit):
            self.quiet(run.stage_clips, self.ep(scene("s1")), self.out, False)
        self.assertEqual(self.vid.calls, [])


class CacheKeys(Base):
    def test_legacy_keys_unchanged_without_new_fields(self):
        ep = self.ep(scene("s1"))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        kf = self.out / "keyframes" / "s1.png"
        legacy_cfg = {k: v for k, v in self.vcfg.items() if k not in ("price_per_second", "max_clip_cost_usd")}
        self.assertEqual((self.out / "keyframes" / "s1.png.key").read_text(), cache.key("kf", "still of s1", IMAGE_CFG, 1234))
        self.assertEqual((self.out / "clips" / "s1.mp4.key").read_text(),
                         cache.key("clip", "[Static shot] s1 moves", cache.file_hash(kf), legacy_cfg))

    def test_price_change_does_not_rekey(self):
        ep = self.ep(scene("s1"))
        self.quiet(run.stage_clips, ep, self.out, False)
        self.vcfg = video_cfg(price_per_second=0.13, max_clip_cost_usd=20)
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertEqual(len(self.vid.calls), 1)

    def test_last_frame_change_invalidates_clip(self):
        ep = self.ep(scene("s1", last_frame_prompt="end A"))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertEqual((len(self.img.calls), len(self.vid.calls)), (2, 1))  # all cached on the second pass
        ep["scenes"][0]["visual"]["last_frame_prompt"] = "end B"
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertEqual([c["out"].name for c in self.img.calls[2:]], ["s1_last.png"])  # first frame stays cached
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertEqual(len(self.vid.calls), 2)

    def test_adding_last_frame_invalidates_clip(self):
        ep = self.ep(scene("s1"))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        ep["scenes"][0]["visual"]["last_frame_prompt"] = "end"
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_clips, ep, self.out, False)
        self.assertEqual(len(self.vid.calls), 2)

    def test_reference_change_invalidates_keyframe(self):
        ep = self.ep(scene("s1", reference_images=["refs/hero.png"]))
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertEqual(len(self.img.calls), 1)
        (self.ep_dir / "refs" / "hero.png").write_bytes(b"hero-v2")
        self.quiet(run.stage_keyframes, ep, self.out, False)
        self.assertEqual(len(self.img.calls), 2)


class LintRule(unittest.TestCase):
    def _ids(self, ep):
        return {(sev, rid) for sev, rid, _ in lint._checklist_checks(ep, Path(tempfile.mkdtemp()))}

    def test_last_frame_exclusive(self):
        both = {"id": "lint-t", "scenes": [scene("s1", last_frame_prompt="end", reference_images=["refs/a.png"])]}
        self.assertIn(("error", "last_frame_exclusive"), self._ids(both))
        s = scene("s1", last_frame_prompt="end")
        s["shot"] = {"continuity_ids": ["c1"]}
        via_canon = {"id": "lint-t", "scenes": [s], "continuity": {"characters": [{"id": "c1", "sheet": ["refs/p1.png"]}]}}
        self.assertIn(("error", "last_frame_exclusive"), self._ids(via_canon))
        only_last = {"id": "lint-t", "scenes": [scene("s1", last_frame_prompt="end")]}
        self.assertNotIn("last_frame_exclusive", {r for _, r in self._ids(only_last)})

    def test_schema_accepts_new_keys(self):
        import jsonschema
        import json
        sch = json.loads((HERE / "direction" / "episode.schema.json").read_text())
        vis = sch["properties"]["scenes"]["items"]["properties"]["visual"]["properties"]
        self.assertEqual(vis["last_frame_prompt"]["type"], "string")
        jsonschema.validate(["refs/a.png"], vis["reference_images"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
