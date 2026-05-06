/**
 * worker/src/engine/workflows/definitions/__tests__/postTypesPlaybook.test.ts
 *
 * Unit tests for the Content Post Types Playbook — 7 structural post-type templates.
 *
 * Spec source: FEED_EXPLORATION_REPORT.md § "Content Post Types Playbook"
 * Architecture: docs/plans/plan-002-post-quality-engine/architecture.md
 *
 * Each post type embeds a named arc pattern (e.g. HOOK→CONTEXT→TAKE→CTA) in its
 * generationInstruction. The feed is one output surface for these templates.
 *
 * Test pattern: follow the project's vitest test conventions in
 * worker/src/generation/__tests__/nodeInsightSummary.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Direct file imports (no barrel index.ts in this directory)
import { baseWorkflow } from '../base';
import { informationalNewsWorkflow } from '../informational-news';
import { personalStoryWorkflow } from '../personal-story';
import { weekInReviewWorkflow } from '../week-in-review';
import { eventInsightWorkflow } from '../event-insight';
import { trendCommentaryWorkflow } from '../trend-commentary';
import { satiricalWorkflow } from '../satirical';
import { appreciationWorkflow } from '../appreciation';
import { workflowRegistry } from '../../../registry/WorkflowRegistry';
import { setupBuiltinWorkflows } from '../../registry-setup';

const ALL_PLAYBOOK_WORKFLOWS = [
  informationalNewsWorkflow,
  personalStoryWorkflow,
  weekInReviewWorkflow,
  eventInsightWorkflow,
  trendCommentaryWorkflow,
  satiricalWorkflow,
  appreciationWorkflow,
];

const EXPECTED_PLAYBOOK_IDS = [
  'informational-news',
  'personal-story',
  'week-in-review',
  'event-insight',
  'trend-commentary',
  'satirical',
  'appreciation',
] as const;

describe('Content Post Types Playbook — spec compliance', () => {
  // ─── 1. All 7 post-type definitions are importable ────────────────────────────

  describe('exports', () => {
    it('informational-news is importable and has id informational-news', () => {
      expect(informationalNewsWorkflow.id).toBe('informational-news');
    });

    it('personal-story is importable and has id personal-story', () => {
      expect(personalStoryWorkflow.id).toBe('personal-story');
    });

    it('week-in-review is importable and has id week-in-review', () => {
      expect(weekInReviewWorkflow.id).toBe('week-in-review');
    });

    it('event-insight is importable and has id event-insight', () => {
      expect(eventInsightWorkflow.id).toBe('event-insight');
    });

    it('trend-commentary is importable and has id trend-commentary', () => {
      expect(trendCommentaryWorkflow.id).toBe('trend-commentary');
    });

    it('satirical is importable and has id satirical', () => {
      expect(satiricalWorkflow.id).toBe('satirical');
    });

    it('appreciation is importable and has id appreciation', () => {
      expect(appreciationWorkflow.id).toBe('appreciation');
    });
  });

  // ─── 2. Identifiers are unique and non-empty ────────────────────────────────

  describe('identifiers are unique and non-empty', () => {
    it('every playbook id is unique', () => {
      const ids = ALL_PLAYBOOK_WORKFLOWS.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ALL_PLAYBOOK_WORKFLOWS.length);
    });

    it('every playbook id matches the expected list', () => {
      const ids = ALL_PLAYBOOK_WORKFLOWS.map((w) => w.id);
      for (const expected of EXPECTED_PLAYBOOK_IDS) {
        expect(ids).toContain(expected);
      }
    });

    it('every name is a non-empty string', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(typeof wf.name).toBe('string');
        expect(wf.name.trim().length).toBeGreaterThan(0);
      }
    });

    it('every description is a non-empty string', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(typeof wf.description).toBe('string');
        expect(wf.description.trim().length).toBeGreaterThan(0);
      }
    });

    it('every optimizationTarget is a non-empty string', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(typeof wf.optimizationTarget).toBe('string');
        expect(wf.optimizationTarget.trim().length).toBeGreaterThan(0);
      }
    });
  });

  // ─── 3. Each workflow extends base ──────────────────────────────────────────

  describe('extends base workflow', () => {
    it('every post-type workflow extends base', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(wf.extendsWorkflowId).toBe('base');
      }
    });

    it('base workflow does NOT extend any other workflow', () => {
      expect(baseWorkflow.extendsWorkflowId).toBeUndefined();
    });
  });

  // ─── 4. nodeConfigs structure is valid ──────────────────────────────────────

  describe('nodeConfigs structure', () => {
    it('every workflow has a non-empty nodeConfigs array', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(Array.isArray(wf.nodeConfigs)).toBe(true);
        expect(wf.nodeConfigs.length).toBeGreaterThan(0);
      }
    });

    it('every nodeConfig has a non-empty nodeId string', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        for (const config of wf.nodeConfigs) {
          expect(typeof config.nodeId).toBe('string');
          expect(config.nodeId.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('every nodeConfig has a valid ImportanceLevel', () => {
      const VALID = ['critical', 'important', 'supporting', 'background', 'off'];
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        for (const config of wf.nodeConfigs) {
          expect(VALID).toContain(config.importance);
        }
      }
    });

    it('every nodeConfig has a dependsOn array', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        for (const config of wf.nodeConfigs) {
          expect(Array.isArray(config.dependsOn)).toBe(true);
        }
      }
    });

    it('draft-generator is critical in every workflow', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        const draftGen = wf.nodeConfigs.find((c) => c.nodeId === 'draft-generator');
        expect(draftGen, `${wf.id} must include draft-generator`).toBeDefined();
        expect(draftGen!.importance).toBe('critical');
      }
    });

    it('every workflow has at least one critical node', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        const hasCritical = wf.nodeConfigs.some((c) => c.importance === 'critical');
        expect(hasCritical, `${wf.id} must have ≥1 critical node`).toBe(true);
      }
    });
  });

  // ─── 5. generationInstruction embeds named arc patterns ──────────────────────

  describe('generationInstruction embeds arc patterns', () => {
    it('every workflow has a non-empty generationInstruction', () => {
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(typeof wf.generationInstruction).toBe('string');
        expect(wf.generationInstruction.trim().length).toBeGreaterThan(0);
      }
    });

    it('every instruction contains a named arc pattern keyword', () => {
      // Spec: "each type embeds a named arc pattern (e.g. HOOK→CONTEXT→TAKE→CTA)"
      // Satirical uses SETUP/BUILD/PUNCHLINE instead of HOOK — we check for STRUCTURE: as
      // the common delimiter that prefixes each named arc pattern in all 7 workflows.
      for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
        expect(
          wf.generationInstruction.toUpperCase(),
          `${wf.id}: generationInstruction must embed a named arc pattern (e.g. STRUCTURE:)`,
        ).toContain('STRUCTURE');
      }
    });

    it('informational-news arc: HOOK, CONTEXT, TAKE, CTA', () => {
      const inst = informationalNewsWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('CONTEXT');
      expect(inst).toContain('TAKE');
      expect(inst).toContain('CTA');
    });

    it('personal-story arc: HOOK, TURN, STRUGGLE, INSIGHT', () => {
      const inst = personalStoryWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('TURN');
      expect(inst).toContain('STRUGGLE');
      expect(inst).toContain('INSIGHT');
    });

    it('week-in-review arc: HOOK, RECAP, META', () => {
      const inst = weekInReviewWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('RECAP');
      expect(inst).toContain('META');
    });

    it('event-insight arc: HOOK, CONTEXT, INSIGHT, READ', () => {
      const inst = eventInsightWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('CONTEXT');
      expect(inst).toContain('INSIGHT');
      expect(inst).toContain('READ');
    });

    it('trend-commentary arc: HOOK, EVIDENCE, SHIFT, IMPLICATION', () => {
      const inst = trendCommentaryWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('EVIDENCE');
      expect(inst).toContain('SHIFT');
      expect(inst).toContain('IMPLICATION');
    });

    it('satirical arc: SETUP, BUILD, PUNCHLINE', () => {
      const inst = satiricalWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('SETUP');
      expect(inst).toContain('BUILD');
      expect(inst).toContain('PUNCHLINE');
    });

    it('appreciation arc: HOOK, MOMENT, MATTERS', () => {
      const inst = appreciationWorkflow.generationInstruction.toUpperCase();
      expect(inst).toContain('HOOK');
      expect(inst).toContain('MOMENT');
      expect(inst).toContain('MATTERS');
    });
  });
});

describe('Content Post Types Playbook — registry integration', () => {
  beforeAll(() => {
    // setupBuiltinWorkflows is idempotent — safe to call multiple times.
    setupBuiltinWorkflows();
  });

  it('all 7 playbook workflows are registered via get()', () => {
    for (const id of EXPECTED_PLAYBOOK_IDS) {
      const entry = workflowRegistry.get(id);
      expect(entry, `workflow "${id}" must be registered`).toBeDefined();
      expect(entry.id).toBe(id);
    }
  });

  it('registry.resolve() succeeds for all 7 playbook workflows', () => {
    for (const id of EXPECTED_PLAYBOOK_IDS) {
      const resolved = workflowRegistry.resolve(id);
      expect(resolved, `workflow "${id}" must resolve`).toBeDefined();
      expect(resolved.id).toBe(id);
    }
  });

  it('resolve() inherits base nodeConfigs (base + child merge)', () => {
    const resolved = workflowRegistry.resolve('informational-news');
    const baseIds = baseWorkflow.nodeConfigs.map((c) => c.nodeId);
    const resolvedIds = resolved.nodeConfigs.map((c) => c.nodeId);
    for (const baseId of baseIds) {
      expect(
        resolvedIds,
        `resolved informational-news should include "${baseId}" from base`,
      ).toContain(baseId);
    }
  });

  it('resolve() uses playbook generationInstruction (not base)', () => {
    const resolved = workflowRegistry.resolve('informational-news');
    expect(resolved.generationInstruction).toBe(informationalNewsWorkflow.generationInstruction);
    expect(resolved.generationInstruction).not.toBe(baseWorkflow.generationInstruction);
  });

  it('resolve() uses personal-story generationInstruction (not base)', () => {
    const resolved = workflowRegistry.resolve('personal-story');
    expect(resolved.generationInstruction).toBe(personalStoryWorkflow.generationInstruction);
    expect(resolved.generationInstruction).not.toBe(baseWorkflow.generationInstruction);
  });
});

describe('Content Post Types Playbook — WorkflowDefinition shape', () => {
  it('informational-news has all required WorkflowDefinition fields', () => {
    const wf = informationalNewsWorkflow;
    expect(typeof wf.id).toBe('string');
    expect(typeof wf.name).toBe('string');
    expect(typeof wf.description).toBe('string');
    expect(typeof wf.optimizationTarget).toBe('string');
    expect(typeof wf.extendsWorkflowId).toBe('string');
    expect(Array.isArray(wf.nodeConfigs)).toBe(true);
    expect(typeof wf.generationInstruction).toBe('string');
  });

  it('all 7 workflows share identical WorkflowDefinition shape', () => {
    const REQUIRED_FIELDS = [
      'id',
      'name',
      'description',
      'optimizationTarget',
      'extendsWorkflowId',
      'nodeConfigs',
      'generationInstruction',
    ] as const;
    for (const wf of ALL_PLAYBOOK_WORKFLOWS) {
      for (const field of REQUIRED_FIELDS) {
        expect(wf).toHaveProperty(field);
      }
    }
  });
});
