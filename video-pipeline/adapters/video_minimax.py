"""MiniMax image-to-video. Same shape as ViMax's VideoGenerator protocol
(prompt + reference image -> video file), kept synchronous for simplicity.

Two endpoint families, chosen by the `model` id (config/providers.yaml `video.init_args.model`):
  * v2 (MiniMax-H3, MiniMax-H3-Max; released 2026-07-31, current):
      POST /v2/video_generation {model, content:[{type:text}, {type:image_url, role:first_frame|last_frame}],
      resolution, duration, ratio} -> {task_id}; GET /v2/query/video_generation/{task_id} -> task.status
      queued|running|succeeded|failed|cancelled, video at task.content.url (time-limited).
      Docs: https://platform.minimax.io/docs/api-reference/video-generation-v2-create
  * v1 (MiniMax-Hailuo-2.3 / -2.3-Fast / -02; listed as legacy, kept as fallback):
      POST /v1/video_generation -> task_id; GET /v1/query/video_generation -> file_id; GET /v1/files/retrieve.
See direction/craft/dialects/hailuo.md for limits and prompt craft.
"""
import base64
from pathlib import Path

import requests

from .common import download, minimax_check, minimax_headers, poll

API = "https://api.minimax.io"
BASE = f"{API}/v1"  # kept for backwards compatibility

# Documented limits (verified 2026-10-05). Used to fail fast before a paid call.
V2_LIMITS = {
    "MiniMax-H3": {"durations": range(4, 16), "resolutions": {"768P", "2K"}},
    "MiniMax-H3-Max": {"durations": range(5, 16), "resolutions": {"480P", "768P"}},
}
V2_RATIOS = {"adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"}
V1_LIMITS = {  # (duration, resolution) pairs
    "MiniMax-Hailuo-2.3": {(6, "768P"), (6, "1080P"), (10, "768P")},
    "MiniMax-Hailuo-2.3-Fast": {(6, "768P"), (6, "1080P"), (10, "768P")},
    "MiniMax-Hailuo-02": {(6, "512P"), (6, "768P"), (6, "1080P"), (10, "512P"), (10, "768P")},
}


def _data_url(p: Path) -> str:
    ext = p.suffix.lstrip(".").lower().replace("jpg", "jpeg")
    return f"data:image/{ext};base64,{base64.b64encode(p.read_bytes()).decode()}"


def family(model: str) -> str:
    return "v2" if model.startswith("MiniMax-H3") else "v1"


class MiniMaxVideo:
    def __init__(self, model="MiniMax-H3", resolution="768P", duration=6, ratio="9:16",
                 prompt_optimizer=True, prompt_expansion_mode=None, poll_every=10, timeout=900):
        """ratio: v2 only. Used for text-to-video; with a first frame the API forces 'adaptive'
        (the keyframe sets the aspect). prompt_optimizer: v1 only (v2 has no such field).
        prompt_expansion_mode: MiniMax-H3-Max only ('disabled' | 'balanced' | 'quality')."""
        self.model, self.resolution, self.duration = model, resolution, int(duration)
        self.ratio, self.prompt_optimizer = ratio, prompt_optimizer
        self.prompt_expansion_mode = prompt_expansion_mode
        self.poll_every, self.timeout = poll_every, timeout
        self.family = family(model)
        self._validate()

    def _validate(self):
        if self.family == "v2":
            lim = V2_LIMITS.get(self.model)
            if lim:
                if self.duration not in lim["durations"]:
                    raise ValueError(f"{self.model}: duration {self.duration} not in "
                                     f"{lim['durations'].start}-{lim['durations'].stop - 1}")
                if self.resolution not in lim["resolutions"]:
                    raise ValueError(f"{self.model}: resolution {self.resolution} not in {sorted(lim['resolutions'])}")
            if self.ratio not in V2_RATIOS:
                raise ValueError(f"ratio {self.ratio} not in {sorted(V2_RATIOS)}")
            if self.prompt_expansion_mode and self.model != "MiniMax-H3-Max":
                raise ValueError("prompt_expansion_mode is only documented for MiniMax-H3-Max")
        else:
            pairs = V1_LIMITS.get(self.model)
            if pairs and (self.duration, self.resolution) not in pairs:
                raise ValueError(f"{self.model}: {self.duration}s at {self.resolution} is not offered")

    @property
    def supports_last_frame(self) -> bool:
        """True when a last_frame image can be sent (all H3 v2 models; on v1 only MiniMax-Hailuo-02 FL2V).
        run.py reads this before generating a last-frame keyframe, so an unsupported model never costs an image."""
        return self.family == "v2" or self.model == "MiniMax-Hailuo-02"

    # ---- public interface (used by run.py stage_clips) ----
    def generate(self, prompt: str, out_path: Path, first_frame: Path | None = None,
                 last_frame: Path | None = None) -> Path:
        if self.family == "v2":
            return self._generate_v2(prompt, out_path, first_frame, last_frame)
        return self._generate_v1(prompt, out_path, first_frame, last_frame)

    # ---- v2: MiniMax-H3 family ----
    def build_v2_body(self, prompt: str, first_frame: Path | None = None, last_frame: Path | None = None) -> dict:
        content = [{"type": "text", "text": prompt[:7000]}]
        for p, role in ((first_frame, "first_frame"), (last_frame, "last_frame")):
            if p:
                content.append({"type": "image_url", "image_url": {"url": _data_url(p)}, "role": role})
        i2v = bool(first_frame or last_frame)
        if not i2v and self.ratio == "adaptive":
            raise ValueError("text-to-video needs a concrete ratio (e.g. 9:16), not 'adaptive'")
        body = {"model": self.model, "content": content, "resolution": self.resolution,
                "duration": self.duration, "ratio": "adaptive" if i2v else self.ratio}
        if self.prompt_expansion_mode:
            body["extra"] = {"prompt_expansion_mode": self.prompt_expansion_mode}
        return body

    @staticmethod
    def _v2_json(r: requests.Response, what: str) -> dict:
        try:
            j = r.json()
        except ValueError:
            r.raise_for_status()
            raise RuntimeError(f"MiniMax {what}: non-JSON response (HTTP {r.status_code})")
        if r.status_code >= 400 or j.get("type") == "error":
            e = j.get("error") or {}
            raise RuntimeError(f"MiniMax {what} failed: HTTP {r.status_code} {e.get('type')} {e.get('message')}")
        if "base_resp" in j:
            minimax_check(j, what)
        return j

    def _generate_v2(self, prompt, out_path, first_frame, last_frame) -> Path:
        body = self.build_v2_body(prompt, first_frame, last_frame)
        r = requests.post(f"{API}/v2/video_generation", headers=minimax_headers(), json=body, timeout=120)
        task_id = self._v2_json(r, "video create")["task_id"]

        def check():
            q = self._v2_json(requests.get(f"{API}/v2/query/video_generation/{task_id}",
                                           headers=minimax_headers(), timeout=60), "video query")
            t = q.get("task") or {}
            st = t.get("status")
            if st == "succeeded":
                return t["content"]["url"]
            if st in ("failed", "cancelled"):
                raise RuntimeError(f"MiniMax video {st}: {t}")
            return None

        url = poll(check, every=self.poll_every, timeout=self.timeout)
        return download(url, out_path)

    # ---- v1: Hailuo 2.3 / 02 (legacy fallback) ----
    def build_v1_body(self, prompt: str, first_frame: Path | None = None, last_frame: Path | None = None) -> dict:
        body = {"model": self.model, "prompt": prompt[:2000], "duration": self.duration,
                "resolution": self.resolution, "prompt_optimizer": bool(self.prompt_optimizer)}
        if first_frame:
            body["first_frame_image"] = _data_url(first_frame)
        if last_frame:
            if self.model != "MiniMax-Hailuo-02":
                raise ValueError(f"{self.model} has no last-frame input on v1 (only MiniMax-Hailuo-02 FL2V)")
            body["last_frame_image"] = _data_url(last_frame)
        return body

    def _generate_v1(self, prompt, out_path, first_frame, last_frame) -> Path:
        body = self.build_v1_body(prompt, first_frame, last_frame)
        r = requests.post(f"{BASE}/video_generation", headers=minimax_headers(), json=body, timeout=120)
        r.raise_for_status()
        task_id = minimax_check(r.json(), "video create")["task_id"]

        def check():
            q = requests.get(f"{BASE}/query/video_generation", params={"task_id": task_id},
                             headers=minimax_headers(), timeout=60).json()
            st = q.get("status")
            if st == "Success":
                return q["file_id"]
            if st == "Fail":
                raise RuntimeError(f"MiniMax video failed: {q}")
            return None

        file_id = poll(check, every=self.poll_every, timeout=self.timeout)
        f = requests.get(f"{BASE}/files/retrieve", params={"file_id": file_id},
                         headers=minimax_headers(), timeout=60).json()
        return download(f["file"]["download_url"], out_path)
