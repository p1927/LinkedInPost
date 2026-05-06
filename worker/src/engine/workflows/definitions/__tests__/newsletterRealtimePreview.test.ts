/**
 * worker/src/engine/workflows/definitions/__tests__/newsletterRealtimePreview.test.ts
 *
 * Unit tests for the Newsletter Real-Time Preview post type.
 *
 * Spec source: content_post_types_playbook.md § 8 "The Newsletter Real-Time Preview"
 * Cross-ref: content-patterns.md, docs/plans/plan-002-post-quality-engine/architecture.md
 *
 * These tests FAIL if the implementation doesn't meet the spec.
 * Test pattern follows existing vitest conventions in:
 *   worker/src/engine/workflows/definitions/__tests__/postTypesPlaybook.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';

import { baseWorkflow } from '../base';
import { workflowRegistry } from '../../../registry/WorkflowRegistry';
import { setupBuiltinWorkflows } from '../../registry-setup';

// ─── Newsletter post-type constants ────────────────────────────────────────────

/**
 * The Newsletter Real-Time Preview is the 8th post type in the playbook.
 * Spec (content_post_types_playbook.md § 8):
 *   "A preview of a newsletter edition rendered live — showing the subject line,
 *    issue number, opening hook, featured article summaries, and a call-to-action —
 *    in the same format the reader will receive it in their inbox."
 */
const NEWSLETTER_ID = 'newsletter-realtime-preview';
const NEWSLETTER_NAME = 'Newsletter Real-Time Preview';
const EXPECTED_ARC_KEYWORDS = ['SUBJECT LINE', 'OPENING HOOK', 'ISSUE CONTEXT', 'ARTICLE PREVIEWS', 'VOICE SAMPLE', 'CLOSE', 'CTA'] as const;

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Newsletter Real-Time Preview — spec compliance', () => {
  // ─── 1. Workflow is importable ───────────────────────────────────────────────

  describe('exports', () => {
    it('newsletter-realtime-preview workflow is registered and importable', async () => {
      setupBuiltinWorkflows();
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(entry, `workflow "${NEWSLETTER_ID}" must be registered`).toBeDefined();
    });

    it('workflow id is "newsletter-realtime-preview"', async () => {
      setupBuiltinWorkflows();
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(entry?.id).toBe(NEWSLETTER_ID);
    });

    it('workflow name matches the spec document heading', async () => {
      setupBuiltinWorkflows();
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(entry?.name).toBe(NEWSLETTER_NAME);
    });

    it('workflow has a non-empty description', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(entry?.description).toBeDefined();
      expect(typeof entry?.description).toBe('string');
      expect(entry?.description.trim().length).toBeGreaterThan(0);
    });
  });

  // ─── 2. Identifier and meta fields ───────────────────────────────────────────

  describe('identifiers and meta fields', () => {
    it('id is non-empty string', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(typeof entry?.id).toBe('string');
      expect(entry?.id.trim().length).toBeGreaterThan(0);
    });

    it('name is non-empty string', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(typeof entry?.name).toBe('string');
      expect(entry?.name.trim().length).toBeGreaterThan(0);
    });

    it('optimizationTarget is non-empty string', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(typeof entry?.optimizationTarget).toBe('string');
      expect(entry?.optimizationTarget.trim().length).toBeGreaterThan(0);
    });

    it('description is non-empty string', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(typeof entry?.description).toBe('string');
      expect(entry?.description.trim().length).toBeGreaterThan(0);
    });
  });

  // ─── 3. Extends base workflow ──────────────────────────────────────────────────

  describe('extends base workflow', () => {
    it('extendsWorkflowId is "base"', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(entry?.extendsWorkflowId).toBe('base');
    });
  });

  // ─── 4. nodeConfigs structure is valid ──────────────────────────────────────

  describe('nodeConfigs structure', () => {
    it('has a non-empty nodeConfigs array', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(Array.isArray(entry?.nodeConfigs)).toBe(true);
      expect(entry?.nodeConfigs.length).toBeGreaterThan(0);
    });

    it('every nodeConfig has a non-empty nodeId string', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      for (const config of entry?.nodeConfigs ?? []) {
        expect(typeof config.nodeId).toBe('string');
        expect(config.nodeId.trim().length).toBeGreaterThan(0);
      }
    });

    it('every nodeConfig has a valid ImportanceLevel', () => {
      const VALID = ['critical', 'important', 'supporting', 'background', 'off'];
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      for (const config of entry?.nodeConfigs ?? []) {
        expect(VALID).toContain(config.importance);
      }
    });

    it('every nodeConfig has a dependsOn array', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      for (const config of entry?.nodeConfigs ?? []) {
        expect(Array.isArray(config.dependsOn)).toBe(true);
      }
    });

    it('draft-generator is critical', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      const draftGen = entry?.nodeConfigs.find((c) => c.nodeId === 'draft-generator');
      expect(draftGen, 'newsletter workflow must include draft-generator').toBeDefined();
      expect(draftGen!.importance).toBe('critical');
    });

    it('has at least one critical node', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      const hasCritical = entry?.nodeConfigs.some((c) => c.importance === 'critical');
      expect(hasCritical, 'newsletter workflow must have ≥1 critical node').toBe(true);
    });
  });

  // ─── 5. generationInstruction embeds arc patterns ────────────────────────────

  describe('generationInstruction embeds arc patterns', () => {
    it('has a non-empty generationInstruction', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(typeof entry?.generationInstruction).toBe('string');
      expect(entry?.generationInstruction.trim().length).toBeGreaterThan(0);
    });

    it('instruction contains a named arc pattern keyword (STRUCTURE:)', () => {
      const entry = workflowRegistry.get(NEWSLETTER_ID);
      expect(
        entry?.generationInstruction.toUpperCase(),
        'generationInstruction must embed a named arc pattern (e.g. STRUCTURE:)',
      ).toContain('STRUCTURE');
    });

    it('instruction contains SUBJECT LINE arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('SUBJECT LINE');
    });

    it('instruction contains OPENING HOOK arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('OPENING HOOK');
    });

    it('instruction contains ISSUE CONTEXT arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('ISSUE CONTEXT');
    });

    it('instruction contains ARTICLE PREVIEWS arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('ARTICLE PREVIEWS');
    });

    it('instruction contains VOICE SAMPLE arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('VOICE SAMPLE');
    });

    it('instruction contains CLOSE arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('CLOSE');
    });

    it('instruction contains CTA arc element', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      expect(inst).toContain('CTA');
    });

    it('instruction covers all 7 arc elements from the spec pattern', () => {
      const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toUpperCase() ?? '';
      for (const keyword of EXPECTED_ARC_KEYWORDS) {
        expect(inst, `generationInstruction must contain "${keyword}"`).toContain(keyword);
      }
    });
  });

  // ─── 6. Optimization target reflects newsletter goal ──────────────────────────

  describe('optimization target reflects newsletter goal', () => {
    it('optimizationTarget mentions subscription intent or preview quality', () => {
      const target = workflowRegistry.get(NEWSLETTER_ID)?.optimizationTarget.toLowerCase() ?? '';
      // Spec § 8 says the newsletter preview "creates a direct connection between the
      // newsletter's promise and the reader's inbox — building trust and reducing
      // the friction of committing to a subscription."
      expect(
        target,
        'optimizationTarget should reflect trust/subscription intent or preview quality',
      ).toMatch(/subscription|trust|preview|inbox|commit|cadence/);
    });
  });

  // ─── 7. Description matches spec intent ─────────────────────────────────────

  describe('description matches spec intent', () => {
    it('description captures the live preview concept', () => {
      const desc = workflowRegistry.get(NEWSLETTER_ID)?.description.toLowerCase() ?? '';
      // Spec § 8: "A preview of a newsletter edition rendered live — showing the
      // subject line, issue number, opening hook, featured article summaries,
      // and a call-to-action — in the same format the reader will receive it."
      expect(
        desc,
        'description should mention preview, live, subject line, issue, or inbox',
      ).toMatch(/preview|newsletter|subject|issue|inbox|live/);
    });
  });
});

describe('Newsletter Real-Time Preview — registry integration', () => {
  beforeAll(() => {
    setupBuiltinWorkflows();
  });

  it('workflow is registered via get()', () => {
    const entry = workflowRegistry.get(NEWSLETTER_ID);
    expect(entry).toBeDefined();
  });

  it('registry.resolve() succeeds', () => {
    const resolved = workflowRegistry.resolve(NEWSLETTER_ID);
    expect(resolved).toBeDefined();
    expect(resolved.id).toBe(NEWSLETTER_ID);
  });

  it('resolve() inherits base nodeConfigs', () => {
    const resolved = workflowRegistry.resolve(NEWSLETTER_ID);
    const baseIds = baseWorkflow.nodeConfigs.map((c: { nodeId: string }) => c.nodeId);
    const resolvedIds = resolved.nodeConfigs.map((c: { nodeId: string }) => c.nodeId);
    for (const baseId of baseIds) {
      expect(
        resolvedIds,
        `resolved ${NEWSLETTER_ID} should include "${baseId}" from base`,
      ).toContain(baseId);
    }
  });

  it('resolve() uses newsletter generationInstruction (not base)', () => {
    const resolved = workflowRegistry.resolve(NEWSLETTER_ID);
    expect(resolved.generationInstruction).not.toBe('');
    expect(resolved.generationInstruction).not.toBe(baseWorkflow.generationInstruction);
  });
});

describe('Newsletter Real-Time Preview — WorkflowDefinition shape', () => {
  it('has all required WorkflowDefinition fields', () => {
    const entry = workflowRegistry.get(NEWSLETTER_ID);
    expect(typeof entry?.id).toBe('string');
    expect(typeof entry?.name).toBe('string');
    expect(typeof entry?.description).toBe('string');
    expect(typeof entry?.optimizationTarget).toBe('string');
    expect(typeof entry?.extendsWorkflowId).toBe('string');
    expect(Array.isArray(entry?.nodeConfigs)).toBe(true);
    expect(typeof entry?.generationInstruction).toBe('string');
  });
});

describe('Newsletter Real-Time Preview — Template completeness', () => {
  it('generationInstruction mentions subject line', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(inst, 'generationInstruction should mention subject line').toContain('subject');
  });

  it('generationInstruction mentions issue number', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(inst, 'generationInstruction should mention issue').toContain('issue');
  });

  it('generationInstruction mentions CTA / call-to-action', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(inst, 'generationInstruction should mention CTA').toContain('cta');
  });

  it('generationInstruction mentions hook', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(inst, 'generationInstruction should mention hook').toContain('hook');
  });

  it('generationInstruction mentions voice or tone', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(
      inst,
      'generationInstruction should mention voice or tone to capture editorial quality',
    ).toMatch(/voice|tone|editorial/);
  });

  it('generationInstruction mentions article previews or summaries', () => {
    const inst = workflowRegistry.get(NEWSLETTER_ID)?.generationInstruction.toLowerCase() ?? '';
    expect(
      inst,
      'generationInstruction should mention article previews or summaries',
    ).toMatch(/article|preview|summary/);
  });
});
