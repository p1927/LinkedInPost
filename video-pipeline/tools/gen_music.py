#!/usr/bin/env python3
"""Free, offline background-music generator (numpy only, no API, no licensing).
Usage: python tools/gen_music.py <mood> <seconds> <out.wav> [--seed N]
Moods: playful (bouncy major pluck), calm (slow warm pads), curious (minor-ish, sparse bell arpeggio).
Instrumental only: no lyrics under narration. Output is a seamless-ish loopable stereo 44.1k wav."""
import sys
import wave
from typing import Any

import numpy as np

SR = 44100
MOODS: dict[str, dict[str, Any]] = {
    # bpm, chord progression (root semitones above C3, quality), arp pattern (chord-tone idx), pluck/pad mix
    "playful": dict(bpm=112, prog=[(0, "maj"), (5, "maj"), (7, "maj"), (5, "maj")], arp=[0, 1, 2, 1, 2, 1, 0, 1], pad=0.35, pluck=0.5, wave="tri"),
    "calm": dict(bpm=68, prog=[(0, "maj7"), (9, "min7"), (5, "maj7"), (7, "sus")], arp=[0, 2, 1, 3], pad=0.7, pluck=0.18, wave="sine"),
    "curious": dict(bpm=88, prog=[(9, "min7"), (5, "maj7"), (0, "maj"), (7, "sus")], arp=[0, 2, 3, 2, 1, 3], pad=0.4, pluck=0.35, wave="sine"),
}
CHORDS = {"maj": [0, 4, 7, 12], "min7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11], "sus": [0, 5, 7, 12]}


def hz(semi):  # semitones above C3
    return 130.81 * 2 ** (semi / 12)


def osc(f, t, kind):
    ph = 2 * np.pi * f * t
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph) + 0.15 * np.sin(2 * ph)


def render(mood, seconds, seed=0):
    m = MOODS[mood]
    rng = np.random.default_rng(seed)
    shift = (seed * 5) % 7                      # transpose by 0-6 semitones per seed
    beat = 60 / (m["bpm"] * (1 + ((seed * 3) % 9 - 4) / 100))  # +-4% tempo
    m = {**m, "prog": [(r + shift, q) for r, q in m["prog"]]}
    bar = beat * 4
    n = int(seconds * SR)
    out = np.zeros((n, 2))
    t_all = np.arange(n) / SR
    nbars = int(np.ceil(seconds / bar))
    for b in range(nbars):
        root, q = m["prog"][b % len(m["prog"])]
        tones = [root + s for s in CHORDS[q]]
        s0 = int(b * bar * SR)
        s1 = min(n, int((b + 1) * bar * SR) + int(0.4 * SR))  # pad tail overlaps next bar
        t = t_all[s0:s1] - b * bar
        env = np.minimum(1, t / 0.5) * np.exp(-np.maximum(0, t - bar) * 6)
        for k, st in enumerate(tones[:3]):  # pad: detuned pair per tone, slightly panned
            for det, pan in ((-0.004, 0.35), (0.004, 0.65)):
                w = osc(hz(st) * (1 + det), t, "sine") * env * m["pad"] * 0.16
                out[s0:s1, 0] += w * (1 - pan)
                out[s0:s1, 1] += w * pan
        bass = np.sin(2 * np.pi * hz(root - 12) * t) * env * 0.22
        out[s0:s1, 0] += bass
        out[s0:s1, 1] += bass
        steps = len(m["arp"]) * (2 if mood == "playful" else 1)
        step_len = bar / steps
        for i in range(steps):  # plucked arpeggio
            st = tones[m["arp"][i % len(m["arp"])] % len(tones)] + (12 if i % 4 == 3 else 0)
            a0 = int((b * bar + i * step_len) * SR)
            if a0 >= n:
                break
            ln = min(int(step_len * 1.6 * SR), n - a0)
            tt = np.arange(ln) / SR
            pe = np.exp(-tt * (7 if mood == "playful" else 3.2)) * min(1, 1)
            note = osc(hz(st + 12), tt, m["wave"]) * pe * m["pluck"] * 0.22
            note *= 1 + 0.0 * rng.random()
            pan = 0.3 + 0.4 * ((i * 0.37) % 1)
            out[a0:a0 + ln, 0] += note * (1 - pan)
            out[a0:a0 + ln, 1] += note * pan
        if mood == "playful":  # soft kick on beats 1 and 3 + hat on offbeats
            for bt in (0, 2):
                k0 = int((b * bar + bt * beat) * SR)
                if k0 >= n:
                    continue
                ln = min(int(0.18 * SR), n - k0)
                tt = np.arange(ln) / SR
                kick = np.sin(2 * np.pi * (110 * np.exp(-tt * 18) + 45) * tt) * np.exp(-tt * 20) * 0.35
                out[k0:k0 + ln] += kick[:, None]
            for bt in (0.5, 1.5, 2.5, 3.5):
                h0 = int((b * bar + bt * beat) * SR)
                if h0 >= n:
                    continue
                ln = min(int(0.05 * SR), n - h0)
                hat = rng.standard_normal(ln) * np.exp(-np.arange(ln) / SR * 90) * 0.04
                out[h0:h0 + ln] += hat[:, None]
    fade = int(1.5 * SR)  # fade ends so the loop seam is soft
    out[:fade] *= np.linspace(0, 1, fade)[:, None]
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    out /= max(1e-9, np.abs(out).max())
    return out * 0.8


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    mood, secs, path = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    seed = int(sys.argv[sys.argv.index("--seed") + 1]) if "--seed" in sys.argv else 0
    write_wav(path, render(mood, secs, seed))
    print(f"{mood} {secs}s -> {path}")
