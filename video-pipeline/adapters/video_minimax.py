"""MiniMax Hailuo image-to-video. Same shape as ViMax's VideoGenerator protocol
(prompt + reference image -> video file), kept synchronous for simplicity."""
import base64
from pathlib import Path

import requests

from .common import download, minimax_check, minimax_headers, poll

BASE = "https://api.minimax.io/v1"


class MiniMaxVideo:
    def __init__(self, model="MiniMax-Hailuo-2.3", resolution="768P", duration=6):
        self.model, self.resolution, self.duration = model, resolution, duration

    def generate(self, prompt: str, out_path: Path, first_frame: Path | None = None) -> Path:
        body = {"model": self.model, "prompt": prompt[:2000], "duration": self.duration,
                "resolution": self.resolution, "prompt_optimizer": True}
        if first_frame:
            ext = first_frame.suffix.lstrip(".").lower().replace("jpg", "jpeg")
            b64 = base64.b64encode(first_frame.read_bytes()).decode()
            body["first_frame_image"] = f"data:image/{ext};base64,{b64}"
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

        file_id = poll(check, every=10, timeout=900)
        f = requests.get(f"{BASE}/files/retrieve", params={"file_id": file_id},
                         headers=minimax_headers(), timeout=60).json()
        return download(f["file"]["download_url"], out_path)
