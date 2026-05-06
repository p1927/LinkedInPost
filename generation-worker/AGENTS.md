<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# generation-worker

## Purpose
A dedicated Cloudflare Worker for computationally heavy AI content generation tasks offloaded from the main `worker`. Contains deep knowledge modules for copywriting psychology, storytelling frameworks, viral patterns, persona modeling, and vocabulary — used to produce high-quality LinkedIn post drafts.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Dependencies and scripts |
| `wrangler.jsonc` | Cloudflare Worker deployment configuration |
| `tsconfig.json` | TypeScript configuration |
| `src/` | Worker source code |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Generation worker handlers and knowledge modules |
| `migrations/` | D1 schema migrations specific to this worker |
| `patterns/` | Structured content pattern definitions used during generation |

## For AI Agents

### Working In This Directory
- Run `npx wrangler dev` to start locally
- Run `npx tsc --noEmit` before committing
- Knowledge modules in `patterns/` are ingested at generation time — edit them to change content quality/style
- This worker is called by the main `worker` for long-running generation tasks

### Common Patterns
- Each generation mode (storytelling, viral, persona) is a separate module
- Patterns are plain text/JSON files loaded and injected into prompts
- D1 migrations track generation job state


## Content Quality Scoring

A dedicated scoring module analyzes post drafts during and after generation.

### Scoring Dimensions

| Dimension | What It Measures |
|-----------|------------------|
| `clarity` | Readability, sentence complexity, jargon density |
| `engagement` | Hook strength, emotional resonance, call-to-action potential |
| `structure` | Paragraph flow, whitespace, line length, visual hierarchy |
| `professionalism` | Tone consistency, brand voice alignment, LinkedIn norms |

Each dimension scores 0–100 with sub-scores and specific gap suggestions.

### Scoring Pipeline

```
Draft generated
      ↓
QualityScorer.analyze(draft, brief)
      ↓
{
  scores: {
    clarity: { score: number, gaps: string[], suggestions: string[] },
    engagement: { score: number, gaps: string[], suggestions: string[] },
    structure: { score: number, gaps: string[], suggestions: string[] },
    professionalism: { score: number, gaps: string[], suggestions: string[] }
  },
  overall: number,
  passed: boolean,
  improvementHints: string[]
}
      ↓
Stored in draft metadata via D1
      ↓
Returned to main worker for UI display
```

### Usage in Generation Modes

- **Author Voice**: Gap scorer runs after base draft, before enhancement pass
- **Creative Synthesis**: Full quality pass runs on final draft before delivery

### Metadata Schema (D1)

```sql
CREATE TABLE draft_quality_scores (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  clarity_score INTEGER,
  engagement_score INTEGER,
  structure_score INTEGER,
  professionalism_score INTEGER,
  overall_score INTEGER,
  clarity_gaps TEXT,        -- JSON array
  engagement_gaps TEXT,
  structure_gaps TEXT,
  professionalism_gaps TEXT,
  improvement_hints TEXT,   -- JSON array
  created_at INTEGER
);
```

## Dependencies

### Internal
- `packages/llm-core` — LLM provider and model configuration

### External
- Cloudflare Workers runtime
- Anthropic Claude — primary generation model

<!-- MANUAL: -->
