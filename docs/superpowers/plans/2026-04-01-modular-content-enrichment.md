# Modular Content Enrichment System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 12-module enrichment layer that feeds psychological, emotional, persuasion, and visual signals into the existing generation-worker pipeline, producing higher-quality content variants scored by stickiness and viral potential.

**Architecture:** Signal Bus — each module is a self-contained folder with knowledge base markdown files and a single `enrich()` function that produces a typed signal. An orchestrator runs persona first, then 7 modules in parallel, then color-emotion (depends on emotion output). The enriched signals feed a Creator (4 parallel LLM calls producing 8-12 variants) and a Selector (rule filter + LLM judge picking top 4). Feature-flagged via `features.yaml`.

**Tech Stack:** TypeScript, Cloudflare Workers, Zod schemas, existing `generateLlmParsedJson` LLM gateway, `wrangler dev` for local testing.

---

## File Map

### New files to create

```
generation-worker/src/modules/
  _shared/
    types.ts              — All signal interfaces, EnrichmentBundle, ModuleContext, ScoredVariant
    orchestrator.ts       — 3-phase module runner, merges signals
    creator.ts            — 4-group enriched variant generator
    selector.ts           — Rule pre-filter + LLM judge scorer
    knowledgeLoader.ts    — Reads .md files from module knowledge/ dirs at build time
  persona/
    index.ts              — PersonaSignal enrichment (fuzzy match or LLM generate)
    knowledge/
      persona-framework.md
      personas/startup-founder.md
      personas/engineering-manager.md
      personas/product-manager.md
      personas/senior-developer.md
      personas/_template.md
  emotion/
    index.ts              — EmotionSignal enrichment
    knowledge/
      emotion-taxonomy.md
      emotional-arcs.md
  psychology-deep/
    index.ts              — PsychologySignal enrichment
    knowledge/
      maslows-hierarchy.md
      cognitive-biases.md
      behavioral-triggers.md
      motivation-theory.md
  persuasion/
    index.ts              — PersuasionSignal enrichment
    knowledge/
      frameworks.md
      sales-psychology.md
  copywriting/
    index.ts              — CopySignal enrichment
    knowledge/
      hooks.md
      power-words.md
      cta-patterns.md
  storytelling/
    index.ts              — StorySignal enrichment
    knowledge/
      narrative-structures.md
      story-devices.md
  typography/
    index.ts              — TypographySignal (pure logic, no LLM)
    knowledge/
      platform-typography.md
      readability-rules.md
  color-emotion/
    index.ts              — ColorSignal (pure logic from EmotionSignal)
    knowledge/
      color-psychology.md
      palette-strategies.md
  image-strategy/
    index.ts              — ImageStrategySignal enrichment
    knowledge/
      visual-storytelling.md
      composition-rules.md
      search-strategy.md
  viral-patterns/
    index.ts              — ViralPatternSignal scorer
    knowledge/
      viral-structures.md
      engagement-triggers.md
      platform-algorithms.md
  stickiness/
    index.ts              — StickinessSignal scorer
    knowledge/
      success-framework.md
  channel-adapter/
    index.ts              — ChannelFormattedOutput (pure logic)
    knowledge/
      linkedin-rules.md
      instagram-rules.md
      email-rules.md
      whatsapp-rules.md
      telegram-rules.md
```

### Existing files to modify

```
features.yaml                              — Add `enrichment: true`
scripts/generate_features.py               — Add enrichment to DEFAULTS + TS_CONST_NAMES
generation-worker/src/types.ts             — Add EnrichedTextVariant, ScoredVariant, personaId to GenerateRequest
generation-worker/src/pipeline.ts          — Insert enrichment between PatternFinder and Creator
generation-worker/src/players/review.ts    — Accept EnrichedTextVariant[] (backward compatible)
```

---

## Task 1: Feature Flag + Shared Types

**Files:**
- Modify: `features.yaml`
- Modify: `scripts/generate_features.py:23-38`
- Create: `generation-worker/src/modules/_shared/types.ts`
- Modify: `generation-worker/src/types.ts:82-108`

- [ ] **Step 1: Add enrichment feature flag to features.yaml**

Add to `features.yaml`:
```yaml
# Modular content enrichment layer — emotion, psychology, persuasion, etc.
enrichment: true
```

- [ ] **Step 2: Register the flag in generate_features.py**

In `scripts/generate_features.py`, add to `DEFAULTS` dict:
```python
DEFAULTS: dict[str, bool] = {
    'newsResearch': True,
    'campaign': True,
    'multiProviderLlm': False,
    'contentReview': False,
    'contentFlow': False,
    'enrichment': True,
}
```

And add to `TS_CONST_NAMES`:
```python
TS_CONST_NAMES: dict[str, str] = {
    'newsResearch': 'FEATURE_NEWS_RESEARCH',
    'campaign': 'FEATURE_CAMPAIGN',
    'multiProviderLlm': 'FEATURE_MULTI_PROVIDER_LLM',
    'contentReview': 'FEATURE_CONTENT_REVIEW',
    'contentFlow': 'FEATURE_CONTENT_FLOW',
    'enrichment': 'FEATURE_ENRICHMENT',
}
```

- [ ] **Step 3: Regenerate feature TypeScript files**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen && python3 scripts/generate_features.py`
Expected: `Wrote worker/src/generated/features.ts` and `Wrote frontend/src/generated/features.ts`

- [ ] **Step 4: Create the shared types file**

Create `generation-worker/src/modules/_shared/types.ts`:

```typescript
import { z } from 'zod';
import type { LlmRef } from '../../llmFromWorker';
import type { Env, Pattern, RequirementReport, TextVariant } from '../../types';

// ---------------------------------------------------------------------------
// Module Context — passed to every module's enrich() function
// ---------------------------------------------------------------------------
export interface ModuleContext {
  report: RequirementReport;
  persona: PersonaSignal | null;
  pattern: Pattern;
  channel: string;
  topic: string;
  env: Env;
  llmRef: LlmRef;
}

// ---------------------------------------------------------------------------
// Module Interface — every module exports this shape
// ---------------------------------------------------------------------------
export interface EnrichmentModule<T> {
  name: string;
  enrich(ctx: ModuleContext): Promise<T>;
}

// ---------------------------------------------------------------------------
// Signal Types
// ---------------------------------------------------------------------------
export interface PersonaSignal {
  id: string;
  name: string;
  concerns: string[];
  ambitions: string[];
  currentFocus: string;
  habits: string[];
  language: string;
  decisionDrivers: string[];
  painPoints: string[];
}

export interface EmotionSignal {
  primaryEmotion: string;
  secondaryEmotion: string;
  intensity: number;
  arc: string;
  emotionalHook: string;
}

export interface PsychologySignal {
  maslowLevel: string;
  primaryBias: string;
  secondaryBias: string;
  motivationType: string;
  behavioralTrigger: string;
  psychologicalFrame: string;
}

export interface PersuasionSignal {
  framework: string;
  frameworkSteps: string[];
  principles: string[];
  objectionPreempt: string;
  proofType: string;
}

export interface CopySignal {
  hookType: string;
  hookExample: string;
  powerWords: string[];
  ctaStyle: string;
  ctaPhrase: string;
  readabilityTarget: string;
  sentenceRhythm: string;
}

export interface StorySignal {
  structure: string;
  protagonist: string;
  devices: string[];
  tensionPoint: string;
  resolution: string;
}

export interface TypographySignal {
  lineBreakStrategy: string;
  whitespaceRatio: string;
  emojiUsage: string;
  formattingElements: string[];
  maxLineLength: number;
  fontWeight: string;
}

export interface ColorSignal {
  primaryColor: string;
  secondaryColor: string;
  palette: string[];
  paletteStrategy: string;
  mood: string;
  contrastLevel: string;
}

export interface ImageStrategySignal {
  visualStyle: string;
  composition: string;
  subjectMatter: string;
  searchQueries: string[];
  generationPrompt: string;
  textOverlayZone: string;
}

export interface ViralPatternSignal {
  matchedPatterns: string[];
  engagementPredictors: string[];
  shareabilityScore: number;
  commentBaitScore: number;
  platformAlgoFit: number;
}

export interface StickinessSignal {
  simpleScore: number;
  unexpectedScore: number;
  concreteScore: number;
  credibleScore: number;
  emotionalScore: number;
  storyScore: number;
  totalScore: number;
  weakestDimension: string;
  improvementHint: string;
}

export interface ChannelFormattedOutput {
  formattedText: string;
  hashtags: string[];
  characterCount: number;
  truncationApplied: boolean;
  platformNotes: string[];
}

// ---------------------------------------------------------------------------
// Enrichment Bundle — merged output of all enrichment modules
// ---------------------------------------------------------------------------
export interface EnrichmentBundle {
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

// ---------------------------------------------------------------------------
// Enriched Variant Types — output of Creator + Selector
// ---------------------------------------------------------------------------
export interface EnrichedTextVariant extends TextVariant {
  emphasisGroup: string;
  signalWeights: Record<string, number>;
  hookType: string;
  persuasionFramework: string;
  emotionalArc: string;
}

export interface VariantScores {
  stickiness: number;
  viralPotential: number;
  personaFit: number;
  emotionalImpact: number;
  weightedTotal: number;
  rationale: string;
}

export interface ScoredVariant extends EnrichedTextVariant {
  scores: VariantScores;
}
```

- [ ] **Step 5: Add personaId to GenerateRequest schema**

In `generation-worker/src/types.ts`, add `personaId` to `GenerateRequestSchema` (after the `skipImages` field):

```typescript
  personaId: z.string().optional(),
```

And add to the `GenerateRequest` type derivation (it's auto-derived via `z.infer`, so just adding it to the schema is enough).

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add features.yaml scripts/generate_features.py generation-worker/src/modules/_shared/types.ts generation-worker/src/types.ts worker/src/generated/features.ts frontend/src/generated/features.ts
git commit -m "feat: add enrichment feature flag and shared signal types"
```

---

## Task 2: Knowledge Loader

**Files:**
- Create: `generation-worker/src/modules/_shared/knowledgeLoader.ts`

- [ ] **Step 1: Create the knowledge loader**

This module reads `.md` files from each module's `knowledge/` directory. In Cloudflare Workers we cannot read files at runtime, so knowledge is bundled at build time as string imports. We use a simple approach: each module imports its own knowledge as raw strings.

Create `generation-worker/src/modules/_shared/knowledgeLoader.ts`:

```typescript
/**
 * Knowledge loader utility.
 *
 * In Cloudflare Workers we cannot do filesystem reads at runtime.
 * Each module imports its knowledge files as raw string constants at build time.
 * This utility provides a helper to concatenate multiple knowledge sections
 * with clear delimiters, keeping each module's prompt context focused.
 */

export function buildKnowledgeContext(sections: Record<string, string>): string {
  const parts: string[] = [];
  for (const [label, content] of Object.entries(sections)) {
    if (!content.trim()) continue;
    parts.push(`--- ${label} ---\n${content.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * Truncate knowledge to a token budget (rough: 1 token ≈ 4 chars).
 * Keeps the first `maxTokens` worth of characters.
 */
export function truncateKnowledge(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[...truncated to fit context budget]';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add generation-worker/src/modules/_shared/knowledgeLoader.ts
git commit -m "feat: add knowledge loader utility for enrichment modules"
```

---

## Task 3: Persona Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/persona/index.ts`
- Create: `generation-worker/src/modules/persona/knowledge/persona-framework.md`
- Create: `generation-worker/src/modules/persona/knowledge/personas/startup-founder.md`
- Create: `generation-worker/src/modules/persona/knowledge/personas/engineering-manager.md`
- Create: `generation-worker/src/modules/persona/knowledge/personas/product-manager.md`
- Create: `generation-worker/src/modules/persona/knowledge/personas/senior-developer.md`
- Create: `generation-worker/src/modules/persona/knowledge/personas/_template.md`

- [ ] **Step 1: Create persona framework knowledge**

Create `generation-worker/src/modules/persona/knowledge/persona-framework.md`:

```markdown
# Persona Framework

A persona is a detailed profile of a target reader. It captures not just demographics but psychographics — how they think, what they care about, and what drives their decisions.

## Key Dimensions

1. **Concerns** — What keeps them up at night? What are their professional worries?
2. **Ambitions** — What are they working toward? Career goals, impact goals.
3. **Current Focus** — What's top of mind this quarter? What projects/initiatives?
4. **Habits** — How do they consume content? When, where, how often?
5. **Language** — How formal/informal? What jargon do they use? What buzzwords do they avoid?
6. **Decision Drivers** — What makes them act? Data? Social proof? Authority? Urgency?
7. **Pain Points** — What frustrates them in their role? What slows them down?

## Matching Logic

When the audience description from the requirement report matches a known persona:
- Use the pre-built persona directly (fastest, most consistent)
- Adapt specific fields if the topic requires it (e.g., shift currentFocus)

When no match exists:
- Generate a new persona using the template structure
- Ground it in the audience description + topic context
```

- [ ] **Step 2: Create startup-founder persona**

Create `generation-worker/src/modules/persona/knowledge/personas/startup-founder.md`:

```markdown
# Startup Founder

id: startup-founder
name: Startup Founder

## Concerns
- Runway and burn rate
- Finding product-market fit
- Hiring the right early team
- Competing with well-funded incumbents
- Investor relations and fundraising

## Ambitions
- Build a category-defining company
- Achieve sustainable growth
- Create a product people genuinely love
- Build a strong company culture from day one

## Current Focus
- Shipping fast and iterating based on user feedback
- Building systems that scale without over-engineering
- Balancing short-term survival with long-term vision

## Habits
- Scrolls LinkedIn during commute or between meetings
- Values actionable insights over theory
- Shares content that signals builder identity
- Engages with contrarian takes and founder war stories

## Language
- Direct, informal, no corporate jargon
- Uses startup vocabulary: "ship", "iterate", "pivot", "burn rate"
- Prefers concrete examples over abstract frameworks
- Dislikes: buzzwords, vague advice, "thought leadership" fluff

## Decision Drivers
- Social proof from other founders they respect
- Data and concrete results
- Speed and simplicity of implementation
- Risk-aware but action-oriented

## Pain Points
- Information overload with contradictory advice
- Generic business content that doesn't apply to startups
- Time pressure — everything feels urgent
- Loneliness of the founder role
```

- [ ] **Step 3: Create engineering-manager persona**

Create `generation-worker/src/modules/persona/knowledge/personas/engineering-manager.md`:

```markdown
# Engineering Manager

id: engineering-manager
name: Engineering Manager

## Concerns
- Team velocity and delivery predictability
- Retaining top engineering talent
- Balancing technical debt with feature delivery
- Cross-team alignment and dependencies
- Growing engineers while meeting business deadlines

## Ambitions
- Build a high-performing engineering team
- Create systems and processes that scale
- Develop a reputation as a leader who grows people
- Ship impactful products on time

## Current Focus
- Sprint planning and execution
- 1:1s and career development conversations
- Architecture decisions and tech debt prioritization
- Hiring pipeline and interview process improvement

## Habits
- Reads content during morning catch-up or evening wind-down
- Prefers practical how-tos over inspirational content
- Bookmarks and returns to long-form guides
- Shares content that helps their team

## Language
- Technical but accessible — bridges engineering and business
- Uses: "velocity", "throughput", "retro", "trade-off", "scope"
- Comfortable with code examples but thinks in systems
- Dislikes: oversimplified management advice, "just use agile" platitudes

## Decision Drivers
- Evidence from teams of similar size/stage
- Impact on team morale and retention
- Alignment with organizational goals
- Personal experience or trusted peer recommendation

## Pain Points
- Context switching between IC work and management
- Justifying engineering investment to non-technical stakeholders
- Hiring in competitive markets
- Endless meetings that fragment deep work time
```

- [ ] **Step 4: Create product-manager persona**

Create `generation-worker/src/modules/persona/knowledge/personas/product-manager.md`:

```markdown
# Product Manager

id: product-manager
name: Product Manager

## Concerns
- Prioritization — saying no to good ideas
- Aligning stakeholders with conflicting goals
- Measuring the right outcomes, not just outputs
- Understanding users deeply enough to make good bets
- Shipping on time without cutting quality

## Ambitions
- Own a product that meaningfully changes user behavior
- Build strong cross-functional relationships
- Develop product intuition backed by data
- Move into senior/director PM roles

## Current Focus
- Roadmap planning and stakeholder alignment
- User research and customer interviews
- Feature definition and success metrics
- Launch coordination across engineering, design, marketing

## Habits
- Heavy LinkedIn consumer — builds professional brand there
- Reads product blogs, substacks, and case studies
- Engages with frameworks, mental models, and strategy content
- Shares content that demonstrates product thinking

## Language
- Business-meets-technical: "north star metric", "user story", "OKR"
- Frameworks-oriented: "RICE", "ICE", "opportunity solution tree"
- Narrative-driven — tells stories about users and outcomes
- Dislikes: pure engineering jargon, feature lists without context

## Decision Drivers
- User research data and behavioral evidence
- Business impact projections
- Competitive landscape analysis
- Stakeholder buy-in feasibility

## Pain Points
- Responsibility without authority
- Competing priorities from every direction
- Translating user needs into engineering requirements
- Measuring product success beyond vanity metrics
```

- [ ] **Step 5: Create senior-developer persona**

Create `generation-worker/src/modules/persona/knowledge/personas/senior-developer.md`:

```markdown
# Senior Developer

id: senior-developer
name: Senior Developer

## Concerns
- Code quality and maintainability
- Staying current with evolving tech landscape
- Mentoring juniors without losing IC productivity
- Architecture decisions that won't need rewriting in 2 years
- Work-life balance in always-on culture

## Ambitions
- Become a recognized technical authority
- Build systems used by millions
- Contribute to open source or technical community
- Navigate the IC vs management career fork

## Current Focus
- System design and architecture reviews
- Code reviews and mentoring
- Evaluating new tools and frameworks
- Performance optimization and scalability

## Habits
- Scans technical content during breaks
- Values depth and specificity over breadth
- Engages with code examples, benchmarks, architecture diagrams
- Shares content that demonstrates technical mastery

## Language
- Precise, technical, low tolerance for hand-waving
- Uses: "abstraction", "coupling", "latency", "throughput", "DX"
- Appreciates: well-reasoned trade-off analysis
- Dislikes: "10x developer" rhetoric, oversimplified tutorials

## Decision Drivers
- Technical merit and benchmarks
- Long-term maintainability
- Community adoption and ecosystem health
- Personal hands-on experience

## Pain Points
- Meetings that should have been PRs
- Pressure to adopt hype-driven tech
- Legacy code that nobody documented
- Scope creep disguised as "small ask"
```

- [ ] **Step 6: Create persona template**

Create `generation-worker/src/modules/persona/knowledge/personas/_template.md`:

```markdown
# [Persona Name]

id: [kebab-case-id]
name: [Display Name]

## Concerns
- [What keeps them up at night professionally?]
- [What are their biggest worries?]

## Ambitions
- [What are they working toward?]
- [Career and impact goals]

## Current Focus
- [What's top of mind this quarter?]
- [Active projects or initiatives]

## Habits
- [How do they consume content?]
- [When and where do they scroll?]
- [What do they share and why?]

## Language
- [Formality level, jargon preferences]
- [Key vocabulary they use]
- [What language turns them off?]

## Decision Drivers
- [What makes them take action?]
- [Data? Social proof? Authority? Urgency?]

## Pain Points
- [Daily frustrations]
- [What slows them down?]
```

- [ ] **Step 7: Create persona module index.ts**

Create `generation-worker/src/modules/persona/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PersonaSignal } from '../_shared/types';

// -- Knowledge imports (bundled at build time) --------------------------------
import personaFramework from './knowledge/persona-framework.md';
import startupFounder from './knowledge/personas/startup-founder.md';
import engineeringManager from './knowledge/personas/engineering-manager.md';
import productManager from './knowledge/personas/product-manager.md';
import seniorDeveloper from './knowledge/personas/senior-developer.md';
import personaTemplate from './knowledge/personas/_template.md';

// -- Persona library ----------------------------------------------------------
interface PersonaEntry {
  id: string;
  name: string;
  content: string;
}

const PERSONA_LIBRARY: PersonaEntry[] = [
  { id: 'startup-founder', name: 'Startup Founder', content: startupFounder },
  { id: 'engineering-manager', name: 'Engineering Manager', content: engineeringManager },
  { id: 'product-manager', name: 'Product Manager', content: productManager },
  { id: 'senior-developer', name: 'Senior Developer', content: seniorDeveloper },
];

function fuzzyMatch(audience: string): PersonaEntry | null {
  const lower = audience.toLowerCase();
  for (const entry of PERSONA_LIBRARY) {
    const nameWords = entry.name.toLowerCase().split(/\s+/);
    if (nameWords.every((w) => lower.includes(w))) return entry;
    if (lower.includes(entry.id)) return entry;
  }
  // Partial match: any persona keyword in the audience string
  for (const entry of PERSONA_LIBRARY) {
    const keywords = entry.name.toLowerCase().split(/\s+/);
    if (keywords.some((kw) => kw.length > 3 && lower.includes(kw))) return entry;
  }
  return null;
}

function parsePersonaFromMarkdown(content: string, id: string): PersonaSignal {
  const extractList = (section: string): string[] => {
    const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = content.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .filter((l) => l.trim().startsWith('-'))
      .map((l) => l.replace(/^-\s*/, '').trim());
  };

  const nameMatch = content.match(/^# (.+)$/m);
  const name = nameMatch?.[1] ?? id;

  return {
    id,
    name,
    concerns: extractList('Concerns'),
    ambitions: extractList('Ambitions'),
    currentFocus: extractList('Current Focus').join('; '),
    habits: extractList('Habits'),
    language: extractList('Language').join('; '),
    decisionDrivers: extractList('Decision Drivers'),
    painPoints: extractList('Pain Points'),
  };
}

async function generatePersona(ctx: ModuleContext): Promise<PersonaSignal> {
  if (!hasAnyLlmProvider(ctx.env)) {
    return {
      id: 'generated',
      name: ctx.report.audience || 'General Professional',
      concerns: ['professional growth', 'staying relevant'],
      ambitions: ['career advancement'],
      currentFocus: ctx.report.topic,
      habits: ['reads LinkedIn regularly'],
      language: 'professional, moderate formality',
      decisionDrivers: ['relevance', 'practicality'],
      painPoints: ['information overload'],
    };
  }

  const knowledge = buildKnowledgeContext({
    'Persona Framework': personaFramework,
    'Template Structure': personaTemplate,
  });

  const prompt = `You are an audience research specialist. Create a detailed persona profile for the target audience described below.

${knowledge}

TARGET AUDIENCE: ${ctx.report.audience || 'general professionals'}
TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}

Generate a persona profile. Return JSON:
{
  "id": "generated",
  "name": "<persona display name>",
  "concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
  "ambitions": ["<ambition 1>", "<ambition 2>"],
  "currentFocus": "<what they're focused on right now>",
  "habits": ["<content habit 1>", "<content habit 2>"],
  "language": "<how they communicate — formality, jargon, preferences>",
  "decisionDrivers": ["<driver 1>", "<driver 2>"],
  "painPoints": ["<pain 1>", "<pain 2>"]
}`;

  const result = await generateLlmParsedJson<PersonaSignal>(ctx.env, ctx.llmRef, prompt, {
    temperature: 0.5,
    maxOutputTokens: 800,
  });

  return {
    id: result.id ?? 'generated',
    name: result.name ?? ctx.report.audience ?? 'General Professional',
    concerns: Array.isArray(result.concerns) ? result.concerns : [],
    ambitions: Array.isArray(result.ambitions) ? result.ambitions : [],
    currentFocus: result.currentFocus ?? '',
    habits: Array.isArray(result.habits) ? result.habits : [],
    language: result.language ?? '',
    decisionDrivers: Array.isArray(result.decisionDrivers) ? result.decisionDrivers : [],
    painPoints: Array.isArray(result.painPoints) ? result.painPoints : [],
  };
}

export const personaModule: EnrichmentModule<PersonaSignal> = {
  name: 'persona',
  async enrich(ctx: ModuleContext): Promise<PersonaSignal> {
    // 1. Explicit personaId from request — not in ctx but we check report for it
    // The personaId is passed through the report's audience field or a custom field
    const audience = ctx.report.audience ?? '';

    // 2. Try fuzzy match against persona library
    const matched = fuzzyMatch(audience);
    if (matched) {
      return parsePersonaFromMarkdown(matched.content, matched.id);
    }

    // 3. No match — generate via LLM
    return generatePersona(ctx);
  },
};
```

- [ ] **Step 8: Verify TypeScript compiles**

We need to configure Wrangler/TypeScript to handle `.md` file imports. In `generation-worker/tsconfig.json`, the `resolveJsonModule` is already true. For `.md` imports, we need a type declaration.

Create `generation-worker/src/modules/md.d.ts`:

```typescript
declare module '*.md' {
  const content: string;
  export default content;
}
```

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to our changes)

- [ ] **Step 9: Commit**

```bash
git add generation-worker/src/modules/persona/ generation-worker/src/modules/md.d.ts
git commit -m "feat: add persona module with knowledge base and fuzzy matching"
```

---

## Task 4: Emotion Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/emotion/index.ts`
- Create: `generation-worker/src/modules/emotion/knowledge/emotion-taxonomy.md`
- Create: `generation-worker/src/modules/emotion/knowledge/emotional-arcs.md`

- [ ] **Step 1: Create emotion taxonomy knowledge**

Create `generation-worker/src/modules/emotion/knowledge/emotion-taxonomy.md`:

```markdown
# Emotion Taxonomy for Content Creation

## Primary Emotions (high engagement on social platforms)
- **Curiosity** — "I need to know more." Drives clicks, saves, time-on-post.
- **Urgency** — "I need to act now." Drives shares, comments, CTAs.
- **Awe/Inspiration** — "This is bigger than me." Drives shares, saves.
- **Frustration/Anger** — "This isn't right." Drives comments, debates, shares.
- **Fear/Anxiety** — "What if this happens to me?" Drives engagement, saves.
- **Hope/Optimism** — "Things can get better." Drives shares, positive comments.
- **Pride/Validation** — "I knew it / I do this." Drives shares, identity signaling.
- **Surprise** — "I didn't expect that." Drives comments, shares.
- **Empathy/Connection** — "I've been there too." Drives comments, community.
- **FOMO** — "Everyone else knows this." Drives saves, follows.

## Emotion Blends (more nuanced, higher sophistication)
- Bittersweet: sadness + hope (powerful for storytelling)
- Righteous anger: frustration + moral conviction (drives advocacy)
- Nostalgic aspiration: nostalgia + ambition (before/after narratives)
- Competitive curiosity: FOMO + pride (comparison-driven content)

## Intensity Scale (1-10)
- 1-3: Subtle, ambient — good for thought leadership, brand building
- 4-6: Moderate — good for educational content, how-tos
- 7-8: Strong — good for viral content, debates, calls to action
- 9-10: Extreme — use sparingly, risk of seeming manipulative

## Channel-Emotion Fit
- LinkedIn: curiosity (7), pride (6), frustration (5), hope (6) — professional emotions
- Instagram: awe (8), inspiration (7), FOMO (6) — visual/aspirational emotions
- Email: urgency (6), curiosity (7), fear (5) — action-driving emotions
- WhatsApp: surprise (7), empathy (8) — personal/intimate emotions
- Telegram: curiosity (8), urgency (6) — information-seeking emotions
```

- [ ] **Step 2: Create emotional arcs knowledge**

Create `generation-worker/src/modules/emotion/knowledge/emotional-arcs.md`:

```markdown
# Emotional Arcs for Content

An emotional arc is the journey the reader takes from the first line to the last. Great content doesn't maintain a flat emotional state — it moves.

## Arc Types

### tension-to-relief
Start with a problem or discomfort, build tension, then resolve it.
Best for: problem-solution posts, how-to content, case studies.
Hook emotion: frustration or anxiety. Close emotion: relief or satisfaction.

### curiosity-to-insight
Open a knowledge gap, deepen it, then close it with an "aha" moment.
Best for: educational content, surprising data, myth-busting.
Hook emotion: curiosity or confusion. Close emotion: clarity or surprise.

### fear-to-hope
Present a threat or risk, acknowledge its weight, then offer a path forward.
Best for: industry trend warnings, career advice, change management.
Hook emotion: fear or anxiety. Close emotion: hope or empowerment.

### struggle-to-triumph
Share a setback, describe the journey through it, celebrate the outcome.
Best for: personal stories, founder journeys, team achievements.
Hook emotion: empathy. Close emotion: pride or inspiration.

### comfort-to-challenge
Start from a position the reader agrees with, then disrupt it.
Best for: contrarian takes, paradigm shifts, "what if you're wrong" posts.
Hook emotion: agreement/comfort. Close emotion: productive discomfort or curiosity.

### nostalgia-to-action
Recall a past state, contrast with the present, motivate change.
Best for: before/after content, industry evolution, personal growth.
Hook emotion: nostalgia. Close emotion: motivation or urgency.

## Arc Selection Rules
1. Match the arc to the persuasion framework (PAS → tension-to-relief, AIDA → curiosity-to-insight)
2. Match the arc to the persona's decision drivers (data-driven → curiosity-to-insight, emotion-driven → struggle-to-triumph)
3. Consider channel norms (LinkedIn favors curiosity-to-insight, Instagram favors struggle-to-triumph)
```

- [ ] **Step 3: Create emotion module index.ts**

Create `generation-worker/src/modules/emotion/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, EmotionSignal } from '../_shared/types';

import emotionTaxonomy from './knowledge/emotion-taxonomy.md';
import emotionalArcs from './knowledge/emotional-arcs.md';

const DEFAULT_SIGNAL: EmotionSignal = {
  primaryEmotion: 'curiosity',
  secondaryEmotion: 'hope',
  intensity: 5,
  arc: 'curiosity-to-insight',
  emotionalHook: 'Open with a surprising question',
};

export const emotionModule: EnrichmentModule<EmotionSignal> = {
  name: 'emotion',
  async enrich(ctx: ModuleContext): Promise<EmotionSignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const personaContext = ctx.persona
      ? `Target persona: ${ctx.persona.name}. Concerns: ${ctx.persona.concerns.slice(0, 3).join(', ')}. Decision drivers: ${ctx.persona.decisionDrivers.slice(0, 3).join(', ')}.`
      : '';

    const knowledge = buildKnowledgeContext({
      'Emotion Taxonomy': emotionTaxonomy,
      'Emotional Arcs': emotionalArcs,
    });

    const prompt = `You are an emotional intelligence strategist for content. Given the topic, audience, and channel, determine the optimal emotional strategy.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}
AUDIENCE: ${ctx.report.audience || 'general professionals'}
${personaContext}

Return JSON:
{
  "primaryEmotion": "<strongest emotion to evoke>",
  "secondaryEmotion": "<supporting emotion for depth>",
  "intensity": <1-10 number>,
  "arc": "<emotional arc type from the arcs guide>",
  "emotionalHook": "<specific instruction for the opening line's emotional trigger>"
}`;

    try {
      const result = await generateLlmParsedJson<EmotionSignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 400,
      });
      return {
        primaryEmotion: result.primaryEmotion ?? DEFAULT_SIGNAL.primaryEmotion,
        secondaryEmotion: result.secondaryEmotion ?? DEFAULT_SIGNAL.secondaryEmotion,
        intensity: typeof result.intensity === 'number' ? result.intensity : DEFAULT_SIGNAL.intensity,
        arc: result.arc ?? DEFAULT_SIGNAL.arc,
        emotionalHook: result.emotionalHook ?? DEFAULT_SIGNAL.emotionalHook,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add generation-worker/src/modules/emotion/
git commit -m "feat: add emotion module with taxonomy and emotional arcs knowledge"
```

---

## Task 5: Psychology Deep Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/psychology-deep/index.ts`
- Create: `generation-worker/src/modules/psychology-deep/knowledge/maslows-hierarchy.md`
- Create: `generation-worker/src/modules/psychology-deep/knowledge/cognitive-biases.md`
- Create: `generation-worker/src/modules/psychology-deep/knowledge/behavioral-triggers.md`
- Create: `generation-worker/src/modules/psychology-deep/knowledge/motivation-theory.md`

- [ ] **Step 1: Create Maslow's hierarchy knowledge**

Create `generation-worker/src/modules/psychology-deep/knowledge/maslows-hierarchy.md`:

```markdown
# Maslow's Hierarchy of Needs — Content Targeting

## Level 1: Physiological (Survival)
Rarely relevant for professional content. Exception: job loss fears, financial security.
Content angle: "Protect your livelihood"
Trigger: economic downturns, layoff season, industry disruption

## Level 2: Safety (Security)
Job security, financial stability, predictability, risk avoidance.
Content angle: "Secure your position", "Protect yourself from..."
Trigger: change management, compliance, best practices, risk mitigation
Persona fit: risk-averse professionals, mid-career, parents

## Level 3: Belonging (Love/Social)
Team dynamics, mentorship, community, networking, inclusion.
Content angle: "You're not alone in this", "Join the movement"
Trigger: culture content, team building, community stories, shared struggles
Persona fit: new managers, remote workers, career changers

## Level 4: Esteem (Recognition)
Achievement, respect, competence, status, expertise recognition.
Content angle: "Level up", "Stand out", "Be recognized for..."
Trigger: career advancement, skill building, thought leadership, awards
Persona fit: ambitious ICs, aspiring leaders, competitive professionals

## Level 5: Self-Actualization (Growth)
Reaching potential, purpose, creativity, mastery, legacy.
Content angle: "Become who you're meant to be", "Make your dent"
Trigger: vision content, purpose-driven work, creativity, innovation
Persona fit: senior leaders, founders, experts, late-career professionals

## Selection Rules
1. Match need level to persona's primary concerns and ambitions
2. Most LinkedIn content operates at Level 3-4 (belonging and esteem)
3. Higher need levels require more sophisticated storytelling
4. Fear-based content targets Level 2; aspiration targets Level 4-5
5. The most engaging content often bridges two adjacent levels
```

- [ ] **Step 2: Create cognitive biases knowledge**

Create `generation-worker/src/modules/psychology-deep/knowledge/cognitive-biases.md`:

```markdown
# Cognitive Biases for Content Strategy

## High-Impact Biases for Social Content

### Loss Aversion
People feel losses ~2x more than equivalent gains.
Application: Frame benefits as what they'll lose by NOT acting. "Don't miss...", "Stop losing..."
Best for: urgency, CTAs, career/skill content

### Anchoring
First piece of information disproportionately influences judgment.
Application: Lead with a striking number or benchmark. "Most teams spend 40% of time in meetings..."
Best for: data-driven content, comparisons, before/after

### Social Proof
People follow what others do, especially similar others.
Application: "10,000 engineers already use...", "The top 1% of PMs..."
Best for: adoption content, trend pieces, community building

### Authority Bias
People defer to perceived experts.
Application: Cite research, reference known leaders, demonstrate depth.
Best for: thought leadership, educational content, how-tos

### Bandwagon Effect
Desire to align with the majority.
Application: "Everyone is moving to...", "The industry is shifting..."
Best for: trend content, FOMO-driven engagement

### Availability Heuristic
Recent or vivid examples feel more probable.
Application: Use concrete, vivid anecdotes. "Last Tuesday, a deploy brought down..."
Best for: storytelling, cautionary tales, case studies

### Confirmation Bias
People seek information that confirms existing beliefs.
Application: Start by validating what they already believe, then introduce nuance.
Best for: contrarian content (hook with agreement, then challenge)

### Dunning-Kruger Effect
Novices overestimate ability; experts underestimate.
Application: "You might think you know X, but..." — challenges overconfidence gently.
Best for: educational content, myth-busting

### Ikea Effect
People value things they helped build.
Application: Interactive content, "try this exercise", "apply this to your team"
Best for: how-to content, frameworks, worksheets

### Peak-End Rule
Experiences judged by peak moment and end.
Application: Put the strongest insight in the middle and end with a memorable line.
Best for: any content — optimize the peak and the closing

## Bias Selection Rules
1. Choose 1 primary bias and 1 supporting bias per piece of content
2. Primary bias should align with the persuasion framework
3. Supporting bias should reinforce without overwhelming
4. Always ethical: use biases to help readers, not manipulate
```

- [ ] **Step 3: Create behavioral triggers knowledge**

Create `generation-worker/src/modules/psychology-deep/knowledge/behavioral-triggers.md`:

```markdown
# Behavioral Triggers for Content Engagement

## Identity Triggers
People engage with content that reinforces who they are or who they want to be.

- **Identity signaling**: "Share if you're a real engineer" — sharing confirms self-concept
- **Tribal belonging**: "Founders understand this" — creates in-group bonding
- **Competence display**: "If you know, you know" — rewards existing knowledge
- **Aspiration alignment**: Content that shows who they could become

## Social Triggers
- **Reciprocity**: Provide genuine value first; engagement follows naturally
- **Social currency**: Content that makes the sharer look smart/informed
- **Conversation starters**: Posts that give people something to discuss
- **Controversy (mild)**: Respectful disagreement drives comments

## Emotional Triggers
- **Fear of missing out (FOMO)**: Exclusivity, time-limited insights
- **Righteous indignation**: Calling out industry problems
- **Relief/catharsis**: "Finally someone said it"
- **Anticipation**: Teasers, series, "Part 1 of..."

## Cognitive Triggers
- **Knowledge gap**: Open a question, delay the answer
- **Pattern interrupt**: Break expected format or content
- **Concrete specificity**: Exact numbers > vague claims
- **Narrative transportation**: Story pulls them in, drops defenses
```

- [ ] **Step 4: Create motivation theory knowledge**

Create `generation-worker/src/modules/psychology-deep/knowledge/motivation-theory.md`:

```markdown
# Motivation Theory for Content

## Self-Determination Theory (Deci & Ryan)

Three innate psychological needs drive motivation:

### Autonomy
Need to feel in control of actions and decisions.
Content application: "Choose your path", "Here are 3 options", "You decide"
Avoid: prescriptive "you must" language (unless intentional contrast)

### Competence
Need to feel effective and capable.
Content application: Teach something they can immediately use. Show progress.
Best for: tutorials, frameworks, skill-building content

### Relatedness
Need to feel connected to others.
Content application: Shared experiences, community references, "we" language
Best for: culture posts, team stories, industry solidarity

## Intrinsic vs Extrinsic Motivation

### Intrinsic
Driven by internal satisfaction: mastery, curiosity, purpose.
Content that appeals: deep dives, craft-focused, "for the love of building"
Works with: senior professionals, passionate ICs, mission-driven leaders

### Extrinsic
Driven by external rewards: salary, title, recognition.
Content that appeals: career hacks, salary benchmarks, promotion guides
Works with: early/mid career, ambitious climbers, competitive professionals

## Motivation Selection Rules
1. Match to persona's primary ambitions and decision drivers
2. Intrinsic motivation content has longer shelf life but lower initial engagement
3. Extrinsic motivation content drives faster action but may feel transactional
4. The best content bridges both: "Do this because it matters AND it works"
```

- [ ] **Step 5: Create psychology-deep module index.ts**

Create `generation-worker/src/modules/psychology-deep/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PsychologySignal } from '../_shared/types';

import maslowsHierarchy from './knowledge/maslows-hierarchy.md';
import cognitiveBiases from './knowledge/cognitive-biases.md';
import behavioralTriggers from './knowledge/behavioral-triggers.md';
import motivationTheory from './knowledge/motivation-theory.md';

const DEFAULT_SIGNAL: PsychologySignal = {
  maslowLevel: 'esteem',
  primaryBias: 'social-proof',
  secondaryBias: 'authority',
  motivationType: 'intrinsic',
  behavioralTrigger: 'competence-display',
  psychologicalFrame: 'Position as expertise-building opportunity',
};

export const psychologyDeepModule: EnrichmentModule<PsychologySignal> = {
  name: 'psychology-deep',
  async enrich(ctx: ModuleContext): Promise<PsychologySignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}. Concerns: ${ctx.persona.concerns.slice(0, 3).join(', ')}. Ambitions: ${ctx.persona.ambitions.slice(0, 2).join(', ')}. Decision drivers: ${ctx.persona.decisionDrivers.slice(0, 3).join(', ')}. Pain points: ${ctx.persona.painPoints.slice(0, 2).join(', ')}.`
      : '';

    const knowledge = buildKnowledgeContext({
      "Maslow's Hierarchy": maslowsHierarchy,
      'Cognitive Biases': cognitiveBiases,
      'Behavioral Triggers': behavioralTriggers,
      'Motivation Theory': motivationTheory,
    });

    const prompt = `You are a behavioral psychologist specializing in content engagement. Analyze the topic, audience, and channel to determine the optimal psychological strategy.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}
${personaContext}

Select the most effective psychological levers. Return JSON:
{
  "maslowLevel": "<which need level to target: physiological, safety, belonging, esteem, self-actualization>",
  "primaryBias": "<main cognitive bias to leverage>",
  "secondaryBias": "<supporting cognitive bias>",
  "motivationType": "<intrinsic or extrinsic>",
  "behavioralTrigger": "<specific trigger: identity-signaling, fomo, social-currency, knowledge-gap, etc.>",
  "psychologicalFrame": "<1-2 sentence instruction: how to frame the content for maximum psychological impact>"
}`;

    try {
      const result = await generateLlmParsedJson<PsychologySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 500,
      });
      return {
        maslowLevel: result.maslowLevel ?? DEFAULT_SIGNAL.maslowLevel,
        primaryBias: result.primaryBias ?? DEFAULT_SIGNAL.primaryBias,
        secondaryBias: result.secondaryBias ?? DEFAULT_SIGNAL.secondaryBias,
        motivationType: result.motivationType ?? DEFAULT_SIGNAL.motivationType,
        behavioralTrigger: result.behavioralTrigger ?? DEFAULT_SIGNAL.behavioralTrigger,
        psychologicalFrame: result.psychologicalFrame ?? DEFAULT_SIGNAL.psychologicalFrame,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add generation-worker/src/modules/psychology-deep/
git commit -m "feat: add psychology-deep module with Maslow, biases, triggers, and motivation theory"
```

---

## Task 6: Persuasion Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/persuasion/index.ts`
- Create: `generation-worker/src/modules/persuasion/knowledge/frameworks.md`
- Create: `generation-worker/src/modules/persuasion/knowledge/sales-psychology.md`

- [ ] **Step 1: Create persuasion frameworks knowledge**

Create `generation-worker/src/modules/persuasion/knowledge/frameworks.md`:

```markdown
# Persuasion Frameworks

## AIDA — Attention, Interest, Desire, Action
Best for: product launches, feature announcements, career opportunities.
Structure:
1. Attention: Bold claim, surprising stat, or provocative question
2. Interest: Expand with details, benefits, or story
3. Desire: Make them want it — paint the outcome, show social proof
4. Action: Clear CTA — what to do next

## PAS — Problem, Agitate, Solve
Best for: pain-point content, tool recommendations, process improvements.
Structure:
1. Problem: Name the specific pain they're feeling
2. Agitate: Make the pain vivid — show consequences of inaction
3. Solve: Present the solution and how to implement it

## BAB — Before, After, Bridge
Best for: transformation stories, case studies, before/after comparisons.
Structure:
1. Before: Describe the painful current state
2. After: Paint the desirable future state
3. Bridge: Show the path from before to after

## 4Ps — Promise, Picture, Proof, Push
Best for: persuasive arguments, opinion pieces, calls to action.
Structure:
1. Promise: Make a bold promise about what they'll gain
2. Picture: Help them visualize the outcome
3. Proof: Back it up with evidence, data, or examples
4. Push: Gentle but clear push toward action

## Monroe's Motivated Sequence
Best for: longer-form content, change advocacy, leadership content.
Structure:
1. Attention: Grab interest
2. Need: Establish the problem exists and matters
3. Satisfaction: Present your solution
4. Visualization: Show what adopting the solution looks like
5. Action: Tell them what to do

## Framework Selection Rules
1. Short content (< 500 chars): PAS or BAB (3 steps = concise)
2. Medium content (500-1500 chars): AIDA or 4Ps (4 steps = balanced)
3. Long content (1500+ chars): Monroe's (5 steps = thorough)
4. Data-heavy: AIDA (Interest section carries the data)
5. Story-heavy: BAB (natural narrative structure)
6. Problem-focused: PAS (agitation is the engine)
```

- [ ] **Step 2: Create sales psychology knowledge**

Create `generation-worker/src/modules/persuasion/knowledge/sales-psychology.md`:

```markdown
# Sales Psychology Principles

## Cialdini's 6 Principles of Influence

### 1. Reciprocity
Give before you ask. Free value creates obligation.
Application: Lead with actionable insight. The CTA feels earned, not pushy.

### 2. Scarcity
Limited availability increases perceived value.
Application: "Only works if...", time-limited insights, exclusive knowledge.
Caution: Must be genuine — fake scarcity erodes trust.

### 3. Authority
People follow credible experts.
Application: Cite credentials, research, experience. "After 10 years of..."
Works especially well: LinkedIn (professional context amplifies authority).

### 4. Consistency
People act consistently with prior commitments.
Application: Start with micro-agreements. "You probably already know..."
Then escalate: "So the next step is obvious..."

### 5. Liking
People are persuaded by those they like.
Application: Be relatable, show vulnerability, use humor. "I made this mistake too."

### 6. Social Proof
People do what others do.
Application: Numbers, testimonials, trends. "3,000 teams switched to..."
Most versatile principle — works in nearly any content type.

## Objection Preemption
Anticipate the reader's "but..." and address it:
- "You might think this doesn't apply to your industry — here's why it does"
- "I know what you're thinking: 'easier said than done.' Here's the first step"
- Address the objection BEFORE it forms — this is more powerful than answering it after

## Proof Types
- **Data proof**: Statistics, benchmarks, research citations
- **Social proof**: Numbers of users, company logos, peer testimonials
- **Authority proof**: Expert quotes, credentials, publication references
- **Analogical proof**: Comparisons to known successes ("It's like Uber but for...")
- **Personal proof**: "I did this and here's what happened"
```

- [ ] **Step 3: Create persuasion module index.ts**

Create `generation-worker/src/modules/persuasion/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PersuasionSignal } from '../_shared/types';

import frameworks from './knowledge/frameworks.md';
import salesPsychology from './knowledge/sales-psychology.md';

const DEFAULT_SIGNAL: PersuasionSignal = {
  framework: 'PAS',
  frameworkSteps: ['Name the problem', 'Show consequences', 'Present solution'],
  principles: ['reciprocity', 'authority'],
  objectionPreempt: 'Address the "too simple to work" objection with a concrete example',
  proofType: 'social-proof',
};

export const persuasionModule: EnrichmentModule<PersuasionSignal> = {
  name: 'persuasion',
  async enrich(ctx: ModuleContext): Promise<PersuasionSignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}. Decision drivers: ${ctx.persona.decisionDrivers.slice(0, 3).join(', ')}.`
      : '';

    const knowledge = buildKnowledgeContext({
      'Persuasion Frameworks': frameworks,
      'Sales Psychology': salesPsychology,
    });

    const prompt = `You are a persuasion strategist. Select the optimal persuasion framework and principles for this content.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}
CTA: ${ctx.report.cta || 'not specified'}
${personaContext}

Return JSON:
{
  "framework": "<AIDA, PAS, BAB, 4Ps, or Monroe>",
  "frameworkSteps": ["<step 1 applied to this topic>", "<step 2>", "<step 3>"],
  "principles": ["<primary Cialdini principle>", "<secondary principle>"],
  "objectionPreempt": "<anticipated objection and how to handle it>",
  "proofType": "<social-proof, authority, data, analogy, or personal>"
}`;

    try {
      const result = await generateLlmParsedJson<PersuasionSignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 500,
      });
      return {
        framework: result.framework ?? DEFAULT_SIGNAL.framework,
        frameworkSteps: Array.isArray(result.frameworkSteps) ? result.frameworkSteps : DEFAULT_SIGNAL.frameworkSteps,
        principles: Array.isArray(result.principles) ? result.principles : DEFAULT_SIGNAL.principles,
        objectionPreempt: result.objectionPreempt ?? DEFAULT_SIGNAL.objectionPreempt,
        proofType: result.proofType ?? DEFAULT_SIGNAL.proofType,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add generation-worker/src/modules/persuasion/
git commit -m "feat: add persuasion module with frameworks and sales psychology knowledge"
```

---

## Task 7: Copywriting Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/copywriting/index.ts`
- Create: `generation-worker/src/modules/copywriting/knowledge/hooks.md`
- Create: `generation-worker/src/modules/copywriting/knowledge/power-words.md`
- Create: `generation-worker/src/modules/copywriting/knowledge/cta-patterns.md`

- [ ] **Step 1: Create hooks knowledge**

Create `generation-worker/src/modules/copywriting/knowledge/hooks.md`:

```markdown
# Hook Types for Content

## Question Hook
Opens with a question that creates a knowledge gap.
Example: "What if everything you know about productivity is wrong?"
Best for: educational content, myth-busting, curiosity-driven engagement.

## Stat Hook
Leads with a surprising number or data point.
Example: "73% of engineering teams deploy less than once a week."
Best for: data-driven content, industry insights, credibility building.

## Contrarian Hook
Opens with a take that challenges conventional wisdom.
Example: "Stop doing code reviews. Here's what to do instead."
Best for: thought leadership, debate content, high-engagement posts.

## Story-Open Hook
Starts in the middle of a narrative moment.
Example: "The deploy was 30 seconds from going live when my phone rang."
Best for: personal stories, case studies, lessons learned.

## Challenge Hook
Directly challenges the reader's current behavior.
Example: "You're spending 3 hours a day on work that doesn't matter."
Best for: improvement content, productivity, behavior change.

## List/Number Hook
Promises a specific number of items.
Example: "5 things I wish I knew before becoming an engineering manager."
Best for: educational content, tips, listicles.

## Confession Hook
Opens with vulnerability or admission.
Example: "I got fired from my first PM job. Best thing that ever happened."
Best for: personal brand building, trust building, relatability.

## Selection Rules
1. Match hook to emotional arc opening emotion
2. Match hook to persona's content preferences
3. Contrarian hooks work best on LinkedIn (debate drives comments)
4. Story hooks work best for long-form content
5. Stat hooks require credible data — never fabricate
```

- [ ] **Step 2: Create power words knowledge**

Create `generation-worker/src/modules/copywriting/knowledge/power-words.md`:

```markdown
# Power Words by Category

## Urgency
now, immediately, deadline, limited, before, running out, last chance, today

## Curiosity
secret, hidden, revealed, surprising, unexpected, little-known, behind-the-scenes

## Authority
proven, research-backed, expert, data-driven, evidence-based, peer-reviewed

## Exclusivity
insider, elite, few, selected, invitation-only, not everyone

## Emotion
heartbreaking, thrilling, jaw-dropping, game-changing, transformative

## Simplicity
simple, easy, straightforward, step-by-step, quick, effortless

## Results
guaranteed, measurable, trackable, ROI, outcome, impact, doubled, tripled

## Community
together, shared, collective, community, movement, tribe, fellow

## Usage Rules
1. Use 3-5 power words per post — more feels spammy
2. Place at least 1 in the hook line
3. Match power word category to emotional signal
4. Avoid overused buzzwords: "synergy", "leverage", "disrupt" (unless ironic)
5. Power words in questions are extra effective: "What's the secret..."
```

- [ ] **Step 3: Create CTA patterns knowledge**

Create `generation-worker/src/modules/copywriting/knowledge/cta-patterns.md`:

```markdown
# CTA Patterns by Intent

## Engage (drive comments)
- "What's your take?"
- "Agree or disagree?"
- "Drop your experience in the comments"
- "Tag someone who needs to hear this"
Best for: community building, algorithm boost, discussion posts

## Click (drive traffic)
- "Link in comments"
- "Full guide at [link]"
- "DM me 'GUIDE' for the template"
Best for: lead generation, traffic driving, resource sharing

## Share (drive distribution)
- "Repost if this resonated"
- "Save this for later"
- "Share with your team"
Best for: reach expansion, viral content, valuable resources

## Follow (drive audience growth)
- "Follow for more [topic]"
- "I share [frequency] about [topic]"
Best for: audience building, series content, consistent publishers

## None (let content speak)
Sometimes the best CTA is no CTA. When the content is powerful enough, the engagement comes naturally.
Best for: emotional stories, profound insights, highly shareable content

## CTA Selection Rules
1. One CTA per post maximum — multiple CTAs split attention
2. Match CTA to the content's purpose and the persona's action preference
3. LinkedIn algorithm rewards comments > shares > reactions
4. "Soft" CTAs (questions) outperform "hard" CTAs (commands) on professional platforms
5. Place CTA at the end, after delivering value — never before
```

- [ ] **Step 4: Create copywriting module index.ts**

Create `generation-worker/src/modules/copywriting/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, CopySignal } from '../_shared/types';

import hooks from './knowledge/hooks.md';
import powerWords from './knowledge/power-words.md';
import ctaPatterns from './knowledge/cta-patterns.md';

const DEFAULT_SIGNAL: CopySignal = {
  hookType: 'question',
  hookExample: 'Open with a thought-provoking question about the topic',
  powerWords: ['proven', 'simple', 'surprising'],
  ctaStyle: 'engage',
  ctaPhrase: "What's your experience with this?",
  readabilityTarget: 'conversational',
  sentenceRhythm: 'short-short-long',
};

export const copywritingModule: EnrichmentModule<CopySignal> = {
  name: 'copywriting',
  async enrich(ctx: ModuleContext): Promise<CopySignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}. Language: ${ctx.persona.language}. Habits: ${ctx.persona.habits.slice(0, 2).join(', ')}.`
      : '';

    const knowledge = buildKnowledgeContext({
      'Hook Types': hooks,
      'Power Words': powerWords,
      'CTA Patterns': ctaPatterns,
    });

    const prompt = `You are a master copywriter. Select the optimal hook, power words, CTA, and writing style for this content.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}
CTA FROM BRIEF: ${ctx.report.cta || 'not specified'}
${personaContext}

Return JSON:
{
  "hookType": "<question, stat, contrarian, story-open, challenge, list, or confession>",
  "hookExample": "<specific hook line suggestion for this topic>",
  "powerWords": ["<word1>", "<word2>", "<word3>"],
  "ctaStyle": "<engage, click, share, follow, or none>",
  "ctaPhrase": "<specific CTA phrase>",
  "readabilityTarget": "<conversational, punchy, or authoritative>",
  "sentenceRhythm": "<short-short-long, long-short-punch, or varied>"
}`;

    try {
      const result = await generateLlmParsedJson<CopySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.7,
        maxOutputTokens: 500,
      });
      return {
        hookType: result.hookType ?? DEFAULT_SIGNAL.hookType,
        hookExample: result.hookExample ?? DEFAULT_SIGNAL.hookExample,
        powerWords: Array.isArray(result.powerWords) ? result.powerWords : DEFAULT_SIGNAL.powerWords,
        ctaStyle: result.ctaStyle ?? DEFAULT_SIGNAL.ctaStyle,
        ctaPhrase: result.ctaPhrase ?? DEFAULT_SIGNAL.ctaPhrase,
        readabilityTarget: result.readabilityTarget ?? DEFAULT_SIGNAL.readabilityTarget,
        sentenceRhythm: result.sentenceRhythm ?? DEFAULT_SIGNAL.sentenceRhythm,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add generation-worker/src/modules/copywriting/
git commit -m "feat: add copywriting module with hooks, power words, and CTA patterns"
```

---

## Task 8: Storytelling Module + Knowledge Base

**Files:**
- Create: `generation-worker/src/modules/storytelling/index.ts`
- Create: `generation-worker/src/modules/storytelling/knowledge/narrative-structures.md`
- Create: `generation-worker/src/modules/storytelling/knowledge/story-devices.md`

- [ ] **Step 1: Create narrative structures knowledge**

Create `generation-worker/src/modules/storytelling/knowledge/narrative-structures.md`:

```markdown
# Narrative Structures for Short-Form Content

## hero-journey (condensed)
A character faces a challenge, struggles, and emerges transformed.
3-beat version: Challenge → Struggle → Transformation
Best for: personal growth stories, career pivots, lessons learned

## before-after
Contrast two states to show transformation.
2-beat version: Before (pain) → After (gain)
Best for: case studies, product impact, process improvements, skill development

## problem-agitate-solve
Name a problem, make it feel urgent, deliver the solution.
3-beat version: Problem → Agitation → Solution
Best for: thought leadership, advisory content, tool recommendations

## in-medias-res
Start in the middle of the action, then explain context.
3-beat version: Peak moment → Backstory → Resolution
Best for: attention-grabbing stories, dramatic lessons, failure stories

## countdown
Build toward a climax or reveal.
3-beat version: Setup → Rising tension → Payoff
Best for: launch stories, milestone celebrations, surprise insights

## parallel
Run two stories side by side for contrast.
3-beat version: Story A beat → Story B beat → Convergence
Best for: comparison content, choice narratives, two paths diverged

## Selection Rules
1. hero-journey and in-medias-res need a real story — don't fabricate
2. before-after is the most versatile — works for almost any topic
3. problem-agitate-solve maps directly to PAS persuasion framework
4. Short content (< 500 chars): before-after or problem-agitate-solve
5. Medium content (500-1500 chars): any structure works
6. Match to emotional arc: struggle-to-triumph → hero-journey, tension-to-relief → problem-agitate-solve
```

- [ ] **Step 2: Create story devices knowledge**

Create `generation-worker/src/modules/storytelling/knowledge/story-devices.md`:

```markdown
# Story Devices for Content

## Anecdote
A brief, specific real-world story. Most powerful device for social content.
Tip: Name a specific moment, place, or person (with permission).
Example: "In my first sprint as PM, I shipped a feature nobody asked for."

## Metaphor
Compare the topic to something unexpected but illuminating.
Tip: Choose metaphors from domains your persona understands.
Example: "Technical debt is like credit card debt — minimum payments keep you afloat but never free."

## Contrast
Juxtapose two opposing ideas for clarity and impact.
Tip: Use parallel sentence structure for maximum effect.
Example: "Junior developers write code. Senior developers delete code."

## Callback
Reference something from earlier in the content at the end.
Tip: Plant the seed in the hook, harvest in the closing.
Creates: Satisfying closure, feeling of cohesion

## Analogy
Extended comparison that maps one domain onto another.
Tip: Analogies work best when the source domain is simpler than the target.
Example: "Building a startup is like building a plane while flying it."

## Cliffhanger
End a section or post with an unresolved question.
Tip: Use for series content or to drive comments.
Example: "But what happened next changed everything. (More in comments)"

## Specific Detail
Replace generic descriptions with vivid specifics.
Generic: "A lot of teams struggle with this."
Specific: "4 out of 5 teams I've coached hit this wall in month 3."

## Device Selection Rules
1. Every post should use at least 1 device — preferably 2
2. Anecdote + contrast is the highest-impact combination
3. Metaphors should feel natural, not forced
4. Callbacks reward readers who read the whole post
5. Specific details build credibility — always prefer specific over generic
```

- [ ] **Step 3: Create storytelling module index.ts**

Create `generation-worker/src/modules/storytelling/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, StorySignal } from '../_shared/types';

import narrativeStructures from './knowledge/narrative-structures.md';
import storyDevices from './knowledge/story-devices.md';

const DEFAULT_SIGNAL: StorySignal = {
  structure: 'before-after',
  protagonist: 'reader',
  devices: ['contrast', 'specific-detail'],
  tensionPoint: 'The moment the reader recognizes their current pain',
  resolution: 'Clear path forward with actionable next step',
};

export const storytellingModule: EnrichmentModule<StorySignal> = {
  name: 'storytelling',
  async enrich(ctx: ModuleContext): Promise<StorySignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const personaContext = ctx.persona
      ? `Persona: ${ctx.persona.name}. Concerns: ${ctx.persona.concerns.slice(0, 2).join(', ')}.`
      : '';

    const knowledge = buildKnowledgeContext({
      'Narrative Structures': narrativeStructures,
      'Story Devices': storyDevices,
    });

    const prompt = `You are a narrative strategist. Select the optimal story structure and devices for this content.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}
${personaContext}

Return JSON:
{
  "structure": "<hero-journey, before-after, problem-agitate-solve, in-medias-res, countdown, or parallel>",
  "protagonist": "<reader, author, or third-party>",
  "devices": ["<device1>", "<device2>"],
  "tensionPoint": "<where the tension should peak in the narrative>",
  "resolution": "<how the story should resolve>"
}`;

    try {
      const result = await generateLlmParsedJson<StorySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 400,
      });
      return {
        structure: result.structure ?? DEFAULT_SIGNAL.structure,
        protagonist: result.protagonist ?? DEFAULT_SIGNAL.protagonist,
        devices: Array.isArray(result.devices) ? result.devices : DEFAULT_SIGNAL.devices,
        tensionPoint: result.tensionPoint ?? DEFAULT_SIGNAL.tensionPoint,
        resolution: result.resolution ?? DEFAULT_SIGNAL.resolution,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};
```

- [ ] **Step 4: Commit**

```bash
git add generation-worker/src/modules/storytelling/
git commit -m "feat: add storytelling module with narrative structures and story devices"
```

---

## Task 9: Typography + Color-Emotion + Image-Strategy Modules

These three modules are grouped because typography and color-emotion are pure logic (no LLM), and image-strategy follows the same pattern as the LLM modules.

**Files:**
- Create: `generation-worker/src/modules/typography/index.ts`
- Create: `generation-worker/src/modules/typography/knowledge/platform-typography.md`
- Create: `generation-worker/src/modules/typography/knowledge/readability-rules.md`
- Create: `generation-worker/src/modules/color-emotion/index.ts`
- Create: `generation-worker/src/modules/color-emotion/knowledge/color-psychology.md`
- Create: `generation-worker/src/modules/color-emotion/knowledge/palette-strategies.md`
- Create: `generation-worker/src/modules/image-strategy/index.ts`
- Create: `generation-worker/src/modules/image-strategy/knowledge/visual-storytelling.md`
- Create: `generation-worker/src/modules/image-strategy/knowledge/composition-rules.md`
- Create: `generation-worker/src/modules/image-strategy/knowledge/search-strategy.md`

- [ ] **Step 1: Create platform typography knowledge**

Create `generation-worker/src/modules/typography/knowledge/platform-typography.md`:

```markdown
# Platform Typography Rules

## LinkedIn
- Max 3000 characters
- First 2-3 lines visible before "see more" — make them count
- Line breaks create visual breathing room — use generously
- No bold/italic support in posts (only in articles)
- Emojis as bullet points work well (but don't overdo)
- Hashtags at bottom, 3-5 max

## Instagram
- Max 2200 characters for captions
- First line is critical — appears in feed
- Line breaks via empty lines (use period trick if needed)
- Heavy emoji usage is platform-native
- Hashtags: 5-15 in first comment or end of caption

## Email
- Subject line: 40-60 characters
- Preview text: 40-130 characters
- Body: scannable with headers, bullets, short paragraphs
- Bold and italic supported
- CTA as button preferred over text link

## WhatsApp
- Short, conversational messages
- Supports *bold*, _italic_, ~strikethrough~, ```monospace```
- Emoji-heavy is natural
- Line breaks for readability
- Keep under 500 characters for best engagement

## Telegram
- Supports Markdown and HTML formatting
- **Bold**, _italic_, `code`, [links](url)
- Longer content acceptable (information-seeking audience)
- Pin-worthy content gets higher engagement
```

- [ ] **Step 2: Create readability rules knowledge**

Create `generation-worker/src/modules/typography/knowledge/readability-rules.md`:

```markdown
# Readability Rules

## Line Length
- Optimal: 45-75 characters per visual line
- Mobile: shorter lines preferred (40-60 chars)
- One idea per line for social content

## Whitespace
- Dense: paragraph blocks, minimal line breaks (email, long-form)
- Airy: single-line thoughts with breaks between (LinkedIn, social)
- Scannable: mix of short lines and whitespace (all platforms)

## Emoji Usage
- None: formal/serious topics, executive audience
- Minimal: 1-2 emojis as visual anchors, professional tone
- Moderate: emojis as bullet points or section markers
- Heavy: every line has an emoji, casual/fun tone (IG, WhatsApp)

## Formatting Elements
- Bullet lists: good for tips, features, lists of 3-7 items
- Numbered lists: good for steps, processes, rankings
- Bold emphasis: key phrases only (when supported)
- Line separators: "---" or "..." to create visual sections

## Scanability
- Front-load each line with the key word/concept
- Use pattern-interrupt lines (short punch after long setup)
- Create "anchor points" readers can scan to: numbers, emojis, questions
```

- [ ] **Step 3: Create typography module index.ts (pure logic)**

Create `generation-worker/src/modules/typography/index.ts`:

```typescript
import type { EnrichmentModule, ModuleContext, TypographySignal } from '../_shared/types';

const CHANNEL_DEFAULTS: Record<string, TypographySignal> = {
  linkedin: {
    lineBreakStrategy: 'single-idea-per-line',
    whitespaceRatio: 'airy',
    emojiUsage: 'minimal',
    formattingElements: ['line-separator'],
    maxLineLength: 60,
    fontWeight: 'regular',
  },
  instagram: {
    lineBreakStrategy: 'paragraph-blocks',
    whitespaceRatio: 'scannable',
    emojiUsage: 'moderate',
    formattingElements: ['bullet-list'],
    maxLineLength: 50,
    fontWeight: 'bold',
  },
  email: {
    lineBreakStrategy: 'paragraph-blocks',
    whitespaceRatio: 'dense',
    emojiUsage: 'none',
    formattingElements: ['bold-emphasis', 'bullet-list'],
    maxLineLength: 70,
    fontWeight: 'regular',
  },
  gmail: {
    lineBreakStrategy: 'paragraph-blocks',
    whitespaceRatio: 'dense',
    emojiUsage: 'none',
    formattingElements: ['bold-emphasis', 'bullet-list'],
    maxLineLength: 70,
    fontWeight: 'regular',
  },
  whatsapp: {
    lineBreakStrategy: 'single-idea-per-line',
    whitespaceRatio: 'airy',
    emojiUsage: 'heavy',
    formattingElements: ['bold-emphasis'],
    maxLineLength: 45,
    fontWeight: 'regular',
  },
  telegram: {
    lineBreakStrategy: 'mixed',
    whitespaceRatio: 'scannable',
    emojiUsage: 'minimal',
    formattingElements: ['bold-emphasis', 'numbered-list'],
    maxLineLength: 65,
    fontWeight: 'regular',
  },
};

const FALLBACK: TypographySignal = CHANNEL_DEFAULTS['linkedin'];

export const typographyModule: EnrichmentModule<TypographySignal> = {
  name: 'typography',
  async enrich(ctx: ModuleContext): Promise<TypographySignal> {
    const channel = ctx.channel.toLowerCase();
    const base = CHANNEL_DEFAULTS[channel] ?? FALLBACK;

    // Persona-based adjustments
    if (ctx.persona) {
      const lang = ctx.persona.language.toLowerCase();
      if (lang.includes('formal') || lang.includes('precise')) {
        return { ...base, emojiUsage: 'none', whitespaceRatio: 'dense' };
      }
      if (lang.includes('casual') || lang.includes('informal')) {
        return { ...base, emojiUsage: base.emojiUsage === 'none' ? 'minimal' : base.emojiUsage };
      }
    }

    return base;
  },
};
```

- [ ] **Step 4: Create color psychology knowledge**

Create `generation-worker/src/modules/color-emotion/knowledge/color-psychology.md`:

```markdown
# Color-Emotion Mapping

## Primary Colors and Emotions
- **Red** (#E53E3E): Energy, urgency, passion, danger, excitement
- **Blue** (#3182CE): Trust, calm, professionalism, reliability, sadness
- **Green** (#38A169): Growth, health, nature, success, money
- **Yellow** (#D69E2E): Optimism, warning, creativity, happiness, attention
- **Purple** (#805AD5): Luxury, creativity, wisdom, mystery, spirituality
- **Orange** (#DD6B20): Enthusiasm, warmth, friendliness, confidence
- **Black** (#1A202C): Power, elegance, sophistication, authority
- **White** (#FFFFFF): Purity, simplicity, cleanliness, space

## Emotion-to-Color Mapping
- Curiosity → Blue, Purple
- Urgency → Red, Orange
- Awe/Inspiration → Purple, Deep Blue
- Frustration → Red, Dark Orange
- Fear → Dark Blue, Black
- Hope → Green, Light Blue, Yellow
- Pride → Gold (#D4A574), Deep Purple
- Surprise → Yellow, Orange
- Empathy → Warm Blue, Soft Green
- FOMO → Red, Orange, Dark
```

- [ ] **Step 5: Create palette strategies knowledge**

Create `generation-worker/src/modules/color-emotion/knowledge/palette-strategies.md`:

```markdown
# Palette Strategies

## Complementary
Two colors opposite on the wheel. High contrast, vibrant.
Use for: Bold, attention-grabbing visuals.

## Analogous
Three adjacent colors on the wheel. Harmonious, cohesive.
Use for: Professional, calm, trustworthy visuals.

## Monochromatic
Shades and tints of a single color.
Use for: Elegant, focused, minimalist visuals.

## Contrast Levels
- High: dark background + bright accent. Dramatic, attention-grabbing.
- Medium: complementary colors at similar saturation. Balanced, professional.
- Subtle: analogous or monochromatic. Calm, sophisticated.
```

- [ ] **Step 6: Create color-emotion module index.ts (pure logic from EmotionSignal)**

Create `generation-worker/src/modules/color-emotion/index.ts`:

```typescript
import type { ColorSignal, EmotionSignal } from '../_shared/types';

const EMOTION_COLOR_MAP: Record<string, { primary: string; secondary: string; palette: string[]; mood: string }> = {
  curiosity: { primary: '#3182CE', secondary: '#805AD5', palette: ['#3182CE', '#805AD5', '#E2E8F0', '#2D3748', '#63B3ED'], mood: 'cool-professional' },
  urgency: { primary: '#E53E3E', secondary: '#DD6B20', palette: ['#E53E3E', '#DD6B20', '#FFF5F5', '#1A202C', '#FED7D7'], mood: 'warm-energetic' },
  awe: { primary: '#805AD5', secondary: '#3182CE', palette: ['#805AD5', '#3182CE', '#E9D8FD', '#1A202C', '#B794F4'], mood: 'dark-dramatic' },
  inspiration: { primary: '#805AD5', secondary: '#38A169', palette: ['#805AD5', '#38A169', '#E9D8FD', '#F0FFF4', '#B794F4'], mood: 'warm-energetic' },
  frustration: { primary: '#E53E3E', secondary: '#C05621', palette: ['#E53E3E', '#C05621', '#FFF5F5', '#2D3748', '#FC8181'], mood: 'dark-dramatic' },
  anger: { primary: '#C53030', secondary: '#1A202C', palette: ['#C53030', '#1A202C', '#FFF5F5', '#742A2A', '#FEB2B2'], mood: 'dark-dramatic' },
  fear: { primary: '#2D3748', secondary: '#3182CE', palette: ['#2D3748', '#3182CE', '#E2E8F0', '#1A202C', '#4A5568'], mood: 'dark-dramatic' },
  hope: { primary: '#38A169', secondary: '#3182CE', palette: ['#38A169', '#3182CE', '#F0FFF4', '#E2E8F0', '#68D391'], mood: 'cool-professional' },
  optimism: { primary: '#D69E2E', secondary: '#38A169', palette: ['#D69E2E', '#38A169', '#FFFFF0', '#F0FFF4', '#F6E05E'], mood: 'warm-energetic' },
  pride: { primary: '#D4A574', secondary: '#805AD5', palette: ['#D4A574', '#805AD5', '#FFFFF0', '#E9D8FD', '#1A202C'], mood: 'warm-energetic' },
  surprise: { primary: '#D69E2E', secondary: '#DD6B20', palette: ['#D69E2E', '#DD6B20', '#FFFFF0', '#FFFAF0', '#F6E05E'], mood: 'warm-energetic' },
  empathy: { primary: '#4299E1', secondary: '#48BB78', palette: ['#4299E1', '#48BB78', '#EBF8FF', '#F0FFF4', '#90CDF4'], mood: 'cool-professional' },
  fomo: { primary: '#E53E3E', secondary: '#DD6B20', palette: ['#E53E3E', '#DD6B20', '#1A202C', '#FFF5F5', '#FC8181'], mood: 'dark-dramatic' },
};

const DEFAULT_ENTRY = EMOTION_COLOR_MAP['curiosity'];

function intensityToContrast(intensity: number): string {
  if (intensity >= 7) return 'high';
  if (intensity >= 4) return 'medium';
  return 'subtle';
}

function intensityToPaletteStrategy(intensity: number): string {
  if (intensity >= 7) return 'complementary';
  if (intensity >= 4) return 'analogous';
  return 'monochromatic';
}

export function buildColorSignal(emotion: EmotionSignal): ColorSignal {
  const entry = EMOTION_COLOR_MAP[emotion.primaryEmotion.toLowerCase()] ?? DEFAULT_ENTRY;
  return {
    primaryColor: entry.primary,
    secondaryColor: entry.secondary,
    palette: entry.palette,
    paletteStrategy: intensityToPaletteStrategy(emotion.intensity),
    mood: entry.mood,
    contrastLevel: intensityToContrast(emotion.intensity),
  };
}
```

- [ ] **Step 7: Create image strategy knowledge files**

Create `generation-worker/src/modules/image-strategy/knowledge/visual-storytelling.md`:

```markdown
# Visual Storytelling

## Image Types by Narrative Style
- hero-journey: Person facing a challenge, then triumphant. Action shots.
- before-after: Split or contrasting images. Transformation visible.
- problem-agitate-solve: Problem visualization, then solution in action.
- in-medias-res: Dynamic, mid-action shot. Energy and movement.

## Image Types by Channel
- LinkedIn: Professional photography, clean graphics, data visualizations
- Instagram: High-quality photography, vibrant colors, lifestyle
- Email: Clean hero images, product shots, illustrations
- WhatsApp: Simple, clear images that work at small sizes
- Telegram: Informational graphics, charts, clean photos
```

Create `generation-worker/src/modules/image-strategy/knowledge/composition-rules.md`:

```markdown
# Composition Rules

## Rule of Thirds
Place key elements along the grid lines, not center. Creates dynamic tension.
Best for: photography, lifestyle shots, people images.

## Centered Subject
Subject fills the center. Bold, confident, direct.
Best for: quote cards, product shots, portraits.

## Negative Space
Large empty area draws attention to the subject.
Best for: minimalist brand, text overlay, thought leadership.

## Text Overlay Zones
- top-left: works with most compositions, professional feel
- center: maximum impact, needs contrasting background
- bottom: caption-style, works with landscape images
- none: let the image speak, no text overlay
```

Create `generation-worker/src/modules/image-strategy/knowledge/search-strategy.md`:

```markdown
# Image Search Strategy

## Query Construction Rules
1. Start with the subject/concept, not the emotion
2. Add style modifier: "professional", "minimal", "vibrant"
3. Add composition hint: "wide angle", "close up", "flat lay"
4. Avoid overly abstract queries — stock sites need concrete terms

## Query Templates
- Concept + Setting: "team collaboration modern office"
- Concept + Emotion: "developer frustrated laptop"
- Concept + Style: "data analytics minimal clean"
- Metaphor + Literal: "growth plant sprouting concrete"

## AI Generation Prompt Template
"[Style] image of [subject] in [setting], [mood] lighting, [composition], professional quality, [color tones]"
```

- [ ] **Step 8: Create image-strategy module index.ts**

Create `generation-worker/src/modules/image-strategy/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, ImageStrategySignal } from '../_shared/types';

import visualStorytelling from './knowledge/visual-storytelling.md';
import compositionRules from './knowledge/composition-rules.md';
import searchStrategy from './knowledge/search-strategy.md';

const DEFAULT_SIGNAL: ImageStrategySignal = {
  visualStyle: 'photographic',
  composition: 'rule-of-thirds',
  subjectMatter: 'professional context related to topic',
  searchQueries: [],
  generationPrompt: '',
  textOverlayZone: 'none',
};

export const imageStrategyModule: EnrichmentModule<ImageStrategySignal> = {
  name: 'image-strategy',
  async enrich(ctx: ModuleContext): Promise<ImageStrategySignal> {
    if (!hasAnyLlmProvider(ctx.env)) {
      return { ...DEFAULT_SIGNAL, searchQueries: [ctx.topic] };
    }

    const knowledge = buildKnowledgeContext({
      'Visual Storytelling': visualStorytelling,
      'Composition Rules': compositionRules,
      'Search Strategy': searchStrategy,
    });

    const prompt = `You are a visual content strategist. Determine the image strategy for this content.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}

Return JSON:
{
  "visualStyle": "<photographic, illustration, abstract, data-viz, or quote-card>",
  "composition": "<rule-of-thirds, centered-subject, negative-space, or text-overlay>",
  "subjectMatter": "<what the image should depict>",
  "searchQueries": ["<query1>", "<query2>", "<query3>"],
  "generationPrompt": "<AI image generation prompt>",
  "textOverlayZone": "<top-left, center, bottom, or none>"
}`;

    try {
      const result = await generateLlmParsedJson<ImageStrategySignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.6,
        maxOutputTokens: 500,
      });
      return {
        visualStyle: result.visualStyle ?? DEFAULT_SIGNAL.visualStyle,
        composition: result.composition ?? DEFAULT_SIGNAL.composition,
        subjectMatter: result.subjectMatter ?? DEFAULT_SIGNAL.subjectMatter,
        searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : [ctx.topic],
        generationPrompt: result.generationPrompt ?? '',
        textOverlayZone: result.textOverlayZone ?? DEFAULT_SIGNAL.textOverlayZone,
      };
    } catch {
      return { ...DEFAULT_SIGNAL, searchQueries: [ctx.topic] };
    }
  },
};
```

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 10: Commit**

```bash
git add generation-worker/src/modules/typography/ generation-worker/src/modules/color-emotion/ generation-worker/src/modules/image-strategy/
git commit -m "feat: add typography, color-emotion, and image-strategy modules"
```

---

## Task 10: Viral Patterns + Stickiness + Channel Adapter Modules

**Files:**
- Create: `generation-worker/src/modules/viral-patterns/index.ts`
- Create: `generation-worker/src/modules/viral-patterns/knowledge/viral-structures.md`
- Create: `generation-worker/src/modules/viral-patterns/knowledge/engagement-triggers.md`
- Create: `generation-worker/src/modules/viral-patterns/knowledge/platform-algorithms.md`
- Create: `generation-worker/src/modules/stickiness/index.ts`
- Create: `generation-worker/src/modules/stickiness/knowledge/success-framework.md`
- Create: `generation-worker/src/modules/channel-adapter/index.ts`
- Create: `generation-worker/src/modules/channel-adapter/knowledge/linkedin-rules.md`
- Create: `generation-worker/src/modules/channel-adapter/knowledge/instagram-rules.md`
- Create: `generation-worker/src/modules/channel-adapter/knowledge/email-rules.md`
- Create: `generation-worker/src/modules/channel-adapter/knowledge/whatsapp-rules.md`
- Create: `generation-worker/src/modules/channel-adapter/knowledge/telegram-rules.md`

- [ ] **Step 1: Create viral patterns knowledge files**

Create `generation-worker/src/modules/viral-patterns/knowledge/viral-structures.md`:

```markdown
# Viral Post Structures

## The Contrarian Take
"Everyone says X. Here's why they're wrong."
Engagement driver: debate and polarization. Comment-heavy.

## The Relatable Struggle
"Nobody talks about how hard X is."
Engagement driver: "me too" solidarity. Share-heavy.

## The Surprising Data
"I analyzed 1000 X. Here's what I found."
Engagement driver: curiosity and social currency. Save-heavy.

## The Humble Brag Story
"I failed at X. Then Y happened."
Engagement driver: narrative arc and aspiration.

## The Hot Take
"Unpopular opinion: X."
Engagement driver: identity signaling and debate.

## The Listicle
"7 things I wish I knew about X."
Engagement driver: scanability and completeness.

## The Before/After
"2 years ago I did X. Now I do Y. Here's what changed."
Engagement driver: transformation proof and hope.
```

Create `generation-worker/src/modules/viral-patterns/knowledge/engagement-triggers.md`:

```markdown
# Engagement Triggers

## Comment Triggers
- Ask a direct question
- Present a controversial opinion
- Leave something incomplete ("What would you add?")
- Challenge the reader's assumptions

## Share Triggers
- Provide actionable value (checklists, frameworks)
- Validate the reader's identity ("Share if you're a real X")
- Create social currency (share = look smart)
- Emotional resonance (share = express feelings)

## Save Triggers
- Reference material (lists, guides, templates)
- Complex information worth revisiting
- Aspirational content to return to later
```

Create `generation-worker/src/modules/viral-patterns/knowledge/platform-algorithms.md`:

```markdown
# Platform Algorithm Signals

## LinkedIn
- Dwell time: longer reads signal quality
- Comments > shares > reactions (weighted)
- Early engagement (first 60 min) critical
- Native content preferred over links
- Personal stories outperform corporate content

## Instagram
- Save rate is the strongest signal
- Shares via DM heavily weighted
- Caption engagement (read more clicks)
- Hashtag relevance and freshness

## Email
- Open rate driven by subject line
- Click rate driven by CTA clarity
- Reply rate signals high engagement
- Unsubscribe rate is negative signal

## WhatsApp/Telegram
- Forward rate is the primary metric
- Message saves/stars
- Reply engagement
```

- [ ] **Step 2: Create viral-patterns module index.ts**

This module provides scoring rubrics for the Selector. It exports both a signal (for pre-creation guidance) and a scoring function (for post-creation evaluation).

Create `generation-worker/src/modules/viral-patterns/index.ts`:

```typescript
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, ViralPatternSignal } from '../_shared/types';

import viralStructures from './knowledge/viral-structures.md';
import engagementTriggers from './knowledge/engagement-triggers.md';
import platformAlgorithms from './knowledge/platform-algorithms.md';

const DEFAULT_SIGNAL: ViralPatternSignal = {
  matchedPatterns: ['relatable-struggle'],
  engagementPredictors: ['direct-question'],
  shareabilityScore: 5,
  commentBaitScore: 5,
  platformAlgoFit: 5,
};

export const viralPatternsModule: EnrichmentModule<ViralPatternSignal> = {
  name: 'viral-patterns',
  async enrich(ctx: ModuleContext): Promise<ViralPatternSignal> {
    if (!hasAnyLlmProvider(ctx.env)) return DEFAULT_SIGNAL;

    const knowledge = buildKnowledgeContext({
      'Viral Structures': viralStructures,
      'Engagement Triggers': engagementTriggers,
      'Platform Algorithms': platformAlgorithms,
    });

    const prompt = `You are a viral content strategist. Analyze the topic and channel to determine viral potential strategies.

${knowledge}

TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}
TONE: ${ctx.report.tone || 'professional'}

Return JSON:
{
  "matchedPatterns": ["<which viral structures fit this topic>"],
  "engagementPredictors": ["<which triggers should be activated>"],
  "shareabilityScore": <0-10>,
  "commentBaitScore": <0-10>,
  "platformAlgoFit": <0-10>
}`;

    try {
      const result = await generateLlmParsedJson<ViralPatternSignal>(ctx.env, ctx.llmRef, prompt, {
        temperature: 0.5,
        maxOutputTokens: 400,
      });
      return {
        matchedPatterns: Array.isArray(result.matchedPatterns) ? result.matchedPatterns : DEFAULT_SIGNAL.matchedPatterns,
        engagementPredictors: Array.isArray(result.engagementPredictors) ? result.engagementPredictors : DEFAULT_SIGNAL.engagementPredictors,
        shareabilityScore: typeof result.shareabilityScore === 'number' ? result.shareabilityScore : 5,
        commentBaitScore: typeof result.commentBaitScore === 'number' ? result.commentBaitScore : 5,
        platformAlgoFit: typeof result.platformAlgoFit === 'number' ? result.platformAlgoFit : 5,
      };
    } catch {
      return DEFAULT_SIGNAL;
    }
  },
};

/** Knowledge export for the Selector's LLM judge prompt */
export { viralStructures, engagementTriggers, platformAlgorithms };
```

- [ ] **Step 3: Create stickiness knowledge and module**

Create `generation-worker/src/modules/stickiness/knowledge/success-framework.md`:

```markdown
# SUCCESs Framework — Sticky Content Scoring

Based on "Made to Stick" by Chip and Dan Heath.

## S — Simple
Is the core idea stripped to its essential message?
Score 10: One clear takeaway anyone can repeat.
Score 5: Clear message but multiple competing ideas.
Score 1: Unfocused, no clear takeaway.

## U — Unexpected
Does it break a pattern or violate expectations?
Score 10: Genuinely surprising insight or counterintuitive claim.
Score 5: Mildly interesting angle on a known topic.
Score 1: Completely predictable, nothing new.

## C — Concrete
Are there sensory, specific details?
Score 10: Specific numbers, names, vivid scenes, tangible examples.
Score 5: Some specifics but also vague generalities.
Score 1: All abstract, no concrete anchors.

## C — Credible
Is there proof or authority?
Score 10: Data, research, personal experience, or expert citation.
Score 5: Implied authority but no explicit proof.
Score 1: Unsubstantiated claims.

## E — Emotional
Does it make you feel something?
Score 10: Strong emotional reaction (inspiration, outrage, empathy).
Score 5: Mild emotional engagement.
Score 1: Dry, no emotional connection.

## S — Stories
Is there a narrative?
Score 10: Complete story arc with character, conflict, resolution.
Score 5: Anecdote or example but not a full story.
Score 1: Pure information, no narrative element.

## Scoring Guide
- Total = average of all 6 dimensions
- Weakest dimension is the biggest opportunity for improvement
- Score >= 7: likely to be memorable and shared
- Score 5-7: solid but forgettable
- Score < 5: needs significant rework
```

Create `generation-worker/src/modules/stickiness/index.ts`:

```typescript
import type { EnrichmentModule, ModuleContext, StickinessSignal } from '../_shared/types';

const DEFAULT_SIGNAL: StickinessSignal = {
  simpleScore: 5,
  unexpectedScore: 5,
  concreteScore: 5,
  credibleScore: 5,
  emotionalScore: 5,
  storyScore: 5,
  totalScore: 5,
  weakestDimension: 'unexpected',
  improvementHint: 'Add a surprising element or counterintuitive claim',
};

/** Stickiness module provides the scoring framework.
 *  Pre-creation: returns default signals (scoring happens post-creation in the Selector).
 *  The knowledge is exported for the Selector's LLM judge to use. */
export const stickinessModule: EnrichmentModule<StickinessSignal> = {
  name: 'stickiness',
  async enrich(_ctx: ModuleContext): Promise<StickinessSignal> {
    // Stickiness scoring is done post-creation by the Selector.
    // This module exists to provide the framework and default signal.
    return DEFAULT_SIGNAL;
  },
};

export { default as successFramework } from './knowledge/success-framework.md';
```

- [ ] **Step 4: Create channel adapter knowledge files**

Create `generation-worker/src/modules/channel-adapter/knowledge/linkedin-rules.md`:
```markdown
# LinkedIn Formatting Rules
- Max 3000 characters
- Line breaks for readability (generous whitespace)
- 3-5 hashtags at bottom
- No link in body (kills reach) — put in comments
- First 2-3 lines are hook (before "see more")
- No markdown formatting supported
```

Create `generation-worker/src/modules/channel-adapter/knowledge/instagram-rules.md`:
```markdown
# Instagram Formatting Rules
- Max 2200 characters for captions
- First line visible in feed — make it count
- 5-15 hashtags (first comment or end)
- Emoji-friendly platform
- Line breaks via empty lines
```

Create `generation-worker/src/modules/channel-adapter/knowledge/email-rules.md`:
```markdown
# Email Formatting Rules
- Subject line: 40-60 characters
- Preview text: 40-130 characters
- Short paragraphs, scannable with headers
- Clear single CTA
- Plain text fallback important
```

Create `generation-worker/src/modules/channel-adapter/knowledge/whatsapp-rules.md`:
```markdown
# WhatsApp Formatting Rules
- Keep under 500 characters for best engagement
- Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
- Emoji-heavy is natural
- Conversational tone expected
- Forward-friendly formatting
```

Create `generation-worker/src/modules/channel-adapter/knowledge/telegram-rules.md`:
```markdown
# Telegram Formatting Rules
- Supports Markdown and HTML
- Longer content acceptable
- Bold, italic, code, links supported
- Information-dense audience
- Pin-worthy content gets higher engagement
```

- [ ] **Step 5: Create channel-adapter module index.ts (pure logic)**

Create `generation-worker/src/modules/channel-adapter/index.ts`:

```typescript
import type { ChannelFormattedOutput, TypographySignal } from '../_shared/types';
import type { TextVariant } from '../../types';

const CHANNEL_LIMITS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 5000,
  gmail: 5000,
  whatsapp: 500,
  telegram: 4096,
};

const CHANNEL_HASHTAG_COUNTS: Record<string, number> = {
  linkedin: 4,
  instagram: 10,
  email: 0,
  gmail: 0,
  whatsapp: 0,
  telegram: 0,
};

function extractHashtags(text: string, maxCount: number): { cleanText: string; hashtags: string[] } {
  if (maxCount === 0) return { cleanText: text, hashtags: [] };
  const hashtagRegex = /#\w+/g;
  const found = text.match(hashtagRegex) ?? [];
  const hashtags = found.slice(0, maxCount);
  const cleanText = text.replace(hashtagRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, hashtags };
}

export function formatForChannel(
  variant: TextVariant,
  typography: TypographySignal,
  channel: string,
): ChannelFormattedOutput {
  const limit = CHANNEL_LIMITS[channel.toLowerCase()] ?? 3000;
  const maxHashtags = CHANNEL_HASHTAG_COUNTS[channel.toLowerCase()] ?? 0;

  let text = variant.text;
  const notes: string[] = [];

  // Apply typography directives
  if (typography.lineBreakStrategy === 'single-idea-per-line') {
    // Ensure sentences get their own lines
    text = text.replace(/\. ([A-Z])/g, '.\n\n$1');
  }

  // Extract and re-append hashtags
  const { cleanText, hashtags } = extractHashtags(text, maxHashtags);
  text = cleanText;

  // Truncate if needed
  let truncated = false;
  const hashtagSuffix = hashtags.length ? '\n\n' + hashtags.join(' ') : '';
  if (text.length + hashtagSuffix.length > limit) {
    text = text.slice(0, limit - hashtagSuffix.length - 3) + '...';
    truncated = true;
    notes.push(`Truncated to ${limit} characters`);
  }

  const formattedText = text + hashtagSuffix;

  return {
    formattedText,
    hashtags,
    characterCount: formattedText.length,
    truncationApplied: truncated,
    platformNotes: notes,
  };
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add generation-worker/src/modules/viral-patterns/ generation-worker/src/modules/stickiness/ generation-worker/src/modules/channel-adapter/
git commit -m "feat: add viral-patterns, stickiness, and channel-adapter modules"
```

---

## Task 11: Orchestrator

**Files:**
- Create: `generation-worker/src/modules/_shared/orchestrator.ts`

- [ ] **Step 1: Create the orchestrator**

Create `generation-worker/src/modules/_shared/orchestrator.ts`:

```typescript
import type { LlmRef } from '../../llmFromWorker';
import type { Env, Pattern, RequirementReport } from '../../types';
import type { EnrichmentBundle, ModuleContext } from './types';

import { personaModule } from '../persona/index';
import { emotionModule } from '../emotion/index';
import { psychologyDeepModule } from '../psychology-deep/index';
import { persuasionModule } from '../persuasion/index';
import { copywritingModule } from '../copywriting/index';
import { storytellingModule } from '../storytelling/index';
import { typographyModule } from '../typography/index';
import { buildColorSignal } from '../color-emotion/index';
import { imageStrategyModule } from '../image-strategy/index';

export async function runEnrichment(
  report: RequirementReport,
  pattern: Pattern,
  env: Env,
  llmRef: LlmRef,
): Promise<EnrichmentBundle> {
  // Phase 1: Persona (must run first — all other modules depend on it)
  const baseCtx: ModuleContext = {
    report,
    persona: null,
    pattern,
    channel: report.channel,
    topic: report.topic,
    env,
    llmRef,
  };

  const persona = await personaModule.enrich(baseCtx);

  // Phase 2: Run 7 enrichment modules in parallel (all get persona context)
  const ctxWithPersona: ModuleContext = { ...baseCtx, persona };

  const [emotion, psychology, persuasion, copy, story, typography, imageStrategy] = await Promise.all([
    emotionModule.enrich(ctxWithPersona),
    psychologyDeepModule.enrich(ctxWithPersona),
    persuasionModule.enrich(ctxWithPersona),
    copywritingModule.enrich(ctxWithPersona),
    storytellingModule.enrich(ctxWithPersona),
    typographyModule.enrich(ctxWithPersona),
    imageStrategyModule.enrich(ctxWithPersona),
  ]);

  // Phase 3: Color-emotion (pure logic, depends on EmotionSignal)
  const color = buildColorSignal(emotion);

  return {
    persona,
    emotion,
    psychology,
    persuasion,
    copy,
    story,
    typography,
    color,
    imageStrategy,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add generation-worker/src/modules/_shared/orchestrator.ts
git commit -m "feat: add enrichment orchestrator with 3-phase module execution"
```

---

## Task 12: Enhanced Creator

**Files:**
- Create: `generation-worker/src/modules/_shared/creator.ts`

- [ ] **Step 1: Create the enhanced creator**

Create `generation-worker/src/modules/_shared/creator.ts`:

```typescript
import type { LlmRef } from '../../llmFromWorker';
import { generateLlmParsedJson } from '../../llmFromWorker';
import type { ComposableAssets, Env, Pattern, RequirementReport } from '../../types';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import type { EnrichmentBundle, EnrichedTextVariant } from './types';

interface LlmGroupResponse {
  variants: Array<{
    label: string;
    text: string;
    hookType: string;
  }>;
}

const CHANNEL_MAX_CHARS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 5000,
  gmail: 5000,
  whatsapp: 500,
  telegram: 4096,
};

function buildResearchBlock(articles: ResearchArticleRef[]): string {
  if (articles.length === 0) return 'No research — write from general knowledge.';
  return articles
    .slice(0, 8)
    .map((a, i) => `[${i + 1}] ${a.title} — ${a.snippet ?? ''}`)
    .join('\n');
}

function buildAssetsBlock(assets: ComposableAssets): string {
  const parts: string[] = [];
  if (assets.brandContext) parts.push(`Brand context: ${assets.brandContext}`);
  if (assets.authorProfile) parts.push(`Author profile: ${assets.authorProfile}`);
  if (assets.globalRules) parts.push(`Global rules: ${assets.globalRules}`);
  if (assets.fewShotExamples) parts.push(`Examples:\n${assets.fewShotExamples}`);
  return parts.join('\n\n');
}

interface GroupConfig {
  name: string;
  emphasis: string;
  signalWeights: Record<string, number>;
  variantCount: number;
}

const GROUPS: GroupConfig[] = [
  {
    name: 'emotion-story',
    emphasis: 'Lead with emotional arc and narrative structure. Use psychology and persuasion as supporting elements.',
    signalWeights: { emotion: 0.35, story: 0.35, psychology: 0.15, persuasion: 0.15 },
    variantCount: 3,
  },
  {
    name: 'persuasion-psychology',
    emphasis: 'Lead with the persuasion framework. Use cognitive biases as structural elements. Build the argument methodically.',
    signalWeights: { persuasion: 0.35, psychology: 0.35, emotion: 0.15, copy: 0.15 },
    variantCount: 3,
  },
  {
    name: 'viral-copy',
    emphasis: 'Optimize for engagement metrics. Hook-driven, punchy, share-optimized. Viral patterns and copywriting techniques front and center.',
    signalWeights: { copy: 0.35, viral: 0.35, emotion: 0.15, persuasion: 0.15 },
    variantCount: 3,
  },
  {
    name: 'balanced',
    emphasis: 'Even weighting across all signals. Natural, well-rounded content that integrates all enrichment signals smoothly.',
    signalWeights: { emotion: 0.2, psychology: 0.15, persuasion: 0.15, copy: 0.2, story: 0.15, viral: 0.15 },
    variantCount: 3,
  },
];

function buildGroupPrompt(
  group: GroupConfig,
  bundle: EnrichmentBundle,
  pattern: Pattern,
  report: RequirementReport,
  research: ResearchArticleRef[],
  assets: ComposableAssets,
  maxChars: number,
): string {
  return `You are an expert content writer. Write ${group.variantCount} post variants using the enrichment signals below.

GROUP EMPHASIS: ${group.emphasis}

PATTERN: ${pattern.name}
${pattern.outline}
Writer guidance: ${pattern.writerSnippet}

TARGET PERSONA: ${bundle.persona.name}
Concerns: ${bundle.persona.concerns.slice(0, 3).join(', ')}
Language: ${bundle.persona.language}
Decision drivers: ${bundle.persona.decisionDrivers.slice(0, 3).join(', ')}

EMOTION SIGNAL:
Primary: ${bundle.emotion.primaryEmotion} (intensity ${bundle.emotion.intensity}/10)
Arc: ${bundle.emotion.arc}
Hook trigger: ${bundle.emotion.emotionalHook}

PSYCHOLOGY SIGNAL:
Maslow level: ${bundle.psychology.maslowLevel}
Primary bias: ${bundle.psychology.primaryBias}
Behavioral trigger: ${bundle.psychology.behavioralTrigger}
Frame: ${bundle.psychology.psychologicalFrame}

PERSUASION SIGNAL:
Framework: ${bundle.persuasion.framework}
Steps: ${bundle.persuasion.frameworkSteps.join(' → ')}
Principles: ${bundle.persuasion.principles.join(', ')}
Proof type: ${bundle.persuasion.proofType}

COPYWRITING SIGNAL:
Hook type: ${bundle.copy.hookType}
Hook example: ${bundle.copy.hookExample}
Power words: ${bundle.copy.powerWords.join(', ')}
CTA: ${bundle.copy.ctaStyle} — "${bundle.copy.ctaPhrase}"
Rhythm: ${bundle.copy.sentenceRhythm}

STORY SIGNAL:
Structure: ${bundle.story.structure}
Protagonist: ${bundle.story.protagonist}
Devices: ${bundle.story.devices.join(', ')}
Tension: ${bundle.story.tensionPoint}

TYPOGRAPHY:
Format: ${bundle.typography.lineBreakStrategy}, ${bundle.typography.whitespaceRatio}
Emoji: ${bundle.typography.emojiUsage}

POST REQUIREMENTS:
- Topic: ${report.topic}
- Channel: ${report.channel}
- Audience: ${report.audience || 'general professionals'}
- Tone: ${report.tone || 'professional'}
${report.mustInclude?.length ? `- Must include: ${report.mustInclude.join(', ')}` : ''}
${report.mustAvoid?.length ? `- Must avoid: ${report.mustAvoid.join(', ')}` : ''}
${report.cta ? `- CTA: ${report.cta}` : ''}

RESEARCH: ${buildResearchBlock(research)}

${buildAssetsBlock(assets)}

Write exactly ${group.variantCount} variants. Each MUST:
1. Stay under ${maxChars} characters
2. Follow the ${group.emphasis.split('.')[0].toLowerCase()} emphasis
3. Be complete and publication-ready
4. Use the designated hook type and emotional arc

Return JSON:
{
  "variants": [
    { "label": "Variant — <angle>", "text": "<full post>", "hookType": "<hook used>" }
  ]
}`;
}

export async function createEnrichedVariants(
  pattern: Pattern,
  report: RequirementReport,
  research: ResearchArticleRef[],
  bundle: EnrichmentBundle,
  assets: ComposableAssets,
  env: Env,
  llmRef: LlmRef,
): Promise<EnrichedTextVariant[]> {
  const maxChars = CHANNEL_MAX_CHARS[report.channel.toLowerCase()] ?? 3000;

  // Run 4 groups in parallel
  const groupResults = await Promise.all(
    GROUPS.map(async (group, groupIdx) => {
      const prompt = buildGroupPrompt(group, bundle, pattern, report, research, assets, maxChars);
      try {
        const result = await generateLlmParsedJson<LlmGroupResponse>(env, llmRef, prompt, {
          temperature: 0.8,
          maxOutputTokens: 4000,
        });
        if (!Array.isArray(result.variants)) return [];
        return result.variants.map((v, i) => ({
          index: groupIdx * 3 + i,
          label: v.label ?? `${group.name} ${String.fromCharCode(65 + i)}`,
          text: v.text ?? '',
          emphasisGroup: group.name,
          signalWeights: group.signalWeights,
          hookType: v.hookType ?? bundle.copy.hookType,
          persuasionFramework: bundle.persuasion.framework,
          emotionalArc: bundle.emotion.arc,
        }));
      } catch {
        return [];
      }
    }),
  );

  return groupResults.flat().filter((v) => v.text.length > 0);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add generation-worker/src/modules/_shared/creator.ts
git commit -m "feat: add enriched creator with 4 parallel emphasis groups"
```

---

## Task 13: Selector (Rule Filter + LLM Judge)

**Files:**
- Create: `generation-worker/src/modules/_shared/selector.ts`

- [ ] **Step 1: Create the selector**

Create `generation-worker/src/modules/_shared/selector.ts`:

```typescript
import type { LlmRef } from '../../llmFromWorker';
import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import type { Env, RequirementReport } from '../../types';
import type { EnrichmentBundle, EnrichedTextVariant, ScoredVariant, VariantScores } from './types';
import { successFramework } from '../stickiness/index';
import { viralStructures, engagementTriggers } from '../viral-patterns/index';
import { buildKnowledgeContext } from './knowledgeLoader';

// ---------------------------------------------------------------------------
// Stage 1: Rule-based pre-filter
// ---------------------------------------------------------------------------

const CHANNEL_MAX_CHARS: Record<string, number> = {
  linkedin: 3000,
  instagram: 2200,
  email: 5000,
  gmail: 5000,
  whatsapp: 500,
  telegram: 4096,
};

function hasHook(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  return firstLine.split(/\s+/).length >= 3;
}

function ruleFilter(
  variants: EnrichedTextVariant[],
  report: RequirementReport,
): EnrichedTextVariant[] {
  const maxChars = CHANNEL_MAX_CHARS[report.channel.toLowerCase()] ?? 3000;
  const seenHookStarts = new Set<string>();

  return variants.filter((v) => {
    // Character limit
    if (v.text.length > maxChars) return false;

    // Hook present
    if (!hasHook(v.text)) return false;

    // No duplicate hook openings (first 50 chars)
    const hookStart = v.text.slice(0, 50).toLowerCase();
    if (seenHookStarts.has(hookStart)) return false;
    seenHookStarts.add(hookStart);

    // Must include
    if (report.mustInclude?.length) {
      const textLower = v.text.toLowerCase();
      if (report.mustInclude.some((term) => !textLower.includes(term.toLowerCase()))) return false;
    }

    // Must avoid
    if (report.mustAvoid?.length) {
      const textLower = v.text.toLowerCase();
      if (report.mustAvoid.some((term) => textLower.includes(term.toLowerCase()))) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Stage 2: LLM-as-judge scoring
// ---------------------------------------------------------------------------

interface LlmJudgeResponse {
  scores: Array<{
    variantIndex: number;
    stickiness: number;
    viralPotential: number;
    personaFit: number;
    emotionalImpact: number;
    rationale: string;
  }>;
}

async function llmJudge(
  variants: EnrichedTextVariant[],
  bundle: EnrichmentBundle,
  env: Env,
  llmRef: LlmRef,
): Promise<ScoredVariant[]> {
  const rubrics = buildKnowledgeContext({
    'Stickiness Rubric (SUCCESs)': successFramework,
    'Viral Patterns': viralStructures,
    'Engagement Triggers': engagementTriggers,
  });

  const variantList = variants
    .map((v, i) => `[${i}] ${v.label}\n${v.text.slice(0, 800)}`)
    .join('\n\n---\n\n');

  const prompt = `You are a content evaluation expert. Score each variant on 4 dimensions.

SCORING RUBRICS:
${rubrics}

TARGET PERSONA: ${bundle.persona.name}
Persona concerns: ${bundle.persona.concerns.slice(0, 3).join(', ')}
Target emotion: ${bundle.emotion.primaryEmotion} (intensity ${bundle.emotion.intensity}/10)
Emotional arc: ${bundle.emotion.arc}

VARIANTS TO SCORE:
${variantList}

Score each on 0-10 scale:
- stickiness: How memorable? (SUCCESs framework)
- viralPotential: How shareable? (viral patterns + engagement triggers)
- personaFit: How well does it speak to ${bundle.persona.name}?
- emotionalImpact: Does it land the ${bundle.emotion.primaryEmotion} emotion?

Return JSON:
{
  "scores": [
    { "variantIndex": 0, "stickiness": 7, "viralPotential": 8, "personaFit": 6, "emotionalImpact": 7, "rationale": "<1 sentence>" }
  ]
}`;

  const result = await generateLlmParsedJson<LlmJudgeResponse>(env, llmRef, prompt, {
    temperature: 0.3,
    maxOutputTokens: 2000,
  });

  const scored: ScoredVariant[] = variants.map((v, i) => {
    const score = result.scores?.find((s) => s.variantIndex === i);
    const stickiness = score?.stickiness ?? 5;
    const viralPotential = score?.viralPotential ?? 5;
    const personaFit = score?.personaFit ?? 5;
    const emotionalImpact = score?.emotionalImpact ?? 5;
    const weightedTotal = stickiness * 0.3 + viralPotential * 0.3 + personaFit * 0.2 + emotionalImpact * 0.2;

    const scores: VariantScores = {
      stickiness,
      viralPotential,
      personaFit,
      emotionalImpact,
      weightedTotal,
      rationale: score?.rationale ?? '',
    };

    return { ...v, scores };
  });

  return scored.sort((a, b) => b.scores.weightedTotal - a.scores.weightedTotal);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function selectTopVariants(
  variants: EnrichedTextVariant[],
  bundle: EnrichmentBundle,
  report: RequirementReport,
  env: Env,
  llmRef: LlmRef,
  topN = 4,
): Promise<ScoredVariant[]> {
  // Stage 1: Rule filter
  const filtered = ruleFilter(variants, report);

  if (filtered.length === 0) {
    // Fallback: return first topN with default scores
    return variants.slice(0, topN).map((v) => ({
      ...v,
      scores: {
        stickiness: 5,
        viralPotential: 5,
        personaFit: 5,
        emotionalImpact: 5,
        weightedTotal: 5,
        rationale: 'No variants passed rule filter; using fallback',
      },
    }));
  }

  // Stage 2: LLM judge (if available)
  if (!hasAnyLlmProvider(env)) {
    return filtered.slice(0, topN).map((v) => ({
      ...v,
      scores: {
        stickiness: 5,
        viralPotential: 5,
        personaFit: 5,
        emotionalImpact: 5,
        weightedTotal: 5,
        rationale: 'No LLM available; using rule-filtered order',
      },
    }));
  }

  try {
    const scored = await llmJudge(filtered, bundle, env, llmRef);
    return scored.slice(0, topN);
  } catch {
    return filtered.slice(0, topN).map((v) => ({
      ...v,
      scores: {
        stickiness: 5,
        viralPotential: 5,
        personaFit: 5,
        emotionalImpact: 5,
        weightedTotal: 5,
        rationale: 'LLM judge failed; using rule-filtered order',
      },
    }));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add generation-worker/src/modules/_shared/selector.ts
git commit -m "feat: add selector with rule pre-filter and LLM judge scoring"
```

---

## Task 14: Pipeline Integration

**Files:**
- Modify: `generation-worker/src/pipeline.ts`

- [ ] **Step 1: Modify pipeline.ts to integrate enrichment**

Replace the full content of `generation-worker/src/pipeline.ts` with:

```typescript
import { runNewsResearch, trimForPrompt } from '@linkedinpost/researcher';
import type { ResearchArticleRef } from '@linkedinpost/researcher';
import { buildRequirementReport } from './players/requirementReport';
import { loadBundledRepository } from './players/patternRepository';
import { findPattern } from './players/patternFinder';
import { createVariants } from './players/creator';
import { reviewContent } from './players/review';
import { relateImages } from './players/imageRelator';
import { buildCandidatesFromRelator } from './players/imagePicker';
import { runEnrichment } from './modules/_shared/orchestrator';
import { createEnrichedVariants } from './modules/_shared/creator';
import { selectTopVariants } from './modules/_shared/selector';
import { formatForChannel } from './modules/channel-adapter/index';
import { FEATURE_ENRICHMENT } from '../src/../../worker/src/generated/features';
import type { Env, GenerateRequest, GenerateResponse, ComposableAssets, PerVariantImageCandidates, ImageCandidate, TextVariant } from './types';
import { resolveGenerationWorkerLlmRef } from './llmFromWorker';

const EMPTY_ASSETS: ComposableAssets = {
  brandContext: '',
  globalRules: '',
  fewShotExamples: '',
  reviewChecklist: [],
  authorProfile: '',
};

export async function runPipeline(
  req: GenerateRequest,
  env: Env,
  db: D1Database,
): Promise<GenerateResponse> {
  const trace: Record<string, unknown> = {};
  const runId = crypto.randomUUID();

  // 0. RequirementReport
  const report = buildRequirementReport(req);
  trace.requirementReport = report;

  // 1. LLM ref
  const llmRef = await resolveGenerationWorkerLlmRef(env, req.llm);
  trace.llmRef = llmRef;

  // 2. PatternRepository + PatternFinder
  const repo = loadBundledRepository();
  const finder = await findPattern(repo, report, env, llmRef, req.preferPatternId);
  trace.patternFinder = finder;

  const pattern = repo.getById(finder.primaryId);
  if (!pattern) throw new Error(`Pattern not found: ${finder.primaryId}`);

  // 3. Research (optional)
  let research: ResearchArticleRef[] = [];
  const researchPromise = (async () => {
    if (report.factual && req.newsResearchConfig) {
      try {
        const windowStart = req.newsWindowStart ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const windowEnd = req.newsWindowEnd ?? new Date().toISOString().slice(0, 10);
        const result = await runNewsResearch(env, req.newsResearchConfig, {
          topicId: runId,
          topic: report.topic,
          date: windowEnd,
          windowStart,
          windowEnd,
        });
        research = trimForPrompt(result.articles);
        trace.research = { articleCount: research.length, warnings: result.warnings };
      } catch (e) {
        trace.researchError = String(e);
      }
    }
  })();

  let variants: TextVariant[];
  const assets = req.composableAssets ?? EMPTY_ASSETS;

  if (FEATURE_ENRICHMENT) {
    // --- ENRICHMENT PATH ---
    // Run research and enrichment in parallel
    const [, enrichmentBundle] = await Promise.all([
      researchPromise,
      runEnrichment(report, pattern, env, llmRef),
    ]);
    trace.enrichmentBundle = enrichmentBundle;

    // Enhanced Creator (4 parallel groups → 8-12 variants)
    const allVariants = await createEnrichedVariants(
      pattern, report, research, enrichmentBundle, assets, env, llmRef,
    );
    trace.creatorVariantCount = allVariants.length;
    trace.creatorGroups = allVariants.map((v) => v.emphasisGroup);

    // Selector (rule filter + LLM judge → top 4)
    const scored = await selectTopVariants(allVariants, enrichmentBundle, report, env, llmRef);
    trace.selectorScores = scored.map((v) => ({ label: v.label, ...v.scores }));

    // Channel adapter
    const formatted = scored.map((v) => ({
      ...v,
      text: formatForChannel(v, enrichmentBundle.typography, report.channel).formattedText,
    }));

    variants = formatted;
  } else {
    // --- LEGACY PATH ---
    await researchPromise;
    variants = await createVariants(pattern, report, research, assets, env, llmRef);
    trace.creatorVariantCount = variants.length;
  }

  // 5. Review
  const review = reviewContent(variants, report);
  trace.review = review;

  // 6. ImageRelator + ImagePicker
  let perVariantImageCandidates: PerVariantImageCandidates[] = [];
  let imageCandidates: ImageCandidate[] = [];
  if (!req.skipImages) {
    const relatorResults = await Promise.all(
      variants.map((v) => relateImages(v, pattern, report, env, llmRef))
    );
    perVariantImageCandidates = relatorResults.map((rel, i) => ({
      variantIndex: i,
      candidates: buildCandidatesFromRelator(rel, i),
    }));
    imageCandidates = perVariantImageCandidates.flatMap((pv) => pv.candidates);
    trace.imageRelator = relatorResults.map((rel, i) => ({
      variantIndex: i,
      visualBrief: rel.visualBrief,
      keywordCount: rel.searchKeywords.length,
    }));
  } else {
    trace.imageRelator = 'skipped';
  }

  // 7. Persist
  await db
    .prepare(
      `INSERT INTO generation_runs
        (run_id, spreadsheet_id, topic, channel, pattern_id, pattern_runner_up,
         pattern_rationale, requirement_report_json, variants_json,
         image_candidates_json, review_json, trace_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      runId,
      req.spreadsheetId ?? '',
      report.topic,
      report.channel,
      finder.primaryId,
      finder.runnerUpId,
      finder.rationale,
      JSON.stringify(report),
      JSON.stringify(variants),
      JSON.stringify(imageCandidates),
      JSON.stringify(review),
      JSON.stringify(trace),
      'completed',
    )
    .run();

  return {
    runId,
    requirementReport: report,
    primaryPatternId: finder.primaryId,
    runnerUpPatternId: finder.runnerUpId,
    patternRationale: finder.rationale,
    variants,
    imageCandidates,
    perVariantImageCandidates,
    review,
    trace,
  };
}
```

- [ ] **Step 2: Fix the FEATURE_ENRICHMENT import path**

The import `from '../src/../../worker/src/generated/features'` needs to resolve correctly. Check what path works in the generation-worker context. The generated features file is at `worker/src/generated/features.ts`. Given the generation-worker's tsconfig paths and the existing cross-references to `../../worker/src/llm/`, the correct import should be:

```typescript
import { FEATURE_ENRICHMENT } from '../../worker/src/generated/features';
```

Update the import line in `pipeline.ts` accordingly.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx tsc --noEmit`

If there are errors, fix the import path for FEATURE_ENRICHMENT. The path may need adjusting based on how the tsconfig resolves it. An alternative is to check the feature flag at runtime from an env variable instead.

- [ ] **Step 4: Commit**

```bash
git add generation-worker/src/pipeline.ts
git commit -m "feat: integrate enrichment layer into generation pipeline with feature flag"
```

---

## Task 15: Local Testing

**Files:** No new files — this task verifies the system works end-to-end.

- [ ] **Step 1: Start the generation worker locally**

Run: `cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost/.claude/worktrees/dreamy-allen/generation-worker && npx wrangler dev --port 8788`

Verify: Server starts without errors. Watch for TypeScript compilation issues.

- [ ] **Step 2: Test the enrichment path with a curl request**

Run (in a separate terminal):
```bash
curl -X POST http://localhost:8788/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Why most engineering teams fail at code reviews",
    "channel": "linkedin",
    "audience": "engineering manager",
    "tone": "direct and practical",
    "jtbd": "improve team code review practices",
    "cta": "Share your code review process in the comments"
  }'
```

Expected: Response with `runId`, `variants` (4 scored variants), `imageCandidates`, `review`, and `trace` containing `enrichmentBundle` and `selectorScores`.

- [ ] **Step 3: Verify trace includes enrichment data**

Check the response JSON for:
- `trace.enrichmentBundle.persona.name` should be "Engineering Manager" (matched from library)
- `trace.enrichmentBundle.emotion.primaryEmotion` should be a real emotion
- `trace.selectorScores` should be an array of 4 items with scores
- `trace.creatorGroups` should contain "emotion-story", "persuasion-psychology", "viral-copy", "balanced"

- [ ] **Step 4: Test legacy path (enrichment disabled)**

Edit `features.yaml` to set `enrichment: false`, regenerate, and restart:
```bash
python3 scripts/generate_features.py
```

Re-run the same curl. Verify:
- Response still works (legacy path)
- `trace` does NOT contain `enrichmentBundle`
- `variants` has 4 variants (from legacy creator)

- [ ] **Step 5: Re-enable enrichment and commit**

Set `enrichment: true` in `features.yaml`, regenerate:
```bash
python3 scripts/generate_features.py
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete modular content enrichment system with 12 modules"
```

---

## Summary of LLM Call Budget

| Step | LLM Calls | Parallelization |
|------|-----------|-----------------|
| Persona | 0-1 | Sequential (Phase 1) |
| Emotion, Psychology, Persuasion, Copywriting, Storytelling, Image-Strategy | 6 | All parallel (Phase 2) |
| Typography, Color-Emotion, Channel-Adapter | 0 | Pure logic |
| Creator (4 groups) | 4 | All parallel |
| Selector judge | 1 | Sequential |
| **Total** | **~12** | **Wall-clock: ~3 sequential steps** |
