# Persona Framework

## Overview

A persona is a structured representation of a target audience archetype. It encodes how a specific professional role thinks, communicates, makes decisions, and experiences pain — so that content can be tailored to resonate deeply rather than generically.

## Key Dimensions

### Concerns
The recurring worries, anxieties, and responsibilities that dominate this persona's mental bandwidth. These are not hypothetical risks but lived pressures they navigate daily. Content that acknowledges these concerns earns immediate credibility.

### Ambitions
The goals, aspirations, and outcomes this persona is striving toward. These operate on multiple time horizons — short-term targets (this quarter), medium-term milestones (this year), and identity-level aspirations (the kind of professional they want to become).

### Current Focus
The dominant theme or initiative absorbing the largest share of this persona's attention right now. This is singular and time-bound — it shifts with market conditions, career stage, and organizational context.

### Habits
Repeated behaviors, rituals, and workflows that define how this persona works. Habits reveal what they already value and how they consume information, make it easier to meet them where they are.

### Language
The vocabulary, tone, and communication register this persona uses and responds to. Includes technical jargon they trust, phrases that feel authentic, and styles that feel alien or condescending. Language is a trust signal — matching it lowers guard.

### Decision Drivers
The criteria, values, and heuristics this persona applies when evaluating options, committing to a course of action, or pushing back on a proposal. Understanding decision drivers helps content frame choices in the right terms.

### Pain Points
Specific frictions, failures, and frustrations this persona experiences repeatedly. Pain points are more actionable than concerns — they point to concrete problems content can address or that a solution can credibly claim to solve.

---

## Matching Logic

### Fuzzy Match (Preferred Path)
When an audience description is provided, the system attempts a fuzzy match against the pre-built persona library. Matching checks for:

1. **Exact id match** — audience string equals a persona id (e.g., `startup-founder`)
2. **Name substring match** — audience string contains the persona name (case-insensitive)
3. **Keyword overlap** — audience string shares significant keywords with persona names and ids

If a match scores above threshold, the pre-built persona is returned immediately — no LLM call needed. This is fast, deterministic, and avoids hallucination.

### LLM Generation (Fallback Path)
When no pre-built persona matches, the module prompts an LLM with the audience description and the persona framework. The LLM synthesizes a PersonaSignal from scratch. This handles niche roles (e.g., "ML infrastructure lead at a Series B fintech") that the pre-built library does not cover.

### Default Fallback (No LLM Available)
When no LLM provider is configured, the module returns a minimal default persona derived from the raw audience string, with empty arrays for structured fields. This ensures the pipeline never hard-fails due to persona resolution.

---

## Pre-Built Persona Library

| id | Name |
|----|------|
| startup-founder | Startup Founder |
| engineering-manager | Engineering Manager |
| product-manager | Product Manager |
| senior-developer | Senior Developer |

---

## Usage Notes

- Personas are enrichment signals, not rigid constraints. They inform tone, hook selection, and framing — they do not dictate content.
- When content targets a mixed audience, pick the persona that represents the primary decision-maker or most engaged segment.
- Persona signals feed downstream modules (emotion, persuasion, copywriting) to align the full content strategy.
