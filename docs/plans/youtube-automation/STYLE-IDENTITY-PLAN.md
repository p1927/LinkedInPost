# Per-video visual identity: every explainer gets its own look, chosen from its information

Date: 2026-10-05 · Status: S1 built and verified (details in section 6); S2/S3 planned · Trigger: owner review of ep23 ("all videos look the same, no variation, nothing about colour themes or elements; it must differ per video by the kind of information")
Evidence files (scratch, summarised here): audit of our fixed look, search for skills we missed, 10 explainer style archetypes.

## 1. Why every video looks the same (verified)
- **The look is chosen by audience, not by information.** Each `direction/audiences/*.yaml` names one `remotion_profile`; `run.py` loads it. DESIGN_SYSTEM.md principle 1 says "Audience decides the look, not the topic". 4 audiences, 4 profiles, 2 looks ever shipped (explainer-clean: 12 episodes, storybook-v2: 4). The owner's rule is the reverse: **information decides the look; the audience sets constraints** (readability, tone, motion intensity).
- **Palette precedence:** `PROFILE.palette or ep.style.palette`, so the profile wins and the episode's `style` is mostly ignored; 13 of 19 episodes carry the same cream kids palette that the Director is told to copy.
- **`look` is free text the renderer never reads; `variety()` rotates format, analogy and mode, never the look.**
- **Renderer (2,925 lines):** colours come from 8 palette keys, but 58 `fontSize` literals, 23 `borderRadius`, 10 `boxShadow`, 38 `strokeWidth`, 9 literal `spring()` calls, 28 `rgba()` overlays, flat `pal.bg` in 7 places, 2 caption designs, 2 term designs, one font family list of 4 are hard-coded. Recolouring alone would still look like the same template.
- **Specified but never built:** DESIGN_SYSTEM looks (Ink & Signal, Deep Space ...), type pairings, the `motion` block, "one visual dialect per episode", tokens as a TS module (docs 09/10).
- **No check looks at distinctiveness.** Lint/verify check structure and facts; nothing compares looks across episodes.

## 2. What exists that we missed (verified, with licences)
| Source | Use |
|---|---|
| anthropics/skills `frontend-design`, `canvas-design` (Apache-2.0 per skill) | PORT THE PROCESS: write a named design philosophy first, then critique against a banned-defaults list (cream+serif+terracotta, black+acid green, identical card kit, ALL-CAPS eyebrows, accenting one word, one boldness spent in one place) |
| ui-ux-pro-max (installed, project `.claude/skills/`, git-ignored; MIT upstream, no LICENSE in the installed copy) | USE DATA: styles, palettes, font pairings, chart types, as shortlists the agent mutates; output is web-oriented so it needs mapping to our 8 colour keys |
| LottieFiles/motion-design-skill (MIT) | USE DATA: motion personalities (duration, easing, overshoot, choreography) -> our `motion` tokens |
| julianoczkowski/designer-skills (Apache-2.0) | USE DATA: 8 named aesthetic philosophies (type, colour, layout, motion) |
| digitalsamba/claude-code-video-toolkit `brands/<name>/brand.json` (MIT) | PORT THE SCHEMA: tokens file feeding a ThemeProvider (theirs are hand-authored, ours must be generated) |
| coloraide (MIT) | ADOPT: OKLCH palette rotation and contrast checks |
| Radix Colors, ColorBrewer, Open Color | USE DATA for scales and chart series |
| Our own 10-archetype catalog (`explainer-archetypes` research) | The base catalog: Ledger, Tape, Flat Cosmos, Chalk Proof, Paper Atlas, Archive Ink, Blueprint, ISO Systems, Clinical Clear, Data Poster. Some archetypes are sourced, some are judgement (labelled). Not channel branding, only design logic |
Not adopted: theme-factory (10 fixed themes), brand-guidelines (hard-codes one brand), remotion-dev/skills and vibe-motion (no licence; reference only).

## 3. Design
**Information type -> archetype -> episode identity.** Every audience episode gets an `identity` object in episode.json:
`{archetype, variant:{palette, layout, elements}, palette, fonts{display,body,mono}, shape{radius,border,shadow,stroke}, backdrop, motion{spring,ease,entrance,stagger,transition}, caption, term, illustration_style, seed, rationale}`.
1. **Catalog** `direction/identities/archetypes.yaml`: the 10 archetypes with 2 contrast-checked palettes each, allowed fonts (OFL), backdrop, motion, caption/term variants, element sets, layout variants, avoid list.
2. **Selection** `identity.py`: classify the information type (owner override > `topic_area`/keywords > LLM suggestion), take default or alternate archetype per the decision guide, then **rotate**: never reuse the same (archetype, palette, accent-hue bucket) as the last 5 episodes; accent hue rotates by at least 60 degrees; headline font and layout variant rotate; one transition verb per video.
3. **Art-direction step** before storyboard approval: the identity is shown with its rationale and a critique against the banned-defaults list; owner can override. Applies to the manual path too (`run.py identity <ep>`).
4. **Renderer:** `props.identity` read through a ThemeProvider; scene components read tokens and choose variants. Episodes without `identity` render exactly as today (pixel-identical).
5. **Gates:** `identity_present` (audience episodes), `identity_variety` (triple repeated in last 5), contrast of every text pair, banned-defaults checks (stat-tile share cap, default gradients).
6. **Stills:** the identity's `illustration_style` is written into `style.illustration_style` so generated images match the theme.

## 4. Slices
- **S1 (now):** catalog (10 archetypes), `identity.py` + `run.py identity`, schema + lint, ThemeProvider with palette, fonts, backdrop, caption variants, term variants, springs/easing, shape tokens read by number/compare/steps/diagram/caption components; proof renders of one episode under 4 identities; existing episodes pixel-identical.
- **S2:** new scene primitives the archetypes need (line/bar chart, timeline spine, map, isometric blocks, blueprint draw), so information is shown in its natural form instead of tiles.
- **S3:** Director art-direction step, rotation history, orbit scene tokens, thumbnail/carousel skins, DESIGN_SYSTEM rewrite (information decides the look).

## 5. Honest limits
- Looks derived from channels are design logic, not sourced facts; Veritasium/Wendover/Polymatter/Real Engineering/health/history archetypes are judgement.
- A distinct look will not rescue a bad story (ep23's problem was largely story and order). This plan fixes sameness only; story gates are a separate list (STORYBOARD plan section 11).
- The installed ui-ux-pro-max copy is smaller than upstream and git-ignored; vendor the CSVs we use with attribution rather than depending on `.claude/`.

## 6. S1 result (2026-10-05)
Built: `direction/identities/archetypes.yaml` (10 archetypes, 2 palettes each), `identity.py` (classify, pick with rotation, coloraide palette generation with contrast floors, validate, CLI), schema `identity`, lint rules `identity_present/contrast/banned_default/variety`, Director sets an identity when it saves a draft, `run.py` prefers the identity palette and passes `props.identity`, `selfcheck` guard (catalog contrast at every accent rotation, no repeated look in a 10-episode simulation, catalog fonts present in the renderer registry). Renderer: `identity.tsx` (provider, 24-font registry, 7 backdrops, seeded RNG, custom zoom/cut transitions), caption variants (sticker, clean, mono-bar, serif-lower), term variants (sticker, card, tag, stamp), tokens in Number/Compare/Steps/Diagram scenes (fonts, radius, border, shadow, stroke, spring, entrance, stagger, layout).
Verified: tsc 0 errors; a real ep23 frame without identity is md5-identical to the pre-change baseline (checked twice, by the implementer and independently); a 12-episode finance simulation gives 12 different looks across 3 archetypes with no repeat inside the 5-episode window and every palette passing contrast; 4 test identities render clearly different (montage: scratchpad `identity/montage.png`).
Known gaps: scene COMPOSITIONS are still the same tiles (number over label, two-column compare, numbered list), so two videos differ in theme but not yet in the kind of visual they use; that is S2 (line/bar chart, timeline, map, isometric blocks, blueprint draw, racing bars). OrbitScene, Bridges, PhotoScene, thumbnails and carousel do not read the identity yet; the progress bar and clip scrims are still hard-coded; paper and grain backdrops (full-frame feTurbulence) will slow full renders; the Blueprint compare cell clips long text at its border; accent rotation can still produce muted tones for some hues; no episode has been re-rendered with an identity yet.

