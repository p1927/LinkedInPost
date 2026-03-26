---
title: Editor Generation Workflow Architecture Plan
description: Frontend, Worker, and persistence module boundaries for the new preview-first generation workflow
author: GitHub Copilot
ms.date: 2026-03-26
ms.topic: reference
keywords:
  - architecture
  - frontend
  - worker
  - sheets
  - modules
estimated_reading_time: 9
---

## Frontend Module Layout

The frontend should be organized by feature instead of keeping this work inside the existing review component.

Recommended structure:

```text
frontend/src/features/editor/
frontend/src/features/generation/
frontend/src/features/compare/
frontend/src/features/rules/
frontend/src/features/persistence/
frontend/src/features/review/
```

## Frontend Responsibilities

### Editor

Owns:

* editable draft content
* selected-text tracking
* lightweight formatting actions
* whole-post and selected-text targeting state

Should not own:

* Worker request composition
* Sheets persistence
* approval logic

### Generation

Owns:

* quick change controls
* four-variant generation controls
* generation request state
* preview result state

Should not own:

* editor replacement behavior
* final approval save

### Compare

Owns:

* current vs proposed content display
* apply and cancel behavior
* selection replacement compare mode
* whole-post replacement compare mode

### Rules

Owns:

* shared generation rules UI
* local validation of rules input
* showing the active rules before generation

### Persistence

Owns:

* save variants action
* save retry behavior
* sync banners and save status

### Review

Owns:

* orchestration between editor, preview, compare, save, and approval
* bridging the existing review flow to the new modules

## Worker Module Layout

Recommended structure:

```text
worker/src/generation/types.ts
worker/src/generation/prompts.ts
worker/src/generation/rules.ts
worker/src/generation/service.ts
worker/src/generation/normalize.ts
worker/src/persistence/drafts.ts
```

## Worker Responsibilities

### Generation Service

Owns:

* calling Gemini
* dispatching by generation mode
* selection and whole-post prompt composition

### Rules Composer

Owns:

* merging workspace rules with per-run instruction
* producing a stable prompt prefix across all generation modes

### Output Normalization

Owns:

* converting generated output into plain strings
* trimming malformed payloads
* ensuring Sheets-safe values

### Draft Persistence

Owns:

* saving four canonical variants to Sheets
* retry-safe persistence helpers

## API Actions

Recommended new actions:

* `generateQuickChange`
* `generateVariantsPreview`
* `saveDraftVariants`

Existing actions that remain relevant:

* `updateRowStatus`
* `getRows`
* `saveConfig`

## State Separation

The implementation should preserve three separate content states.

### Sheet draft state

The last canonical draft content saved in Sheets.

### Editor working state

The current content the user is editing locally in the review surface.

### Generation preview state

Transient AI output that has not yet been applied or persisted.

This separation prevents ambiguity when users generate, compare, apply, save, and approve in different sequences.

## Persistence Rules

### Quick change

* Generate preview only.
* Compare before apply.
* Applying updates editor state only.
* No automatic save to Sheets.

### Four-variant generation

* Generate preview only.
* No automatic save to Sheets.
* Save Variants persists the current four-variant preview set.

### Approval

* Save approved text independently from variant persistence.
* Allow approval even if Save Variants failed.

## Failure Handling

Required failure states:

* generation failed
* compare cancelled
* save variants failed
* approval save failed

Required recovery behavior:

* preview results remain visible after save failure
* save retry is available
* approval stays available if final text is valid