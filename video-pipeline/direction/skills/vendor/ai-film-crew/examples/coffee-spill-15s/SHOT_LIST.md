# SHOT LIST — "Not Again" (coffee spill)

**Format:** 9:16 · 15 s · target model: generic (open-weights friendly)
**Input:** *"A barista bumps a customer's elbow and a paper coffee cup slips and spills onto the café floor next to white sneakers, slow motion, handheld close-up, warm morning light."*
That one-line prompt was rerolled 10 times (see `assets/ten-rerolls.png`); the spill barely
happened in any of them. This is the crew's replan.

## Crew notes

**Director**
- LOGLINE: A customer's elbow gets bumped, their coffee hits the floor, and their fresh white sneakers take the splash.
- INTENT: a relatable "of course" moment; laugh, rewatch.
- HOOK (0–1.5 s): ECU of a brimming cup already tipping. Motion from frame 1.
- BEATS: 1) cup tips · 2) splash lands on sneaker · 3) reaction · 4) button: barista slides a new cup into frame
- ENDING: new cup lands where the old one started → loops to S1.

**Production designer — continuity bible**
- C1 `a man in his late 20s, short dark curly hair, light stubble, wearing a faded olive crewneck sweatshirt and light-wash jeans, round tortoiseshell glasses`
- C2 `a barista in her 30s, black hair in a low bun, wearing a mustard-yellow canvas apron over a white t-shirt`
- P1 `a white paper coffee cup, lid off, full to the brim with black coffee`
- P2 `clean white leather low-top sneakers`
- L1 `a small neighborhood café, pale oak counter, polished grey concrete floor, a row of hanging pendant bulbs`
- PALETTE: warm amber, olive, mustard, off-white, concrete grey

**DP / Gaffer**
- Tight, mostly locked-off coverage; physics shots are ECU/CU with simple backgrounds.
- Morning sun through the front window, camera-left, warm ~3200K key vs cool concrete; medium-high contrast; 35mm film look, fine grain.

**Editor**
- 5 shots, 2.0–4.0 s each, generated with ~1 s handles. Hard cuts on motion; S5 composition matches S1 for the loop.
- Caption in edit at 0.3 s: "every. single. time."

**Sound** (added in edit) — café murmur bed; SFX: paper cup tap, splash, sneaker squeak, a deadpan sigh.

**Script supervisor**
- ✅ Original prompt had **two actions fighting** (the bump and the spill) → split into S1 (tip) and S2 (splash).
- ✅ The spill was the **last clause** → it now leads its shot.
- ✅ "slow motion, handheld" on a physics shot → locked-off, 2x slow motion only on S2.
- ⚠️ HIGHEST RISK: S2 (liquid physics). Kept ECU, floor-level, no people in frame.

## Shots

| # | Time | Size · Lens · Move | Action (one) | Gen | Risk |
|---|---|---|---|---|---|
| S1 | 0.0–2.5 | ECU · 100mm macro · locked-off | cup tips off the counter edge | 4 s | med |
| S2 | 2.5–5.5 | ECU · 50mm · locked-off, floor level | coffee splashes across the sneaker toe | 4 s | **high** |
| S3 | 5.5–8.5 | MCU · 50mm · slow push-in | C1 looks down, exhales, closes eyes | 4 s | low |
| S4 | 8.5–11.5 | MS · 35mm · locked-off | C2 winces, covers her mouth | 4 s | low |
| S5 | 11.5–15.0 | CU · 100mm macro · locked-off | a new cup slides into frame and stops | 5 s | low |

## Prompts

### S1
```
Extreme close-up, 100mm macro lens, locked-off camera, on a pale oak café counter edge. A white paper coffee cup, lid off, full to the brim with black coffee, tips over the edge of the counter and starts to fall, coffee sloshing over the rim. Warm morning sunlight from camera-left, deep shadows, shallow depth of field, hanging pendant bulbs blurred in the background. 35mm film look, fine grain. Real-time speed.
```
Negative: `blurry, warped cup, morphing, extra objects, text, logo, watermark, static frame`

### S2
```
Extreme close-up at floor level, 50mm lens, locked-off camera, on clean white leather low-top sneakers standing on a polished grey concrete floor. Black coffee splashes down onto the sneaker toe and spreads across the concrete in a wide splatter, droplets bouncing. 2x slow motion. Warm morning sunlight raking from camera-left, hard highlights on the wet coffee. 35mm film look, fine grain.
```
Negative: `jelly liquid, liquid passing through shoe, extra shoes, feet morphing, text, logo, watermark`

### S3
```
Medium close-up, 50mm lens, slow push-in. A man in his late 20s, short dark curly hair, light stubble, wearing a faded olive crewneck sweatshirt and light-wash jeans, round tortoiseshell glasses, looks down at his feet, exhales slowly and closes his eyes. A small neighborhood café behind him, pale oak counter, hanging pendant bulbs out of focus. Warm morning sunlight from camera-left, visible skin texture, 35mm film look, fine grain. Real-time speed.
```

### S4
```
Medium shot, 35mm lens, locked-off camera. A barista in her 30s, black hair in a low bun, wearing a mustard-yellow canvas apron over a white t-shirt, stands behind a pale oak counter, winces and covers her mouth with one hand. Hanging pendant bulbs above, warm morning sunlight from camera-left, medium-high contrast, 35mm film look, fine grain. Real-time speed.
```

### S5
```
Close-up, 100mm macro lens, locked-off camera, on a pale oak café counter. A hand slides a white paper coffee cup, lid off, full to the brim with black coffee, into frame from the right and stops at the counter edge. Warm morning sunlight from camera-left, shallow depth of field, hanging pendant bulbs blurred behind. 35mm film look, fine grain. Real-time speed.
```

## Reroll plan

| Shot | Likely failure | Change before reroll |
|---|---|---|
| S1 | cup slides instead of tipping | add "tips forward, rim first" |
| S2 | liquid looks like jelly / goes through shoe | drop slow motion to real-time; move camera 20 cm further from the shoe |
| S3 | face drifts from C1 | switch to image-to-video from one C1 still |
| S4 | hand morphs over mouth | change action to "winces and looks away" |
| S5 | hand has extra fingers | frame only the cup; let it slide in without a hand |

**Highest-risk shot:** S2. Liquid hitting a surface is the hardest physics in the video, so it gets the simplest frame and nothing else.

## Result (2026-09-25)

S2 was generated 10 times (Ludyte, 9:16, 5 s, same settings as the original 10 rerolls).
The splash lands on the sneaker in 10/10 takes, versus a barely-there spill in the original
one-line prompt. Remaining issue: in several takes the coffee reads slightly syrupy, so the
next reroll change per the plan is "drop slow motion to real-time". See
`assets/before-after.jpg`.
