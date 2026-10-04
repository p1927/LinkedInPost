"""MiniMax image-01 text-to-image (9:16 keyframes for story beats)."""
from pathlib import Path

import requests

from .common import download, minimax_check, minimax_headers

URL = "https://api.minimax.io/v1/image_generation"


class MiniMaxImage:
    def __init__(self, model="image-01"):
        self.model = model

    def generate(self, prompt: str, out_path: Path, aspect_ratio="9:16", seed=None) -> Path:
        body = {"model": self.model, "prompt": prompt[:1500], "aspect_ratio": aspect_ratio,
                "response_format": "url", "n": 1, "prompt_optimizer": False}
        if seed is not None:
            body["seed"] = seed
        r = requests.post(URL, headers=minimax_headers(), json=body, timeout=180)
        r.raise_for_status()
        j = minimax_check(r.json(), "image")
        return download(j["data"]["image_urls"][0], out_path)
