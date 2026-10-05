"""MiniMax image-01 text-to-image (9:16 keyframes for story beats).

Docs (verified 2026-10-05): https://platform.minimax.io/docs/api-reference/image-generation-t2i and -i2i.
image-01 is still the only MiniMax image model (image-01-live also accepts subject_reference).
`aspect_ratio: 9:16` yields only 720x1280. `width`/`height` (512-2048, divisible by 8, image-01 only)
allow 1152x2048, but the API lets aspect_ratio win when both are sent, so we omit aspect_ratio then.
"""
import base64
from pathlib import Path

import requests

from .common import download, minimax_check, minimax_headers

URL = "https://api.minimax.io/v1/image_generation"


def _ratio_matches(w: int, h: int, aspect_ratio: str) -> bool:
    try:
        a, b = (int(x) for x in aspect_ratio.split(":"))
    except (ValueError, AttributeError):
        return False
    return w * b == h * a


def _image_ref(ref) -> str:
    """Public URL / data URL as-is; a local path becomes a base64 data URL (JPG/PNG, < 10 MB)."""
    s = str(ref)
    if s.startswith(("http://", "https://", "data:")):
        return s
    p = Path(ref)
    ext = p.suffix.lstrip(".").lower().replace("jpg", "jpeg")
    return f"data:image/{ext};base64,{base64.b64encode(p.read_bytes()).decode()}"


class MiniMaxImage:
    def __init__(self, model="image-01", width=None, height=None):
        """width/height: optional explicit size used whenever the requested aspect_ratio matches it
        (e.g. 1152x2048 for 9:16). Without them the adapter sends aspect_ratio (old behaviour)."""
        self.model = model
        if (width is None) != (height is None):
            raise ValueError("set width and height together")
        if width is not None:
            for v in (width, height):
                if not (512 <= int(v) <= 2048 and int(v) % 8 == 0):
                    raise ValueError(f"image size {v} must be 512-2048 and divisible by 8")
        self.width, self.height = (int(width), int(height)) if width is not None else (None, None)

    @property
    def supports_subject_reference(self) -> bool:
        """image-01 / image-01-live accept subject_reference (type character); run.py checks this before passing one."""
        return self.model in ("image-01", "image-01-live")

    def build_body(self, prompt: str, aspect_ratio="9:16", seed=None, subject_reference=None) -> dict:
        body = {"model": self.model, "prompt": prompt[:1500],
                "response_format": "url", "n": 1, "prompt_optimizer": False}
        if (self.width and self.model == "image-01"
                and _ratio_matches(self.width, self.height, aspect_ratio)):
            body["width"], body["height"] = self.width, self.height
        else:
            body["aspect_ratio"] = aspect_ratio
        if seed is not None:
            body["seed"] = seed
        if subject_reference:
            refs = subject_reference if isinstance(subject_reference, (list, tuple)) else [subject_reference]
            body["subject_reference"] = [{"type": "character", "image_file": _image_ref(r)} for r in refs]
        return body

    def generate(self, prompt: str, out_path: Path, aspect_ratio="9:16", seed=None,
                 subject_reference=None) -> Path:
        """subject_reference: optional character reference (path, URL or data URL, or a list of them);
        a single front-facing portrait works best. Omitted -> identical request to before."""
        body = self.build_body(prompt, aspect_ratio, seed, subject_reference)
        r = requests.post(URL, headers=minimax_headers(), json=body, timeout=180)
        r.raise_for_status()
        j = minimax_check(r.json(), "image")
        return download(j["data"]["image_urls"][0], out_path)
