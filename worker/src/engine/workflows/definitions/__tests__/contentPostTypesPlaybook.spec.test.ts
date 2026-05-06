/**
 * worker/src/engine/workflows/definitions/__tests__/contentPostTypesPlaybook.spec.test.ts
 *
 * Integration tests verifying that the Content Post Types Playbook specification
 * is correctly implemented across documentation and workflow code.
 *
 * Spec sources:
 * - content_post_types_playbook.md: 7 structural post-type templates with arc patterns
 * - content-patterns.md: Platform algorithm patterns with cross-reference to playbook
 * - docs/plans/plan-002-post-quality-engine/architecture.md: Implementation details
 *
 * These tests FAIL if the implementation doesn't meet the spec.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Resolve paths from project root
const PROJECT_ROOT = path.resolve(__dirname, '../../../../../../');

// ─── Document paths ────────────────────────────────────────────────────────────

const CONTENT_PATTERNS_PATH = path.join(PROJECT_ROOT, 'content-patterns.md');
const CONTENT_PLAYBOOK_PATH = path.join(PROJECT_ROOT, 'content_post_types_playbook.md');

// ─── Spec constants ────────────────────────────────────────────────────────────

/**
 * The 7 post types defined in the Content Post Types Playbook.
 * Each type has an arc pattern (named sections) and specific characteristics.
 */
const EXPECTED_POST_TYPES = [
  { id: 'informational-news', name: 'Informational / News Post' },
  { id: 'week-in-review', name: 'Week in Review / Recap Post' },
  { id: 'personal-story', name: 'Personal Story Post' },
  { id: 'event-insight', name: 'Event Insight Post' },
  { id: 'trend-commentary', name: 'Industry Trend & Commentary Post' },
  { id: 'satirical', name: 'Satirical / Sarcastic Post' },
  { id: 'appreciation', name: 'Appreciation & Recognition Post' },
] as const;

// ─── Document existence tests ─────────────────────────────────────────────────

describe('Content Post Types Playbook — Documentation', () => {
  describe('markdown documents exist', () => {
    it('content_post_types_playbook.md exists', () => {
      expect(fs.existsSync(CONTENT_PLAYBOOK_PATH)).toBe(true);
    });

    it('content-patterns.md exists', () => {
      expect(fs.existsSync(CONTENT_PATTERNS_PATH)).toBe(true);
    });
  });

  describe('content_post_types_playbook.md contains all 7 post types', () => {
    let playbookContent: string;

    beforeAll(() => {
      playbookContent = fs.readFileSync(CONTENT_PLAYBOOK_PATH, 'utf-8');
    });

    it('contains Informational / News Post section', () => {
      expect(playbookContent).toContain('Informational');
      expect(playbookContent).toContain('News');
    });

    it('contains Week in Review / Recap Post section', () => {
      expect(playbookContent).toContain('Week in Review');
      expect(playbookContent).toContain('Recap');
    });

    it('contains Personal Story Post section', () => {
      expect(playbookContent).toContain('Personal Story');
    });

    it('contains Event Insight Post section', () => {
      expect(playbookContent).toContain('Event Insight');
    });

    it('contains Industry Trend & Commentary Post section', () => {
      expect(playbookContent).toContain('Industry Trend');
      expect(playbookContent).toContain('Commentary');
    });

    it('contains Satirical / Sarcastic Post section', () => {
      expect(playbookContent).toContain('Satirical');
      expect(playbookContent).toContain('Sarcastic');
    });

    it('contains Appreciation & Recognition Post section', () => {
      expect(playbookContent).toContain('Appreciation');
      expect(playbookContent).toContain('Recognition');
    });

    it('contains Table of Contents listing all 7 post types', () => {
      expect(playbookContent).toContain('Table of Contents');
      for (const postType of EXPECTED_POST_TYPES) {
        expect(playbookContent).toContain(postType.name.split(' ')[0]);
      }
    });

    it('contains Hook Formula Library section', () => {
      expect(playbookContent).toContain('Hook Formula Library');
    });

    it('contains Universal Writing Rules section', () => {
      expect(playbookContent).toContain('Universal Writing Rules');
    });
  });

  describe('content_post_types_playbook.md documents arc patterns', () => {
    let playbookContent: string;

    beforeAll(() => {
      playbookContent = fs.readFileSync(CONTENT_PLAYBOOK_PATH, 'utf-8');
    });

    it('informational-news section contains HOOK arc element', () => {
      // Search in the full content for HOOK (case insensitive)
      const upperContent = playbookContent.toUpperCase();
      // The informational news section starts after "Informational / News Post" heading
      const sectionIndex = upperContent.indexOf('THE PATTERN');
      // Search after "Informational" and before "Week in Review"
      const informIdx = playbookContent.toLowerCase().indexOf('informational');
      const weekIdx = playbookContent.toLowerCase().indexOf('week in review');
      const section = playbookContent.slice(informIdx, weekIdx);
      
      expect(section.toUpperCase()).toContain('HOOK');
    });

    it('informational-news section contains CONTEXT arc element', () => {
      const informIdx = playbookContent.toLowerCase().indexOf('informational');
      const weekIdx = playbookContent.toLowerCase().indexOf('week in review');
      const section = playbookContent.slice(informIdx, weekIdx);
      
      expect(section.toUpperCase()).toContain('CONTEXT');
    });

    it('informational-news section contains TAKE arc element', () => {
      const informIdx = playbookContent.toLowerCase().indexOf('informational');
      const weekIdx = playbookContent.toLowerCase().indexOf('week in review');
      const section = playbookContent.slice(informIdx, weekIdx);
      
      expect(section.toUpperCase()).toMatch(/TAKE|YOUR TAKE/);
    });

    it('personal-story section contains HOOK arc element', () => {
      const storyIdx = playbookContent.toLowerCase().indexOf('personal story');
      const eventIdx = playbookContent.toLowerCase().indexOf('event insight');
      const section = playbookContent.slice(storyIdx, eventIdx);
      
      expect(section.toUpperCase()).toContain('HOOK');
    });

    it('personal-story section contains TURN arc element', () => {
      const storyIdx = playbookContent.toLowerCase().indexOf('personal story');
      const eventIdx = playbookContent.toLowerCase().indexOf('event insight');
      const section = playbookContent.slice(storyIdx, eventIdx);
      
      expect(section.toUpperCase()).toContain('TURN');
    });

    it('personal-story section contains STRUGGLE arc element', () => {
      const storyIdx = playbookContent.toLowerCase().indexOf('personal story');
      const eventIdx = playbookContent.toLowerCase().indexOf('event insight');
      const section = playbookContent.slice(storyIdx, eventIdx);
      
      expect(section.toUpperCase()).toContain('STRUGGLE');
    });

    it('personal-story section contains INSIGHT arc element', () => {
      const storyIdx = playbookContent.toLowerCase().indexOf('personal story');
      const eventIdx = playbookContent.toLowerCase().indexOf('event insight');
      const section = playbookContent.slice(storyIdx, eventIdx);
      
      expect(section.toUpperCase()).toContain('INSIGHT');
    });

    it('satirical section contains SETUP arc element', () => {
      const satIdx = playbookContent.toLowerCase().indexOf('satirical');
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const section = playbookContent.slice(satIdx, apprecIdx);
      
      expect(section.toUpperCase()).toContain('SETUP');
    });

    it('satirical section contains BUILD arc element', () => {
      const satIdx = playbookContent.toLowerCase().indexOf('satirical');
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const section = playbookContent.slice(satIdx, apprecIdx);
      
      expect(section.toUpperCase()).toContain('BUILD');
    });

    it('satirical section contains PUNCHLINE arc element', () => {
      const satIdx = playbookContent.toLowerCase().indexOf('satirical');
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const section = playbookContent.slice(satIdx, apprecIdx);
      
      expect(section.toUpperCase()).toContain('PUNCHLINE');
    });

    it('appreciation section contains HOOK arc element', () => {
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const hookIdx = playbookContent.toLowerCase().indexOf('hook formula library');
      const section = playbookContent.slice(apprecIdx, hookIdx);
      
      expect(section.toUpperCase()).toContain('HOOK');
    });

    it('appreciation section contains MOMENT arc element', () => {
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const hookIdx = playbookContent.toLowerCase().indexOf('hook formula library');
      const section = playbookContent.slice(apprecIdx, hookIdx);
      
      expect(section.toUpperCase()).toContain('MOMENT');
    });

    it('appreciation section contains MATTERS arc element', () => {
      const apprecIdx = playbookContent.toLowerCase().indexOf('appreciation');
      const hookIdx = playbookContent.toLowerCase().indexOf('hook formula library');
      const section = playbookContent.slice(apprecIdx, hookIdx);
      
      expect(section.toUpperCase()).toMatch(/MATTER/);
    });
  });

  describe('content_patterns.md contains cross-reference to playbook', () => {
    let patternsContent: string;

    beforeAll(() => {
      patternsContent = fs.readFileSync(CONTENT_PATTERNS_PATH, 'utf-8');
    });

    it('contains cross-reference to content_post_types_playbook.md', () => {
      expect(patternsContent).toContain('content_post_types_playbook.md');
    });

    it('explains the relationship between the two documents', () => {
      // Should explain that patterns is for platform/algorithm, playbook is for structure
      expect(patternsContent).toContain('Cross-Reference');
      expect(patternsContent).toContain('Content Post Types Playbook');
    });

    it('mentions the 7 post types in the cross-reference', () => {
      expect(patternsContent).toContain('7');
      expect(patternsContent).toContain('post type');
    });

    it('mentions workflow implementation location', () => {
      expect(patternsContent).toContain('worker/src/engine/workflows/definitions');
    });
  });

  describe('content_post_types_playbook.md contains cross-reference to patterns', () => {
    let playbookContent: string;

    beforeAll(() => {
      playbookContent = fs.readFileSync(CONTENT_PLAYBOOK_PATH, 'utf-8');
    });

    it('contains cross-reference section at end of document', () => {
      expect(playbookContent).toContain('Cross-Reference');
      expect(playbookContent).toContain('Related Documents');
    });

    it('references content-patterns.md in cross-reference', () => {
      expect(playbookContent).toContain('content-patterns.md');
    });

    it('describes the role of content-patterns.md', () => {
      expect(playbookContent).toContain('Platform algorithm');
      expect(playbookContent).toContain('engagement');
    });
  });
});

// ─── Workflow implementation tests ────────────────────────────────────────────

describe('Content Post Types Playbook — Workflow Implementation', () => {
  // Import workflows directly
  let workflows: any = {};

  beforeAll(async () => {
    const informationalModule = await import('../informational-news');
    const personalStoryModule = await import('../personal-story');
    const weekInReviewModule = await import('../week-in-review');
    const eventInsightModule = await import('../event-insight');
    const trendCommentaryModule = await import('../trend-commentary');
    const satiricalModule = await import('../satirical');
    const appreciationModule = await import('../appreciation');

    workflows.informationalNews = informationalModule.informationalNewsWorkflow;
    workflows.personalStory = personalStoryModule.personalStoryWorkflow;
    workflows.weekInReview = weekInReviewModule.weekInReviewWorkflow;
    workflows.eventInsight = eventInsightModule.eventInsightWorkflow;
    workflows.trendCommentary = trendCommentaryModule.trendCommentaryWorkflow;
    workflows.satirical = satiricalModule.satiricalWorkflow;
    workflows.appreciation = appreciationModule.appreciationWorkflow;
  });

  describe('all 7 post types are implemented as workflows', () => {
    it('informational-news workflow is importable', () => {
      expect(workflows.informationalNews).toBeDefined();
    });

    it('personal-story workflow is importable', () => {
      expect(workflows.personalStory).toBeDefined();
    });

    it('week-in-review workflow is importable', () => {
      expect(workflows.weekInReview).toBeDefined();
    });

    it('event-insight workflow is importable', () => {
      expect(workflows.eventInsight).toBeDefined();
    });

    it('trend-commentary workflow is importable', () => {
      expect(workflows.trendCommentary).toBeDefined();
    });

    it('satirical workflow is importable', () => {
      expect(workflows.satirical).toBeDefined();
    });

    it('appreciation workflow is importable', () => {
      expect(workflows.appreciation).toBeDefined();
    });
  });

  describe('workflow IDs match spec document titles', () => {
    it('informational-news has correct ID', () => {
      expect(workflows.informationalNews.id).toBe('informational-news');
      expect(workflows.informationalNews.name).toContain('Informational');
      expect(workflows.informationalNews.name).toContain('News');
    });

    it('week-in-review has correct ID', () => {
      expect(workflows.weekInReview.id).toBe('week-in-review');
      expect(workflows.weekInReview.name).toContain('Week');
      expect(workflows.weekInReview.name).toContain('Review');
    });

    it('personal-story has correct ID', () => {
      expect(workflows.personalStory.id).toBe('personal-story');
      expect(workflows.personalStory.name).toContain('Personal Story');
    });

    it('event-insight has correct ID', () => {
      expect(workflows.eventInsight.id).toBe('event-insight');
      expect(workflows.eventInsight.name).toContain('Event Insight');
    });

    it('trend-commentary has correct ID', () => {
      expect(workflows.trendCommentary.id).toBe('trend-commentary');
      expect(workflows.trendCommentary.name).toContain('Trend');
      expect(workflows.trendCommentary.name).toContain('Commentary');
    });

    it('satirical has correct ID', () => {
      expect(workflows.satirical.id).toBe('satirical');
      expect(workflows.satirical.name).toContain('Satirical');
    });

    it('appreciation has correct ID', () => {
      expect(workflows.appreciation.id).toBe('appreciation');
      expect(workflows.appreciation.name).toContain('Appreciation');
    });
  });

  describe('arc patterns from spec are embedded in generationInstructions', () => {
    describe('informational-news arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.informationalNews.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains CONTEXT', () => {
        const inst = workflows.informationalNews.generationInstruction.toUpperCase();
        expect(inst).toContain('CONTEXT');
      });

      it('generationInstruction contains TAKE (or YOUR TAKE)', () => {
        const inst = workflows.informationalNews.generationInstruction.toUpperCase();
        // Should contain TAKE (for "YOUR TAKE" section)
        expect(inst).toMatch(/TAKE|YOUR TAKE/);
      });

      it('generationInstruction mentions leading with the news', () => {
        expect(workflows.informationalNews.generationInstruction.toLowerCase()).toContain('news');
      });
    });

    describe('personal-story arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.personalStory.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains TURN', () => {
        const inst = workflows.personalStory.generationInstruction.toUpperCase();
        expect(inst).toContain('TURN');
      });

      it('generationInstruction contains STRUGGLE', () => {
        const inst = workflows.personalStory.generationInstruction.toUpperCase();
        expect(inst).toContain('STRUGGLE');
      });

      it('generationInstruction contains INSIGHT', () => {
        const inst = workflows.personalStory.generationInstruction.toUpperCase();
        expect(inst).toContain('INSIGHT');
      });

      it('generationInstruction emphasizes specific details', () => {
        const inst = workflows.personalStory.generationInstruction.toLowerCase();
        expect(inst).toContain('specific');
      });
    });

    describe('week-in-review arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.weekInReview.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains RECAP', () => {
        const inst = workflows.weekInReview.generationInstruction.toUpperCase();
        expect(inst).toContain('RECAP');
      });

      it('generationInstruction contains META', () => {
        const inst = workflows.weekInReview.generationInstruction.toUpperCase();
        expect(inst).toContain('META');
      });

      it('generationInstruction mentions specific details', () => {
        const inst = workflows.weekInReview.generationInstruction.toLowerCase();
        expect(inst).toContain('specific');
      });
    });

    describe('event-insight arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.eventInsight.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains CONTEXT', () => {
        const inst = workflows.eventInsight.generationInstruction.toUpperCase();
        expect(inst).toContain('CONTEXT');
      });

      it('generationInstruction contains INSIGHT', () => {
        const inst = workflows.eventInsight.generationInstruction.toUpperCase();
        expect(inst).toContain('INSIGHT');
      });

      it('generationInstruction mentions quoting real things', () => {
        expect(workflows.eventInsight.generationInstruction.toLowerCase()).toContain('quote');
      });
    });

    describe('trend-commentary arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.trendCommentary.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains EVIDENCE', () => {
        const inst = workflows.trendCommentary.generationInstruction.toUpperCase();
        expect(inst).toContain('EVIDENCE');
      });

      it('generationInstruction contains SHIFT', () => {
        const inst = workflows.trendCommentary.generationInstruction.toUpperCase();
        expect(inst).toContain('SHIFT');
      });

      it('generationInstruction contains IMPLICATION', () => {
        const inst = workflows.trendCommentary.generationInstruction.toUpperCase();
        expect(inst).toContain('IMPLICATION');
      });
    });

    describe('satirical arc pattern', () => {
      it('generationInstruction contains SETUP', () => {
        const inst = workflows.satirical.generationInstruction.toUpperCase();
        expect(inst).toContain('SETUP');
      });

      it('generationInstruction contains BUILD', () => {
        const inst = workflows.satirical.generationInstruction.toUpperCase();
        expect(inst).toContain('BUILD');
      });

      it('generationInstruction contains PUNCHLINE', () => {
        const inst = workflows.satirical.generationInstruction.toUpperCase();
        expect(inst).toContain('PUNCHLINE');
      });

      it('generationInstruction mentions not punching at people', () => {
        const inst = workflows.satirical.generationInstruction.toLowerCase();
        expect(inst).toContain('people') || inst.toContain('at ideas');
      });

      it('generationInstruction emphasizes specificity', () => {
        const inst = workflows.satirical.generationInstruction.toLowerCase();
        expect(inst).toContain('specific');
      });
    });

    describe('appreciation arc pattern', () => {
      it('generationInstruction contains HOOK', () => {
        const inst = workflows.appreciation.generationInstruction.toUpperCase();
        expect(inst).toContain('HOOK');
      });

      it('generationInstruction contains MOMENT', () => {
        const inst = workflows.appreciation.generationInstruction.toUpperCase();
        expect(inst).toContain('MOMENT');
      });

      it('generationInstruction contains MATTERS', () => {
        const inst = workflows.appreciation.generationInstruction.toUpperCase();
        expect(inst).toContain('MATTERS') || inst.toContain('MATTER');
      });

      it('generationInstruction emphasizes specificity', () => {
        const inst = workflows.appreciation.generationInstruction.toLowerCase();
        expect(inst).toContain('specific');
      });
    });
  });

  describe('workflow descriptions match spec document descriptions', () => {
    it('informational-news description matches spec', () => {
      // Spec says: "You share something that happened — a piece of news, a report, a stat"
      const desc = workflows.informationalNews.description.toLowerCase();
      expect(desc).toMatch(/news|information|report|stat/);
    });

    it('personal-story description matches spec', () => {
      // Spec says: "A narrative drawn from your own life or career that contains a lesson"
      const desc = workflows.personalStory.description.toLowerCase();
      expect(desc).toMatch(/narrative|story|lesson/);
    });

    it('week-in-review description matches spec', () => {
      // Spec says: "A structured look back at what happened"
      const desc = workflows.weekInReview.description.toLowerCase();
      expect(desc).toMatch(/recap|review|week|look back/);
    });

    it('event-insight description matches spec', () => {
      // Spec says: "You attended something — a conference, a panel, a meeting, an event"
      const desc = workflows.eventInsight.description.toLowerCase();
      expect(desc).toMatch(/event|conference|attend/);
    });

    it('trend-commentary description matches spec', () => {
      // Spec says: "You identify a pattern — something shifting, emerging, declining, or accelerating"
      const desc = workflows.trendCommentary.description.toLowerCase();
      expect(desc).toMatch(/pattern|shift|trend|industry/);
    });

    it('satirical description matches spec', () => {
      // Spec says: "You critique, mock, or gently skewer something absurd"
      const desc = workflows.satirical.description.toLowerCase();
      expect(desc).toMatch(/critique|humour|humor|absurd|skewer/);
    });

    it('appreciation description matches spec', () => {
      // Spec says: "You publicly acknowledge someone — a colleague, a mentor, a team member"
      const desc = workflows.appreciation.description.toLowerCase();
      expect(desc).toMatch(/acknowledg|recognit|appreciat/);
    });
  });

  describe('optimization targets align with spec goals', () => {
    it('informational-news optimizes for credibility and insight delivery', () => {
      const target = workflows.informationalNews.optimizationTarget.toLowerCase();
      expect(target).toMatch(/credibility|insight/);
    });

    it('personal-story optimizes for emotional connection', () => {
      const target = workflows.personalStory.optimizationTarget.toLowerCase();
      expect(target).toMatch(/emotional|story|engagement/);
    });

    it('week-in-review optimizes for consistency and relatability', () => {
      const target = workflows.weekInReview.optimizationTarget.toLowerCase();
      expect(target).toMatch(/consistency|relatab|recurring/);
    });

    it('event-insight optimizes for authority', () => {
      const target = workflows.eventInsight.optimizationTarget.toLowerCase();
      expect(target).toMatch(/authorit|perspective/);
    });

    it('trend-commentary optimizes for thought leadership', () => {
      const target = workflows.trendCommentary.optimizationTarget.toLowerCase();
      expect(target).toMatch(/thought|leadership|authority/);
    });

    it('satirical optimizes for shareability and personality', () => {
      const target = workflows.satirical.optimizationTarget.toLowerCase();
      expect(target).toMatch(/share|personality|memorable/);
    });

    it('appreciation optimizes for genuine connection', () => {
      const target = workflows.appreciation.optimizationTarget.toLowerCase();
      expect(target).toMatch(/genuine|connection|recognition|community/);
    });
  });

  describe('all workflows extend base workflow', () => {
    it('informational-news extends base workflow', () => {
      expect(workflows.informationalNews.extendsWorkflowId).toBe('base');
    });

    it('personal-story extends base workflow', () => {
      expect(workflows.personalStory.extendsWorkflowId).toBe('base');
    });

    it('week-in-review extends base workflow', () => {
      expect(workflows.weekInReview.extendsWorkflowId).toBe('base');
    });

    it('event-insight extends base workflow', () => {
      expect(workflows.eventInsight.extendsWorkflowId).toBe('base');
    });

    it('trend-commentary extends base workflow', () => {
      expect(workflows.trendCommentary.extendsWorkflowId).toBe('base');
    });

    it('satirical extends base workflow', () => {
      expect(workflows.satirical.extendsWorkflowId).toBe('base');
    });

    it('appreciation extends base workflow', () => {
      expect(workflows.appreciation.extendsWorkflowId).toBe('base');
    });
  });

  describe('all workflows have critical draft-generator node', () => {
    it('informational-news has critical draft-generator node', () => {
      const draftGen = workflows.informationalNews.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('personal-story has critical draft-generator node', () => {
      const draftGen = workflows.personalStory.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('week-in-review has critical draft-generator node', () => {
      const draftGen = workflows.weekInReview.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('event-insight has critical draft-generator node', () => {
      const draftGen = workflows.eventInsight.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('trend-commentary has critical draft-generator node', () => {
      const draftGen = workflows.trendCommentary.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('satirical has critical draft-generator node', () => {
      const draftGen = workflows.satirical.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });

    it('appreciation has critical draft-generator node', () => {
      const draftGen = workflows.appreciation.nodeConfigs.find((c: any) => c.nodeId === 'draft-generator');
      expect(draftGen).toBeDefined();
      expect(draftGen.importance).toBe('critical');
    });
  });
});

// ─── Template structure tests ──────────────────────────────────────────────────

describe('Content Post Types Playbook — Template Structure', () => {
  let playbookContent: string;

  beforeAll(() => {
    playbookContent = fs.readFileSync(CONTENT_PLAYBOOK_PATH, 'utf-8');
  });

  describe('spec documents contain fill-in templates', () => {
    it('contains Template sections for post types', () => {
      expect(playbookContent).toContain('Template');
    });

    it('contains emoji markers for visual organization (as per spec)', () => {
      // Spec uses emojis like 📌, ✅, 📉, 💡 for templates
      const hasEmojis = /[📌✅📉💡📚🙋]/.test(playbookContent);
      expect(hasEmojis).toBe(true);
    });

    it('contains example hooks for each post type', () => {
      // Use case-insensitive search
      expect(playbookContent.toUpperCase()).toContain('EXAMPLE');
      expect(playbookContent.toLowerCase()).toContain('hook');
    });

    it('contains "What it is" sections defining each post type', () => {
      expect(playbookContent).toContain('What it is');
    });

    it('contains "Why it works" sections explaining psychology', () => {
      expect(playbookContent).toContain('Why it works');
    });
  });
});

// ─── Cross-reference consistency tests ────────────────────────────────────────

describe('Content Post Types Playbook — Cross-Reference Consistency', () => {
  let patternsContent: string;
  let playbookContent: string;

  beforeAll(() => {
    patternsContent = fs.readFileSync(CONTENT_PATTERNS_PATH, 'utf-8');
    playbookContent = fs.readFileSync(CONTENT_PLAYBOOK_PATH, 'utf-8');
  });

  describe('both documents reference each other', () => {
    it('content-patterns.md mentions content_post_types_playbook.md', () => {
      expect(patternsContent).toContain('content_post_types_playbook.md');
    });

    it('content_post_types_playbook.md mentions content-patterns.md', () => {
      expect(playbookContent).toContain('content-patterns.md');
    });
  });

  describe('both documents describe their distinct roles', () => {
    it('playbook describes itself as structural template layer', () => {
      // Spec says: "The Content Post Types Playbook is the structural template layer"
      expect(playbookContent).toContain('structural');
      expect(playbookContent).toContain('template');
    });

    it('playbook describes patterns as platform algorithm layer', () => {
      // Spec says: "content-patterns.md is the platform-algorithm layer"
      expect(playbookContent).toMatch(/platform|algorithm/);
    });
  });

  describe('both documents agree on 7 post types', () => {
    it('content-patterns.md mentions 7 post types', () => {
      expect(patternsContent).toContain('7');
    });

    it('content_post_types_playbook.md has 7 distinct sections', () => {
      let count = 0;
      for (const postType of EXPECTED_POST_TYPES) {
        const name = postType.name.split(' ')[0]; // First word of name
        if (playbookContent.includes(name)) count++;
      }
      expect(count).toBe(7);
    });
  });
});
