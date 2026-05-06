
Metrics are emitted as structured log events with `metric: true` flag for aggregation pipelines.


## Image Generation & Selection

The image pipeline runs after variant creation, producing image candidates for each post variant.

### Players

| Player | Purpose |
|--------|---------|
| `imageRelator` | Constructs visual brief from variant text + topic context |
| `imagePicker` | Ranks and selects best candidates across search + generation |

### imageRelator — Visual Brief Construction

**Inputs**: variant text, topic, tone, audience, channel

**Outputs**: `VisualBrief { keywords: string[], brief: string, styleHints: string[] }`

Brief construction phases:
1. Extract visual entities (products, tools, people, concepts) from variant text
2. Map emotional tone to visual style (e.g., "opinionated" → bold, high-contrast imagery)
3. Incorporate topic-domain keywords for relevance signal
4. Generate 3–5 search keywords + a descriptive brief paragraph

### imagePicker — Candidate Ranking

**Inputs**: `ImageCandidate[]` from search + generation, visual brief, variant text

**Ranking signals**:
- **Relevance** — keyword overlap between candidate tags and visual brief keywords (weighted 40%)
- **Quality** — resolution, aspect ratio, absence of artifacts (weighted 30%)
- **Diversity** — penalize near-duplicates from same source (weighted 20%)
- **Channel fit** — LinkedIn display context (weighted 10%)

**Ranking formula**:
```
score = (relevance_weight * relevance_score)
      + (quality_weight * quality_score)
      + (diversity_weight * diversity_score)
      + (channel_weight * channel_score)

where: relevance=0.4, quality=0.3, diversity=0.2, channel=0.1
```

### Fallback Image Prompts

When `imageRelator` returns no candidates (e.g., abstract topic with no visual entities):

1. **Topic-domain fallback**: Generate a generic-but-relevant prompt from the topic (e.g., "professional workspace with laptop, shallow depth of field, warm lighting")
2. **Abstract fallback**: If domain prompt yields no results, use a high-quality abstract gradient or geometric pattern
3. **Last-resort**: Return an empty candidates array — the UI will render a text-only post

### Per-Variant Image Quality Scoring

Each candidate is scored before ranking:

| Signal | Source | Score range |
|--------|--------|-------------|
| Resolution | Image metadata | 0–100 (px-based) |
| Aspect ratio fit | Image metadata | 0–100 (1.91:1 or 1:1 = 100) |
| Visual clarity | LLM judgment | 0–100 |
| Brand safety | PII/controversy check | 0 or 100 |

Composite quality score = weighted average, fed into imagePicker ranking.

### Image Pipeline Data Flow

```
Variant text
    ↓
imageRelator.buildBrief()
    ↓ (keywords + brief)
┌───────────────────────────────────────┐
│  imageSearch    │   imageGeneration   │
│  (keyword API)  │   (URL prompt API)  │
└───────────────────────────────────────┘
    ↓
imagePicker.rank(candidates, visualBrief)
    ↓
Top N candidates returned per variant
```

### Error Handling

## Dependencies


### Internal
- `packages/llm-core` — LLM provider and model configuration

### External
- Cloudflare Workers runtime
- Anthropic Claude — primary generation model

<!-- MANUAL: --> 
## Error Handling & Retry Patterns 
### Retry Utilities (`src/players/retryUtils.ts`) 
The `withRetry` function provides exponential backoff with jitter for transient failures: 
```typescript
withRetry(fn, {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  retryIf: (err) => /\bstatus 429\b|\bstatus 5\d\d\b|rate limit|overloaded|timeout|unavailable/i.test(String(err)),
})
```
Circuit breaker (`createCircuitBreaker`) is available but not currently wired into the pipeline. 
### Pipeline Retry Coverage 
| Stage | Location | Attempts | Notes |
|-------|---------|---------|-------|
| Pattern finding | `pipeline.ts:51` | 2 | LLM + repository lookup |
| News research | `pipeline.ts:73` | 2 | External API call |
| Variant selector | `pipeline.ts:131` | 2 | LLM judge |
| Image relator | `pipeline.ts:180` | 2 | LLM call per variant |
| D1 persistence | `pipeline.ts:208` | 3 | Database write |
| Creator (legacy) | `creator.ts:113` | 3 | LLM variant generation |
