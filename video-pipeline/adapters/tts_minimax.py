"""MiniMax Speech (t2a_v2). Returns audio file + whole-word timings (seconds)."""
import re
from pathlib import Path

import requests

from .common import download, minimax_check, minimax_headers

URL = "https://api.minimax.io/v1/t2a_v2"


def _merge_words(text: str, pieces: list) -> list:
    """Sub-word pieces carry char offsets into `text`; merge into whitespace words."""
    out = []
    for m in re.finditer(r"\S+", text):
        s, e = m.span()
        ps = [p for p in pieces if p["word_begin"] < e and p["word_end"] > s]
        if ps:
            out.append({"w": m.group(), "s": ps[0]["time_begin"] / 1000, "e": ps[-1]["time_end"] / 1000})
    return out


class MiniMaxTTS:
    def __init__(self, model="speech-2.8-hd", voice_id="English_WiseScholar", speed=1.0, emotion=None):
        self.model, self.voice_id, self.speed, self.emotion = model, voice_id, speed, emotion

    def synth(self, text: str, out_path: Path) -> dict:
        vs = {"voice_id": self.voice_id, "speed": self.speed, "vol": 1, "pitch": 0}
        if self.emotion:
            vs["emotion"] = self.emotion
        body = {
            "model": self.model, "text": text, "stream": False, "output_format": "url",
            "subtitle_enable": True, "subtitle_type": "word", "voice_setting": vs,
            "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        }
        r = requests.post(URL, headers=minimax_headers(), json=body, timeout=180)
        r.raise_for_status()
        j = minimax_check(r.json(), "TTS")
        download(j["data"]["audio"], out_path)
        sub = requests.get(j["data"]["subtitle_file"], timeout=60).json()
        pieces = [p for seg in sub for p in seg["timestamped_words"]]
        return {
            "audio": str(out_path),
            "duration": j["extra_info"]["audio_length"] / 1000,
            "words": _merge_words(text, pieces),
            "characters": j["extra_info"].get("usage_characters"),
        }
