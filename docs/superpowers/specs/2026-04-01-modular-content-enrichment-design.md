# Modular Content Enrichment System — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Scope:** Enrichment layer for the generation-worker pipeline

---

## Overview

A modular, plug-and-play enrichment layer that feeds psychological, emotional, persuasion, copywriting, storytelling, visual, and persona signals into the existing generation-worker pipeline. Each module is self-contained with its own knowledge base, produces a typed signal, and integrates via a Signal Bus architecture.

The system targets all supported channels (LinkedIn, Instagram, WhatsApp, Telegram, Gmail) through format-agnostic signals that a channel adapter transforms into platform-specific output.

## Architecture: Signal Bus

```
RequirementReport + Pattern
       |
  Persona Module (runs first)
       |
  [8 enrichment modules run in parallel]
       |
  EnrichmentBundle (all signals merged)
       |
  Creator (4 parallel LLM calls -> 8-12 text variants)
       |
  Selector Stage 1: Rule filter (-> 6-9 variants)
       |
  Selector Stage 2: LLM judge (-> top 4 variants)
       |
  Image Creator (per variant, parallel -> 3-4 candidates each)
       |
  Image Selector (rule + LLM -> top 1-2 per variant)
       |
  Channel Adapter (format for target platform)
       |
  Existing pipeline continues (review, persist, respond)
```

Each module exposes a single `enrich(ctx: ModuleContext) -> Promise<Signal>` function. The orchestrator collects all signals into an `EnrichmentBundle`, which the Creator and Selector consume.

**Key properties:**
- Small context per module (each loads only its own knowledge markdown)
- Plug-and-play (disable any module via config and pipeline still works)
- Modules run in parallel (wall-clock = slowest single module)
- Feature-flagged: `enrichmentEnabled` in `features.yaml` falls back to existing behavior

---

## Module Roster (12 modules)

### Enrichment Modules (signal producers)

#### 1. persona
**Purpose:** Define who we're writing for. Contains a library of pre-built persona profiles and supports custom additions.

**Signal type:** `PersonaSignal`
```typescript
interface PersonaSignal {
  id: string;
  name: string;               // "Startup Founder", "Engineering Manager"
  concerns: string[];          // What keeps them up at night
  ambitions: string[];         // What they're working toward
  currentFocus: string;        // What they're thinking about right now
  habits: string[];            // Content consumption habits
  language: string;            // How they talk (jargon, formality level)
  decisionDrivers: string[];   // What moves them to act
  painPoints: string[];        // Frustrations in their role
}
```

**Knowledge base:**
- `knowledge/persona-framework.md` — How to reason about personas
- `knowledge/personas/startup-founder.md` — Pre-built profile
- `knowledge/personas/engineering-manager.md`
- `knowledge/personas/product-manager.md`
- `knowledge/personas/senior-developer.md`
- `knowledge/personas/_template.md` — Template for adding new ones

**LLM calls:** 0-1 (0 when using a pre-built persona, 1 when generating/adapting one for the topic)

**Persona selection logic:** The `audience` field from RequirementReport is fuzzy-matched against the persona library filenames and `name` fields. If a match is found, the pre-built persona is loaded directly (0 LLM calls). If no match, the persona module makes 1 LLM call to generate a persona from the audience description, using `_template.md` as the structure guide. The request can also pass an explicit `personaId` to force a specific persona.

**Special role:** Runs first. Its output is injected into the ModuleContext for all other modules.

---

#### 2. emotion
**Purpose:** Determine the primary emotion to convey, its intensity, and the emotional arc of the content.

**Signal type:** `EmotionSignal`
```typescript
interface EmotionSignal {
  primaryEmotion: string;      // "curiosity", "urgency", "awe", "frustration"
  secondaryEmotion: string;    // Complementary emotion for depth
  intensity: number;           // 1-10 scale
  arc: string;                 // "tension-to-relief", "curiosity-to-insight", "fear-to-hope"
  emotionalHook: string;       // Specific emotional trigger for the opening
}
```

**Knowledge base:**
- `knowledge/emotion-taxonomy.md` — Core emotions, blends, intensity levels
- `knowledge/emotional-arcs.md` — Story-shaped flows

**LLM calls:** 1

---

#### 3. psychology-deep
**Purpose:** PhD-level behavioral psychology. Maps cognitive biases, Maslow's needs, and motivation theory to content strategy.

**Signal type:** `PsychologySignal`
```typescript
interface PsychologySignal {
  maslowLevel: string;         // Which need level to target: "safety", "belonging", "esteem", "self-actualization"
  primaryBias: string;         // Main cognitive bias to leverage: "loss-aversion", "anchoring", "social-proof"
  secondaryBias: string;       // Supporting bias
  motivationType: string;      // "intrinsic" | "extrinsic"
  behavioralTrigger: string;   // Specific trigger: "fear-of-missing-out", "identity-signaling", "competence-display"
  psychologicalFrame: string;  // How to frame the message for maximum psychological impact
}
```

**Knowledge base:**
- `knowledge/maslows-hierarchy.md` — Need levels with content targeting strategies
- `knowledge/cognitive-biases.md` — 30+ biases with application to content
- `knowledge/behavioral-triggers.md` — Decision-making psychology
- `knowledge/motivation-theory.md` — Self-determination theory, intrinsic vs extrinsic

**LLM calls:** 1

---

#### 4. persuasion
**Purpose:** Select and configure a persuasion framework and sales psychology principles.

**Signal type:** `PersuasionSignal`
```typescript
interface PersuasionSignal {
  framework: string;           // "AIDA", "PAS", "BAB", "4Ps", "Monroe"
  frameworkSteps: string[];    // The steps applied to this specific content
  principles: string[];        // Active Cialdini principles: "reciprocity", "scarcity", etc.
  objectionPreempt: string;    // Anticipated objection and how to handle it
  proofType: string;           // "social-proof", "authority", "data", "analogy"
}
```

**Knowledge base:**
- `knowledge/frameworks.md` — AIDA, PAS, BAB, 4Ps, Monroe's Motivated Sequence
- `knowledge/sales-psychology.md` — Cialdini's 6 principles, objection handling, proof strategies

**LLM calls:** 1

---

#### 5. copywriting
**Purpose:** Craft-level writing signals — hooks, power words, CTAs, readability.

**Signal type:** `CopySignal`
```typescript
interface CopySignal {
  hookType: string;            // "question", "stat", "contrarian", "story-open", "challenge"
  hookExample: string;         // Specific hook line suggestion
  powerWords: string[];        // 3-5 high-impact words to weave in
  ctaStyle: string;            // "engage", "click", "share", "comment", "save"
  ctaPhrase: string;           // Specific CTA suggestion
  readabilityTarget: string;   // "conversational", "punchy", "authoritative"
  sentenceRhythm: string;     // "short-short-long", "long-short-punch"
}
```

**Knowledge base:**
- `knowledge/hooks.md` — Hook types with examples by category
- `knowledge/power-words.md` — Words that drive engagement, categorized
- `knowledge/cta-patterns.md` — CTA frameworks by intent

**LLM calls:** 1

---

#### 6. storytelling
**Purpose:** Narrative structure and story devices for the content.

**Signal type:** `StorySignal`
```typescript
interface StorySignal {
  structure: string;           // "hero-journey", "before-after", "problem-agitate-solve", "in-medias-res"
  protagonist: string;         // Who the story is about: "reader", "author", "third-party"
  devices: string[];           // "anecdote", "metaphor", "contrast", "callback", "cliffhanger"
  tensionPoint: string;        // Where the tension peaks in the narrative
  resolution: string;          // How the story resolves
}
```

**Knowledge base:**
- `knowledge/narrative-structures.md` — Hero's journey, before/after, problem-agitate-solve
- `knowledge/story-devices.md` — Anecdote, metaphor, analogy, contrast, callback

**LLM calls:** 1

---

#### 7. typography
**Purpose:** Platform-native formatting directives.

**Signal type:** `TypographySignal`
```typescript
interface TypographySignal {
  lineBreakStrategy: string;   // "single-idea-per-line", "paragraph-blocks", "mixed"
  whitespaceRatio: string;     // "dense", "airy", "scannable"
  emojiUsage: string;          // "none", "minimal", "moderate", "heavy"
  formattingElements: string[];// "bullet-list", "numbered-list", "bold-emphasis", "line-separator"
  maxLineLength: number;       // Characters per visual line
  fontWeight: string;          // For image overlays: "light", "regular", "bold"
}
```

**Knowledge base:**
- `knowledge/platform-typography.md` — LinkedIn formatting, IG constraints, email typography
- `knowledge/readability-rules.md` — Line length, whitespace, scanability

**LLM calls:** 0 (pure logic based on channel + persona)

---

#### 8. color-emotion
**Purpose:** Map emotions to color palettes for image direction.

**Signal type:** `ColorSignal`
```typescript
interface ColorSignal {
  primaryColor: string;        // Hex code
  secondaryColor: string;      // Hex code
  palette: string[];           // 3-5 color hex codes
  paletteStrategy: string;     // "complementary", "analogous", "monochromatic", "brand-aligned"
  mood: string;                // Color mood: "warm-energetic", "cool-professional", "dark-dramatic"
  contrastLevel: string;       // "high", "medium", "subtle"
}
```

**Knowledge base:**
- `knowledge/color-psychology.md` — Color-emotion mapping, cultural considerations
- `knowledge/palette-strategies.md` — Palette theory with examples

**LLM calls:** 0 (deterministic mapping from EmotionSignal)

**Dependency note:** Color-emotion depends on EmotionSignal. It runs in a second parallel phase: first persona runs alone, then emotion runs with the other modules, then color-emotion runs after emotion completes. In practice, this means the orchestrator runs 3 phases: (1) persona, (2) all modules except color-emotion in parallel, (3) color-emotion using emotion output. Phase 3 is instant since it's pure logic.

---

#### 9. image-strategy
**Purpose:** Visual storytelling direction, composition rules, and search query generation.

**Signal type:** `ImageStrategySignal`
```typescript
interface ImageStrategySignal {
  visualStyle: string;         // "photographic", "illustration", "abstract", "data-viz", "quote-card"
  composition: string;         // "rule-of-thirds", "centered-subject", "negative-space", "text-overlay"
  subjectMatter: string;       // What the image should show
  searchQueries: string[];     // 3-5 stock image search queries
  generationPrompt: string;    // AI image generation prompt if needed
  textOverlayZone: string;     // "top-left", "center", "bottom", "none"
}
```

**Knowledge base:**
- `knowledge/visual-storytelling.md` — Image types that work for each narrative style
- `knowledge/composition-rules.md` — Rule of thirds, focal point, text overlay zones
- `knowledge/search-strategy.md` — Translating emotional intent into search queries

**LLM calls:** 1

---

### Evaluation Modules (scorers)

#### 10. viral-patterns
**Purpose:** Pattern matching against known high-engagement content structures. Provides scoring rubrics to the Selector.

**Signal type:** `ViralPatternSignal`
```typescript
interface ViralPatternSignal {
  matchedPatterns: string[];   // Which viral patterns this content matches
  engagementPredictors: string[]; // "controversial-take", "relatable-struggle", "surprising-data"
  shareabilityScore: number;   // 0-10
  commentBaitScore: number;    // 0-10
  platformAlgoFit: number;     // 0-10 (how well it fits the platform's algorithm)
}
```

**Knowledge base:**
- `knowledge/viral-structures.md` — Proven viral post formats
- `knowledge/engagement-triggers.md` — What makes people comment/share/save
- `knowledge/platform-algorithms.md` — What each platform rewards

**LLM calls:** 1 (scores variants after creation)

---

#### 11. stickiness
**Purpose:** SUCCESs framework scoring. Evaluates how "sticky" (memorable) content is.

**Signal type:** `StickinessSignal`
```typescript
interface StickinessSignal {
  simpleScore: number;         // 0-10: Is the core idea simple?
  unexpectedScore: number;     // 0-10: Does it break expectations?
  concreteScore: number;       // 0-10: Are there sensory, concrete details?
  credibleScore: number;       // 0-10: Is there proof/authority?
  emotionalScore: number;      // 0-10: Does it make you feel something?
  storyScore: number;          // 0-10: Is there a narrative?
  totalScore: number;          // Weighted average
  weakestDimension: string;    // Which S needs the most improvement
  improvementHint: string;     // Specific suggestion to strengthen the weakest dimension
}
```

**Knowledge base:**
- `knowledge/success-framework.md` — SUCCESs model with scoring rubrics and examples

**LLM calls:** 1 (scores variants after creation)

---

### Output Module

#### 12. channel-adapter
**Purpose:** Transforms format-agnostic enrichment signals and text variants into channel-specific formatting.

**Signal type:** `ChannelFormattedOutput`
```typescript
interface ChannelFormattedOutput {
  formattedText: string;       // Platform-ready text with proper formatting
  hashtags: string[];          // Platform-appropriate hashtags (if applicable)
  characterCount: number;      // Final character count
  truncationApplied: boolean;  // Whether text was shortened
  platformNotes: string[];     // Any platform-specific adjustments made
}
```

**Knowledge base:**
- `knowledge/linkedin-rules.md`
- `knowledge/instagram-rules.md`
- `knowledge/email-rules.md`
- `knowledge/whatsapp-rules.md`
- `knowledge/telegram-rules.md`

**LLM calls:** 0 (rule-based formatting transforms)

---

## Shared Types & Orchestrator

### ModuleContext

```typescript
interface ModuleContext {
  report: RequirementReport;
  persona: PersonaSignal | null;  // null only during persona module's own run
  pattern: Pattern;
  channel: string;
  topic: string;
  env: Env;
  llmRef: LlmRef;
}
```

### EnrichmentBundle

```typescript
interface EnrichmentBundle {
  persona: PersonaSignal;
  emotion: EmotionSignal;
  psychology: PsychologySignal;
  persuasion: PersuasionSignal;
  copy: CopySignal;
  story: StorySignal;
  typography: TypographySignal;
  color: ColorSignal;
  imageStrategy: ImageStrategySignal;
}
```

### Module Interface

Every module exports:

```typescript
interface EnrichmentModule<T> {
  name: string;
  enrich(ctx: ModuleContext): Promise<T>;
}
```

### Orchestrator

Located at `modules/_shared/orchestrator.ts`:

1. Builds base `ModuleContext` from RequirementReport + Pattern
2. **Phase 1:** Runs persona module (may fuzzy-match or generate persona)
3. Injects PersonaSignal into context
4. **Phase 2:** Runs 7 enrichment modules in parallel via `Promise.all()` (emotion, psychology, persuasion, copywriting, storytelling, typography, image-strategy)
5. **Phase 3:** Runs color-emotion (pure logic, uses EmotionSignal from phase 2)
6. Returns `EnrichmentBundle`

Each module internally:
1. Reads its knowledge markdown files (loaded once, cached)
2. Builds a focused prompt using knowledge + context
3. Makes 0-1 LLM calls
4. Parses response into typed signal
5. Returns signal

---

## Creator Agent

Located at `modules/_shared/creator.ts` (replaces/wraps existing `players/creator.ts`).

### Input
- `EnrichmentBundle`
- `Pattern` (from existing PatternFinder)
- `RequirementReport`
- Research articles (from existing researcher)
- `ComposableAssets` (brand context, global rules, author profile)

### Process

Generates 8-12 variants across 4 emphasis groups, each via a parallel LLM call:

**Group 1 — Emotion + Storytelling emphasis (2-3 variants):**
Weights emotion arc and narrative structure heavily. Psychology and persuasion are supporting.

**Group 2 — Persuasion + Psychology emphasis (2-3 variants):**
Leads with the persuasion framework. Uses cognitive biases as structural elements.

**Group 3 — Viral + Copywriting emphasis (2-3 variants):**
Optimized for engagement metrics. Hook-driven, punchy, share-optimized.

**Group 4 — Balanced mix (2-3 variants):**
Even weighting across all signals. Often produces the most "natural" sounding content.

Each LLM call receives:
- The pattern outline + writer snippet (from existing system)
- The full EnrichmentBundle signals relevant to its emphasis
- The persona profile
- Research material
- Composable assets
- Channel formatting rules

### Output
Array of `EnrichedTextVariant`:

```typescript
interface EnrichedTextVariant extends TextVariant {
  emphasisGroup: string;       // Which group generated it
  signalWeights: Record<string, number>; // How heavily each signal was weighted
  hookType: string;            // Which hook style was used
  persuasionFramework: string; // Which framework structured the argument
  emotionalArc: string;        // Which emotional arc was applied
}
```

---

## Selector Agent

Located at `modules/_shared/selector.ts`.

### Stage 1: Rule-Based Pre-Filter

Hard constraints that eliminate variants immediately:

| Rule | Threshold |
|------|-----------|
| Character count | Must be within channel max |
| CTA present | Required if CopySignal specified one |
| Hook present | First line must contain a hook element |
| No duplicate hooks | No two variants can start with the same hook type |
| Readability | Flesch-Kincaid grade <= 10 for social, <= 14 for email |
| Required elements | All `mustInclude` items from RequirementReport present |
| Banned elements | No `mustAvoid` items from RequirementReport present |

Typically keeps 6-9 of 8-12 variants.

### Stage 2: LLM-as-Judge Scoring

One LLM call. Evaluates each surviving variant on 4 dimensions:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Stickiness (SUCCESs) | 0.30 | stickiness module rubric |
| Viral potential | 0.30 | viral-patterns module rubric |
| Persona fit | 0.20 | persona module profile |
| Emotional impact | 0.20 | emotion module target |

**Weighted total** = stickiness * 0.3 + viral * 0.3 + persona_fit * 0.2 + emotion * 0.2

Top 4 by weighted score are returned. The LLM also provides a 1-sentence rationale for each score, stored in trace.

### Output
Top 4 `EnrichedTextVariant` with scores attached:

```typescript
interface ScoredVariant extends EnrichedTextVariant {
  scores: {
    stickiness: number;
    viralPotential: number;
    personaFit: number;
    emotionalImpact: number;
    weightedTotal: number;
    rationale: string;
  };
}
```

---

## Image Pipeline (Creator + Selector)

### Image Creator

For each of the top 4 text variants, generates 3-4 image candidates:

**Input:** Text variant + ColorSignal + ImageStrategySignal + TypographySignal
**Process:**
- Generates search queries using image-strategy search-strategy knowledge
- Generates AI image prompts incorporating color palette and composition rules
- Creates text overlay specs if typography signal indicates overlay

**Output per variant:**
```typescript
interface EnrichedImageCandidate extends ImageCandidate {
  colorPalette: string[];
  compositionStyle: string;
  emotionalAlignment: string;
  textOverlaySpec?: {
    zone: string;
    fontWeight: string;
    text: string;
  };
}
```

### Image Selector

**Stage 1 — Rule filter:**
- Resolution meets platform minimums
- Aspect ratio appropriate for channel
- No duplicate search queries across candidates

**Stage 2 — LLM judge (1 call per variant):**
- Visual-text alignment (does image match post content?)
- Emotional match (does image convey the intended emotion?)
- Composition quality (professional, on-brand?)
- Color harmony (matches palette from ColorSignal?)

Returns top 1-2 images per variant.

---

## Pipeline Integration

### Modified `pipeline.ts`

```typescript
export async function runPipeline(req, env, db): Promise<GenerateResponse> {
  // Steps 0-2: Unchanged (RequirementReport, LLM ref, PatternFinder)
  const report = buildRequirementReport(req);
  const llmRef = await resolveGenerationWorkerLlmRef(env, req.llm);
  const repo = loadBundledRepository();
  const finder = await findPattern(repo, report, env, llmRef, req.preferPatternId);
  const pattern = repo.getById(finder.primaryId);

  // Step 3: Research + Enrichment (parallel)
  const [research, enrichmentBundle] = await Promise.all([
    runResearchIfNeeded(req, report, env),       // existing research logic
    runEnrichment(report, pattern, env, llmRef),  // NEW: enrichment orchestrator
  ]);

  // Step 4: Enhanced Creator (uses enrichment bundle)
  const allVariants = await createEnrichedVariants(
    pattern, report, research, enrichmentBundle,
    req.composableAssets ?? EMPTY_ASSETS, env, llmRef
  );

  // Step 5: Selector (rule filter + LLM judge -> top 4)
  const topVariants = await selectTopVariants(allVariants, enrichmentBundle, report, env, llmRef);

  // Step 6: Review (unchanged)
  const review = reviewContent(topVariants, report);

  // Step 7: Enhanced Image Pipeline
  const imageResults = await runImagePipeline(topVariants, enrichmentBundle, pattern, report, env, llmRef);

  // Step 8: Channel Adapter
  const formatted = applyChannelAdapter(topVariants, enrichmentBundle.typography, report.channel);

  // Step 9: Persist (existing D1 insert, enrichmentBundle added to trace JSON)
  await db.prepare(`INSERT INTO generation_runs ...`)
    .bind(runId, ..., JSON.stringify({ ...trace, enrichmentBundle }), 'completed')
    .run();

  return { runId, requirementReport: report, variants: topVariants, imageCandidates, ... };
}
```

### Feature Flag

In `features.yaml`:
```yaml
enrichment: true  # Set false to use legacy creator path
```

When `enrichment: false`, the pipeline uses the existing `createVariants()` directly, skipping all enrichment modules.

---

## Folder Structure (complete)

```
generation-worker/src/modules/
  _shared/
    types.ts              # All signal types, EnrichmentBundle, ModuleContext
    orchestrator.ts       # Runs modules, merges signals
    creator.ts            # Enhanced creator with enrichment bundle
    selector.ts           # Two-stage variant selection
    imageCreator.ts       # Enhanced image candidate generation
    imageSelector.ts      # Two-stage image selection
    knowledgeLoader.ts    # Reads and caches .md files from module knowledge/
  persona/
    index.ts
    types.ts
    knowledge/
      persona-framework.md
      personas/
        startup-founder.md
        engineering-manager.md
        product-manager.md
        senior-developer.md
        _template.md
  emotion/
    index.ts
    types.ts
    knowledge/
      emotion-taxonomy.md
      emotional-arcs.md
  psychology-deep/
    index.ts
    types.ts
    knowledge/
      maslows-hierarchy.md
      cognitive-biases.md
      behavioral-triggers.md
      motivation-theory.md
  persuasion/
    index.ts
    types.ts
    knowledge/
      frameworks.md
      sales-psychology.md
  copywriting/
    index.ts
    types.ts
    knowledge/
      hooks.md
      power-words.md
      cta-patterns.md
  storytelling/
    index.ts
    types.ts
    knowledge/
      narrative-structures.md
      story-devices.md
  typography/
    index.ts
    types.ts
    knowledge/
      platform-typography.md
      readability-rules.md
  color-emotion/
    index.ts
    types.ts
    knowledge/
      color-psychology.md
      palette-strategies.md
  image-strategy/
    index.ts
    types.ts
    knowledge/
      visual-storytelling.md
      composition-rules.md
      search-strategy.md
  viral-patterns/
    index.ts
    types.ts
    knowledge/
      viral-structures.md
      engagement-triggers.md
      platform-algorithms.md
  stickiness/
    index.ts
    types.ts
    knowledge/
      success-framework.md
  channel-adapter/
    index.ts
    types.ts
    knowledge/
      linkedin-rules.md
      instagram-rules.md
      email-rules.md
      whatsapp-rules.md
      telegram-rules.md
```

---

## Context Budget

Each module's LLM call context is kept small by design:

| Module | Knowledge loaded | Estimated tokens |
|--------|-----------------|------------------|
| persona | 1 persona file (~500 words) + framework (~300 words) | ~1,200 |
| emotion | 2 files (~800 words total) | ~1,500 |
| psychology-deep | 4 files (~2,000 words total) | ~3,000 |
| persuasion | 2 files (~1,000 words total) | ~1,800 |
| copywriting | 3 files (~1,200 words total) | ~2,000 |
| storytelling | 2 files (~800 words total) | ~1,500 |
| image-strategy | 3 files (~1,000 words total) | ~1,800 |
| Creator (per group) | Bundle summary (~500 words) + pattern + report | ~2,500 |
| Selector (LLM judge) | Rubrics (~400 words) + variants | ~3,000 |

Typography, color-emotion, and channel-adapter are pure logic (0 LLM calls).

**Total LLM calls per generation:** ~12 (7 enrichment + 4 creator groups + 1 selector judge)
Most run in parallel, so wall-clock time is dominated by the Creator step.

---

## Testing Strategy

Each module is independently testable:
- Unit tests per module: mock `ModuleContext`, verify signal shape
- Integration test for orchestrator: verify all modules produce valid signals
- End-to-end: run full pipeline with enrichment, verify output has scored variants
- Snapshot tests for knowledge loading: ensure .md files parse correctly

Local testing via `wrangler dev` with the existing generation-worker dev server.

---

## Non-Goals (explicitly out of scope)

- Real-time A/B testing against live audiences
- Training a custom ML model for scoring
- Automatic persona generation from LinkedIn profile scraping
- Image generation (only image search queries and prompts — actual generation is external)
- Dashboard UI changes (this is backend/pipeline only)
