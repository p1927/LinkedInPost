# Manim for mathematical short-form videos (research, 2026-10-05)

Method: `gh api` against GitHub (no clones) plus raw file reads. Items tagged **[UNVERIFIED]** were not confirmed from a source and must be tested before relying on them. I did not run any rendering, so every speed and behaviour claim about our Mac is untested.

## 1. What the repos are

| Repo | What | Licence (read from file) | Stars | Last push |
|---|---|---|---|---|
| https://github.com/3b1b/manim | ManimGL: Grant Sanderson's engine, OpenGL-based, PyPI name `manimgl`. Latest GitHub release v1.7.2 (2024-12-13); master has moved on since | MIT, "Copyright (c) 2020-2026 3Blue1Brown LLC" | ~94.5k | 2026-09-09 |
| https://github.com/3b1b/videos | Source code for the 3b1b YouTube videos, written against ManimGL | **CC BY-NC-SA 4.0** (`LICENSE.txt`; GitHub shows it as "Other") | ~11.3k | 2026-09-29 |
| https://github.com/ManimCommunity/manim | Manim Community Edition (ManimCE), forked in 2020. Latest release v0.21.0 (2026-08-10), `requires-python >=3.11` | MIT | ~41.2k | 2026-10-04 |
| https://github.com/ManimCommunity/manim-voiceover | CE plugin for TTS/voiceover. 316 stars, MIT, last push 2026-06-15 | MIT | 316 | 2026-06-15 |

### What the licences allow
- **3b1b/manim and ManimCE (MIT):** commercial use, modification, redistribution and sublicensing are allowed. The only condition is keeping the copyright and licence notice in copies. Videos we render with the library are ours.
- **3b1b/videos (CC BY-NC-SA 4.0):** the README says this explicitly: the library is MIT, "the contents of this repository" are CC BY-NC-SA (https://github.com/3b1b/videos/blob/master/README.md). The licence text defines NonCommercial as "not primarily intended for or directed towards commercial advantage or monetary compensation".
  - Copying or adapting its code or scenes into a monetised product (ads, sponsorships, a paid service) is a risk. Anything adapted would also have to be shared under the same licence with attribution.
  - Reading it to learn patterns and writing our own code is fine. Ideas are not covered by copyright. I am not a lawyer; treat any verbatim reuse as off-limits unless we get written permission.
  - The pi-creature characters and the 3b1b look are brand assets. Do not clone that identity.

## 2. ManimGL vs ManimCE

The 3b1b README itself says CE was forked to be "more stable, better tested, quicker to respond to community contributions, and all around friendlier to get started with". Its warning: the two are not interchangeable; install instructions and APIs differ (`pip install manimgl` vs `pip install manim`), and older 3b1b/videos code targets older manimgl.

| Concern | ManimGL | ManimCE |
|---|---|---|
| Headless render | Built around an interactive OpenGL window (glfw / `rendercanvas` in its deps). I found no `--headless` flag in `manimlib/config.py`. Docker would need EGL or xvfb **[UNVERIFIED]** | Default renderer is `cairo` (`default.cfg`), needs no GPU or display. Official Docker image exists; its Dockerfile keeps `libegl1`/`libgl1` for the OpenGL renderer |
| Docker support | None official that I found | `manimcommunity/manim` image (docs.manim.community/en/stable/installation/docker.html) |
| Transparent output | CLI `-t / --transparent` (RGBA PNG mode in config.py) | `-t`; `format = auto` picks mp4 for opaque and **mov for transparent** (default.cfg comment). Codec inside the mov is **[UNVERIFIED]**; check alpha survives Remotion's decoder |
| Docs | https://3b1b.github.io/manim, thinner | https://docs.manim.community, far larger, with a tutorial, reference and gallery |
| Ecosystem | Few plugins | manim-voiceover, many examples; more LLM training data |
| Strengths | 3D, shaders, interactive dev (`-se <line>` embeds an IPython shell), what 3b1b really uses | Stable releases, tests, active triage |

**Verdict for headless, Docker, automated, Mac: ManimCE.** It is the better-documented, more stable one, and it has the official container image.

## 3. Recipes (CE)

### 9:16 at 1080x1920
CLI: `manim -r 1080,1920 --fps 30 scene.py Name`. The config keys `pixel_width` / `pixel_height` default to 1920x1080 and `frame_rate` to 60 (`default.cfg`). In code, set both pixels and frame units so Mobject coordinates match the new shape:
```python
config.pixel_width, config.pixel_height = 1080, 1920
config.frame_width, config.frame_height = 9, 16   # scene units; verify scaling in a test render
```
Whether CE rescales `frame_width` automatically when only the pixels change is **[UNVERIFIED]**, so set it explicitly. Use 30 fps; 60 doubles render time for little benefit on short-form.

### Transparent for Remotion
`manim -t ...` writes a transparent video (mov per the default.cfg comment). Safer, codec-agnostic route: `manim -t --format=png --write_all`-style PNG frames or a `-s` last-frame test, then check what Remotion accepts. Remotion's own docs cover transparent video via WebM VP8/VP9 or ProRes. I have not checked them; **[UNVERIFIED]** whether `<OffthreadVideo>` plays the manim mov alpha correctly. Alternative that avoids the alpha question: render manim on a solid dark background and let Remotion place it as a full-frame layer, with captions on top.

### Voiceover sync
`manim-voiceover` (CE only): `with self.voiceover(text="...") as tracker:` then `self.play(..., run_time=tracker.duration)`. Supports per-word bookmarks, Gemini (README recommends it), Azure, gTTS, pyttsx3 (https://voiceover.manim.community). Our pipeline already has its own TTS and captions, so the cleaner design is: **keep voice in our pipeline**, generate the audio first, read its duration/word timestamps and pass them into the scene as a timing JSON (`run_time` and `self.wait()` values). manim-voiceover is optional. Its last push was 2026-06-15; modest community.

### LaTeX
Needed for `MathTex`/`Tex`. Pure `Text` objects need no LaTeX, but they need Pango and fonts. Options on Mac: MacTeX (large), BasicTeX plus `tlmgr` packages, or TinyTeX. In Docker use the minimal TeX Live from the official Dockerfile: its package list includes amsmath, dvisvgm, standalone, preview, xcolor, physics, relsize and others (see `docker/Dockerfile` in the CE repo). ctex is deliberately not installed.

### Speed on Apple Silicon
No benchmarks found, and I did not measure. Expectation only **[UNVERIFIED]**: Cairo renderer is CPU-bound and single-threaded per scene, so a 30-60 s 1080x1920 explainer plausibly takes minutes, not seconds. Docker on Apple Silicon should use an arm64 image (the Dockerfile's PATH includes `aarch64-linux`); do not run amd64 emulation. Start with `-ql` (480p) for iteration, then 1080x1920 for finals. Cache LaTeX via manim's built-in tex cache (mounted volume).

## 4. Reusable assets in 3b1b/videos

Top level: `_2015` ... `_2026` (one folder per year), `custom/`, `once_useful_constructs/`, `outside_videos/`, `manim_imports_ext.py`, `custom_config.yml`, `stage_scenes.py`, `sublime_custom_commands/`, plus a `CLAUDE.md`.

- Recent folders: `_2024`: antp, holograms, inscribed_rect, linalg, manim_demo, puzzles, transformers. `_2025`: colliding_blocks_v2, cosmic_distance, grover, guest_videos, laplace, zeta. `_2026`: RL, cross_entropy, hairy_ball, monthly_mindbenders, print_gallery, spheres_talk and the 2025 P6 folders.
- `custom/`: `backdrops.py`, `banner.py`, `characters/` (pi_creature*), `drawings.py`, `end_screen.py`, `filler.py`, `logo.py`, `opening_quote.py`.
- `once_useful_constructs/`: grab-bag of old helpers. The README documents the workflow (interactive `-se <line>`, `checkpoint_paste()`).
- Library side, `manimlib/mobject/`: boolean_ops, coordinate_systems, number_line, matrix, vector_field, three_dimensions, probability, svg. These are what the videos build on.

How to learn from it: read scenes for structure (setup -> staged `self.play` beats -> `self.wait`), how Grant composes Axes/NumberPlane/graphs, how he uses ValueTracker plus updaters and `TransformMatchingStrings` for equation morphs. Retype the technique in CE syntax. Do not paste it (licence, plus API differences: ManimGL's `Tex` and `TransformMatchingStrings` have no 1:1 CE equivalents **[UNVERIFIED in detail]**).

What is not worth copying: pi-creature assets, Sublime plugins, `once_useful_constructs`, anything year-specific built for an old manimgl version, and the interactive checkpoint workflow (we are batch-rendering).

## 5. Integration design

```
topic -> Claude (director): script + beat list + timing JSON
      -> TTS (existing) -> audio + word timestamps
      -> Claude writes Scene (CE python) -> docker run manim -> clip.mp4 / clip.mov
      -> validator (ffprobe size/fps/duration, last-frame check) -> retry loop with error text to Claude
      -> Remotion: <OffthreadVideo> layer + captions + music + voice -> final mp4
```

Pipeline notes: run Claude's generated Scene code only inside the container (no network, read-only mount except `/out`); cap render time with a timeout; Claude gets stderr back on failure (max 3 retries); keep a library of 5-10 tested "template scenes" (visual proof, graph morph, equation derivation, number line, geometry) so Claude fills parameters rather than free-forming layout. That is the main reliability lever.

### Minimal working example (CE, 9:16): 1+3+5+...+(2n-1) = n^2 (untested, write-up only)
```python
from manim import *

config.pixel_width, config.pixel_height = 1080, 1920
config.frame_width, config.frame_height = 9, 16
config.frame_rate = 30

class OddSumSquare(Scene):
    def construct(self):
        self.camera.background_color = "#0B1020"
        title = MathTex(r"1+3+5+\cdots+(2n-1)=n^2", font_size=44).to_edge(UP, buff=1.2)
        self.play(Write(title))

        n, s = 5, 1.0
        colors = [BLUE, TEAL, GREEN, YELLOW, ORANGE]
        groups = VGroup()
        for k in range(n):                       # k-th L-shaped layer has 2k+1 squares
            layer = VGroup()
            for i in range(k + 1):
                layer.add(Square(s, fill_opacity=0.85, color=colors[k], stroke_width=2).move_to([i * s, k * s, 0]))
            for j in range(k):
                layer.add(Square(s, fill_opacity=0.85, color=colors[k], stroke_width=2).move_to([k * s, j * s, 0]))
            groups.add(layer)
        groups.move_to(ORIGIN + DOWN * 0.5)
        for k, layer in enumerate(groups):
            label = MathTex(str(2 * k + 1), font_size=36).next_to(groups, DOWN, buff=0.5 + 0.0 * k)
            self.play(FadeIn(layer, shift=UP * 0.3), run_time=0.8)
            self.play(Transform(label, label.copy()), run_time=0.1)
            self.remove(label)
        sq = MathTex(rf"{n}\times{n}={n*n}", font_size=56).next_to(groups, DOWN, buff=0.8)
        self.play(Write(sq))
        self.wait(1)
```
Render: `manim -r 1080,1920 --fps 30 -o odd_sum --media_dir /out scene.py OddSumSquare`. The label loop is deliberately dull; real scenes should use `Write`/`Transform` per layer. The code compiles in my head only; run it before using it as a template.

### Dockerfile outline (arm64 on Apple Silicon)
```dockerfile
FROM manimcommunity/manim:stable   # official image; pin a vX.Y.Z tag once verified
USER root
RUN pip install --no-cache-dir <plugins if any>   # e.g. manim-voiceover (optional)
COPY templates/ /opt/templates/
WORKDIR /manim
USER manimuser
ENTRYPOINT ["manim"]
```
Alternative: build from CE's own `docker/Dockerfile` (multi-stage, python:3.14-slim, minimal TeX Live, fonts-noto-core, EGL libs). Whether the Docker Hub image publishes an arm64 manifest is **[UNVERIFIED]**; if not, build locally with the repo Dockerfile.

### Failure modes
- **LaTeX:** missing package gives `latex error converting to dvi`; log is in the media dir. Fix by `tlmgr install <pkg>` baked in the image. Don't allow `\usepackage` from model output beyond an allow-list.
- **Fonts:** `Text()` falls back silently if the font is absent. Install fonts in the image and pin names; run `fc-cache`. Prefer `MathTex` for anything mathematical.
- **OpenGL headless:** avoid `--renderer=opengl` in Docker; use Cairo. If OpenGL is needed, EGL is the supported route in the CE image (libegl1) but untested here. ManimGL needs a window/GL context, which is the main reason not to choose it.
- Model-generated code: infinite loops, huge `ValueTracker` ranges, `os.system`. Sandbox and time-limit.
- Layout: objects overflowing the 9-unit-wide frame. Add an automated check (bounding box vs frame) in the validator.
- Alpha: confirm with a real Remotion test before committing to transparent clips.

## 6. Risks and recommendation

- **Edition:** ManimCE, pinned to a release (v0.21.0 is current as of 2026-08-10; re-check before pinning).
- **Packaging:** `pip install` in a Docker image (or use the official image). Do **not** add 3b1b/manim as a submodule or fork; it is not needed and its API is a moving target. Do **not** vendor 3b1b/videos into our repo; the NC-SA licence would taint the product repo. If we want local reference, clone it outside the repo (read-only) or keep it in `~/refs`.
- **Risks:** (1) LLM-written Scenes have a high failure rate unless constrained to templates; (2) render time/cost unmeasured; (3) alpha pipeline into Remotion unverified; (4) CE and ManimGL syntax confusion in model output, so tell Claude explicitly "ManimCE, `from manim import *`"; (5) licence hygiene for 3b1b/videos.
- **Next steps:** build the image, render the example above, measure time on this Mac, test mov/WebM alpha in Remotion, then write three template scenes.

## Sources
- https://github.com/3b1b/manim (README, `setup.cfg`, `manimlib/config.py`, `default_config.yml`)
- https://github.com/3b1b/videos (README, LICENSE.txt, CLAUDE.md, directory listing via API)
- https://github.com/ManimCommunity/manim (`pyproject.toml`, `manim/_config/default.cfg`, `docker/Dockerfile`, docs `installation/docker.rst`)
- https://github.com/ManimCommunity/manim-voiceover (README)
- Star counts / push dates: GitHub API on 2026-10-05.
