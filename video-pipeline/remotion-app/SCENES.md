# Scene Visual Schemas

All new scene types are driven by the `scene.visual` JSON object.
Existing types (`"clip"`, `"illustration"`) are unchanged.

---

## Common fields

Every visual type supports:

| Field | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | Scene discriminator |
| `captions` | boolean | `true` | Set `false` to suppress kinetic captions on this scene |

---

## `"diagram"` — Mechanism diagram with staged reveal

Renders nodes as cards connected by animated edges. Elements appear/highlight in sync with narration via `reveal` steps.

**Safe zone**: Node content kept within x 60–1020, y 220–1500. Captions bottom-offset auto-set to 480 to avoid colliding with diagram content.

```json
{
  "type": "diagram",
  "layout": "row",
  "nodes": [
    { "id": "phone",  "label": "Phone",  "icon": "phone",   "x": 180, "y": 860 },
    { "id": "tower",  "label": "Tower",  "icon": "antenna", "x": 540, "y": 760 },
    { "id": "server", "label": "Server", "icon": "server",  "x": 900, "y": 860 }
  ],
  "edges": [
    { "from": "phone", "to": "tower",  "label": "signal", "flow": true },
    { "from": "tower", "to": "server", "label": "data",   "flow": true }
  ],
  "reveal": [
    { "at": 0.0,  "show": ["phone"],                  "caption": "Your phone sends a signal" },
    { "at": 0.35, "show": ["tower"],                  "caption": "Tower relays it" },
    { "at": 0.65, "show": ["server"],                 "caption": "Server responds" },
    { "at": 0.85, "highlight": ["phone", "server"],   "caption": "End-to-end connected" }
  ]
}
```

### Node fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Unique identifier |
| `label` | string | yes | Max 3 words, min 44 px font |
| `icon` | string | no | See icon library below |
| `x`, `y` | number | no | Canvas coords (0–1080, 0–1920). Omit to use `layout` auto-placement |

### Edge fields

| Field | Type | Notes |
|---|---|---|
| `from`, `to` | string | Node ids |
| `label` | string | Short text on the edge (optional) |
| `flow` | boolean | Animated particle travelling along the edge |

### Reveal step fields

| Field | Type | Notes |
|---|---|---|
| `at` | 0.0–1.0 | Fraction of scene duration when step fires |
| `show` | string[] | Node ids to make visible (cumulative) |
| `highlight` | string[] | Node ids to pulse/glow (replaces previous highlight) |
| `caption` | string | Short phrase shown inside diagram area |

### Layout values

- `"row"` — nodes spread horizontally at y=860
- `"column"` — nodes spread vertically at x=540
- `"cycle"` — nodes arranged in a circle, radius auto-sized
- *(omit)* — fallback grid; or use explicit x/y per node

---

## `"steps"` — Numbered step list

Title plus 3–5 steps that appear one by one; current step highlighted in coral. The block is centred vertically in the safe band (y 220–1460); hidden steps keep their space so nothing shifts.

```json
{
  "type": "steps",
  "title": "How WiFi reaches you",
  "steps": [
    "Router gets internet signal",
    "Broadcasts radio waves",
    "Your phone picks it up",
    "You browse the web"
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `title` | string | Large headline at top |
| `steps` | string[] | 3–5 items; each revealed evenly through scene |

---

## `"number"` — Big animated stat

One huge number (count-up or bar fill), unit, label, optional source.

```json
{
  "type": "number",
  "value": 6000000000,
  "unit": "devices",
  "label": "Connected to the internet",
  "source": "Source: GSMA 2024",
  "animation": "countup"
}
```

| Field | Type | Notes |
|---|---|---|
| `value` | number \| string | Numbers (and purely numeric strings like `"12,000"`) count up, formatted K/M/B/T. Any other string (`"7 h 55 min"`, `"U.S. record"`) renders as text, auto-shrunk to fit the width, with a pop-in instead of a count-up |
| `unit` | string | Shown below the number |
| `label` | string | Descriptive line below unit |
| `source` | string | Small attribution text (optional) |
| `animation` | `"countup"` \| `"bar"` | `countup` = animated count from 0; `bar` = horizontal progress bar |

---

## `"compare"` — Two-column A vs B

Two columns with rows revealed progressively; optional winner highlight. Centred vertically in the safe band (y 220–1460).

```json
{
  "type": "compare",
  "colA": "HTTP",
  "colB": "HTTPS",
  "rows": [
    { "a": "No encryption",    "b": "Encrypted" },
    { "a": "Anyone can read",  "b": "Only you & server" },
    { "a": "Port 80",          "b": "Port 443" }
  ],
  "winner": "B"
}
```

| Field | Type | Notes |
|---|---|---|
| `colA`, `colB` | string | Column header labels |
| `rows` | `{a,b}[]` | 2–4 comparison rows |
| `winner` | `"A"` \| `"B"` | Column highlighted with green "✓ Winner" at 88% progress |

---

## `"photo"` — Ken Burns photo with label

Like `"illustration"` but for realistic photos/stills: Ken Burns pan, label chip, optional lower-third credit line.

```json
{
  "type": "photo",
  "still": "ep01-interest-rates-v2/s2.png",
  "label": "Inside a phone charger",
  "lowerThird": "Credit: Getty Images",
  "zoom": [1.04, 1.10]
}
```

| Field | Type | Notes |
|---|---|---|
| `still` | string | Path under `public/` |
| `label` | string | Small dark chip top-left (y≈248, safe zone) |
| `lowerThird` | string | Small muted credit line above captions |
| `zoom` | [number, number] | Ken Burns start/end scale (default `[1.04, 1.12]`) |
| `term` | Term | Optional term sticker (same as `illustration`) |

---

## `"orbit"` — Spacecraft / orbital mechanics

Three sub-modes. Colours (`color`) may be palette keys (`"coral"`, `"mint"`, `"sky"`, `"ink"`, ...) or CSS colours; use palette keys so the profile palette applies. Every mode accepts `reveal[].caption` (headline at the top of the safe area; text before a `:` is shown in coral as a kicker).

### Mode: `"orbit"` (default) — top-down rings

Layout: Earth r = 90 px at (540, 800); rings from `r`; readout panel centred at y ≈ 1205–1335; "not to scale" tag at y ≈ 1362.
**Angles are degrees counter-clockwise, 0 = right, 90 = top; bodies travel CCW (increasing angle), so "behind" = smaller angle.** Keep the action in the upper half (angles ~40–150): side labels have little horizontal room.

```json
{
  "type": "orbit", "mode": "orbit",
  "rings": [ { "id": "iss", "r": 0.635, "main": true }, { "id": "low", "r": 0.565 } ],
  "bodies": [
    { "id": "station", "ring": "iss", "label": "Station", "color": "mint",
      "keyframes": [ { "at": 0, "angle": 55 }, { "at": 1, "angle": 146 } ] },
    { "id": "chaser", "ring": "low", "label": "You", "color": "coral", "trail": true,
      "keyframes": [ { "at": 0, "angle": 19 }, { "at": 0.78, "angle": 123.98 }, { "at": 0.85, "angle": 130.35 },
                     { "at": 0.92, "angle": 130.72 }, { "at": 1, "angle": 135 } ] }
  ],
  "gap": { "body1": "chaser", "body2": "station" },
  "reveal": [
    { "at": 0.0,  "caption": "Lower orbit: shorter laps", "readout": { "label": "Drop about 60 miles", "value": "Gain ≈ 8° per lap" } },
    { "at": 0.66, "highlight": ["chaser"], "caption": "PHASING: closing the gap, lap by lap" },
    { "at": 0.85, "burn": { "body": "chaser", "dir": "prograde" }, "move": { "body": "chaser", "toRing": "iss", "over": 33 },
      "hideGap": true, "caption": "Gap closed: climb back up" }
  ]
}
```

#### Visual fields

| Field | Type | Notes |
|---|---|---|
| `rings` | `OrbitRing[]` | see below |
| `bodies` | `OrbitBody[]` | see below |
| `gap` | `{ body1, body2 }` | Filled translucent coral sector from Earth's centre between the two bodies (out to the outer body's radius) plus a live angle badge (46 px) just outside the ring at the wedge midpoint; the badge is pushed outward only if it would hit a label. |
| `lapSec` | number | Physical mode only: lap period (s) on the first ring. Default 24 |
| `arrows` | `number[]` \| `false` | Angles of direction-of-travel chevrons on the main ring. Default `[215, 270, 325]` |
| `note` | string \| `false` | Small tag under the readout. Default "Not to scale: gap exaggerated" (or "Not to scale" without a gap) |

#### Ring fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Referenced by bodies and move steps |
| `r` | number | `<= 2`: fraction of 480 px (0.635 = 305 px); `> 2`: pixels. Recommended 0.57–0.72 (275–345 px) |
| `main` | boolean | Emphasised ring (solid, 3 px, 50 % ink, carries the chevrons). Default: the first ring |
| `dashed` | boolean | Non-main rings are dashed unless `false` |

#### Body fields

| Field | Type | Notes |
|---|---|---|
| `id`, `ring`, `label` | string | `ring` is the starting ring. Labels 44 px |
| `color` | string | Palette key or CSS colour |
| `keyframes` | `{ at, angle }[]` | **Explicit pacing.** `at` 0–1 of the scene, `angle` unwrapped degrees. Smooth monotone-cubic interpolation (no overshoot, no stops at keys). Overrides physical mode. Keep speeds physically honest: a lower body must move faster, a higher one slower. |
| `startAngle` | number | Physical mode start angle (default 90) |
| `period`, `speedMult` | number | Physical mode overrides. Otherwise angular speed follows the **current** radius (Kepler, T ∝ r^1.5): after a `move` up the body slows, down it speeds up |
| `trail` | boolean | Fading ~50° trail along the body's real recent path (includes ring changes) |
| `labelSide` | `"auto"` \| `"out"` \| `"in"` | Default auto: labels sit outside the ring along the radial direction; if two labels would ever collide during the scene, the inner (or trailing) body's label goes inside the ring for the whole scene (decided once, so no popping) |

#### Reveal step fields

| Field | Type | Notes |
|---|---|---|
| `at` | 0–1 | Fraction of scene duration |
| `show` | string[] | Bodies hidden until a step shows them (fade/scale in) |
| `highlight` | string[] | Pulsing ring (latest fired step wins) |
| `burn` | `{ body, dir? }` | Burn flash + exhaust plume; `dir` `"prograde"` (default, plume behind) or `"retrograde"` |
| `move` | `{ body, toRing, over }` | Ease-in-out glide to `toRing` over `over` frames |
| `hideGap` | boolean | Fade the wedge and badge out (e.g. once the gap is closed) |
| `caption` | string | Headline at the top |
| `readout` | `{ label?, value }` | Panel centred below the diagram |

### Mode: `"cannon"` — Newton's cannon

Planet (r 280 px) centred at (540, 800) with a mountain and cannon on top. Each shot is integrated numerically under inverse-square gravity (velocity Verlet, precomputed); `speed` is a fraction of circular speed at the launch height (1.0 = circular orbit that keeps missing the ground; one lap = 96 frames). Paths that land are dotted with a numbered landing marker; the orbital shot is drawn solid. A legend row per shot appears with its shot (y ≈ 1206).

```json
{
  "type": "orbit", "mode": "cannon",
  "shots": [
    { "speed": 0.55, "label": "Too slow: lands",            "at": 0.08, "color": "coral" },
    { "speed": 0.88, "label": "Faster: lands farther",      "at": 0.24, "color": "sky" },
    { "speed": 1.0,  "label": "Fast enough: keeps missing", "at": 0.42, "color": "mint" }
  ],
  "reveal": [ { "at": 0, "caption": "Throw it sideways from a mountain" }, { "at": 0.62, "caption": "An orbit: falling, but always missing" } ]
}
```

`shots` is optional (defaults shown above).

### Mode: `"groundtrack"` — launch window

Equirectangular strip (lon −140° to −10°, lat ±58°, simplified Americas / West-Africa coastlines, graticule, equator, ±inclination limits). The ground track is computed from the inclination with Earth's rotation: each lap lands `lapShift`° farther **west**. Laps are drawn one after another; the last lap is constructed to pass exactly over `site`, at which point it turns coral, the pad pulses and a green "Launch window" band appears. No "once per orbit" claim is made.

```json
{
  "type": "orbit", "mode": "groundtrack",
  "site": { "lon": -80.6, "lat": 28.5, "label": "Florida pad" },
  "inclination": 51.6, "laps": 3, "lapShift": 23.2,
  "reveal": [
    { "at": 0.0,  "caption": "Earth turns under the station's orbit" },
    { "at": 0.55, "readout": { "value": "Launch when the track sweeps over the pad" } }
  ]
}
```

Timing: earlier laps share 0.04–0.41 of the scene; the final lap runs 0.42–0.72, crossing the pad at a fraction set by the pad's longitude (≈ 0.55 for Florida).

---

## Icon library (`icon` field on diagram nodes)

24 built-in inline SVG icons. Unknown names fall back to a circle with the first letter.

`battery` `bolt` `wifi` `phone` `cloud` `server` `lock` `key` `magnifier` `gear` `chip` `antenna` `satellite` `sun` `thermometer` `coin` `bank` `cart` `truck` `factory` `home` `person` `globe` `arrow`

Usage: `{ "icon": "bolt" }` on a diagram node.

---

## Thumbnail compositions

Register in Remotion Studio as `ThumbYT` (1280×720) and `ThumbCover` (1080×1920).

```json
{
  "title": "How WiFi Works",
  "kicker": "Explained simply",
  "image": "ep01-interest-rates-v2/s2.png",
  "palette": { "bg": "#F7F8FA", "ink": "#1A2332", "sunny": "#1DB8A0", "coral": "#E85B45",
               "sky": "#2986CC", "mint": "#1DB8A0", "grape": "#5A4FCF", "white": "#FFFFFF" },
  "accent": "#E85B45",
  "badge": "HOW IT WORKS"
}
```

Render with:
```sh
npx remotion still src/index.ts ThumbYT    out/thumb-yt.png    --props=props.json
npx remotion still src/index.ts ThumbCover out/thumb-cover.png --props=props.json
```

---

## Profiles

| File | Audience | Font | Background | Captions |
|---|---|---|---|---|
| `explainer-calm.json` | General adult | Poppins | Off-white `#EEF3FA` | clean 62px |
| `explainer-clean.json` | Curious adult | Inter | Off-white `#F7F8FA` | clean 62px |
| `explainer-bold.json` | Techie / business | JetBrains Mono | Dark `#141820` | sticker 80px |
| `explainer-large.json` | Older adult / a11y | Poppins | White `#FFFFFF` | clean 80px |

Pass via `"profile"` key in `props.json`, or load from `config/profiles/<name>.json` with `run.py`.
