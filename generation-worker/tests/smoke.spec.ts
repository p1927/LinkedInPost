/**
 * Smoke test — generation-worker pipeline end-to-end.
 *
 * Runs the full content pipeline via POST /v1/generate and verifies:
 *   - variants are returned
 *   - review verdict is present
 *   - hashtags are extracted
 *   - image candidates are present (unless skipped)
 *
 * Prerequisites:
 *   1. Generate API keys (see generation-worker/.dev.vars.example) and copy to .dev.vars
 *   2. Run: npm run test:smoke
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8788';

const REQUEST_BODY = {
  topic: 'AI productivity',
  channel: 'linkedin',
  audience: 'professionals',
  tone: 'opinionated',
  factual: false,
  skipImages: false,
};

test.describe('generation-worker pipeline smoke test', () => {
  test('generateContent returns variants, review, hashtags, and image candidates', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/generate`, {
      headers: { 'Content-Type': 'application/json' },
      data: REQUEST_BODY,
    });

    // The server must be running
    expect(response.status(), `${BASE_URL} is unreachable — is "npm run dev" running in generation-worker/?`).toBe(200);

    const body = await response.json();

    // ── variants ────────────────────────────────────────────────
    expect(body, 'response must be a plain object').toBeInstanceOf(Object);
    expect(body.runId, 'runId must be a non-empty string').toBeTruthy();

    expect(Array.isArray(body.variants), 'variants must be an array').toBe(true);
    expect(body.variants.length, 'variants must contain at least one variant').toBeGreaterThan(0);
    expect(body.variants[0].text, 'first variant must have non-empty text').toBeTruthy();
    expect(body.variants[0].label, 'first variant must have a label').toBeTruthy();

    // ── pattern selection ───────────────────────────────────────
    expect(body.primaryPatternId, 'primaryPatternId must be set').toBeTruthy();
    expect(body.patternRationale, 'patternRationale must be set').toBeTruthy();

    // ── requirement report ───────────────────────────────────────
    expect(body.requirementReport, 'requirementReport must be present').toBeTruthy();
    expect(body.requirementReport.topic, 'requirementReport.topic must match request').toBe('AI productivity');

    // ── review ─────────────────────────────────────────────────
    expect(body.review, 'review must be present').toBeTruthy();
    expect(body.review.verdict, 'review.verdict must be pass|flag|block').toMatch(/^(pass|flag|block)$/);
    expect(Array.isArray(body.review.issues), 'review.issues must be an array').toBe(true);

    // ── hashtags ────────────────────────────────────────────────
    expect(Array.isArray(body.hashtags), 'hashtags must be an array').toBe(true);
    expect(body.hashtags.length, 'hashtags must not be empty').toBeGreaterThan(0);

    // ── image candidates ────────────────────────────────────────
    expect(Array.isArray(body.imageCandidates), 'imageCandidates must be an array').toBe(true);
    expect(body.imageCandidates.length, 'at least one image candidate expected').toBeGreaterThan(0);
    expect(body.imageCandidates[0].visualBrief, 'first image candidate must have a visualBrief').toBeTruthy();

    // ── trace (pipeline metadata) ───────────────────────────────
    expect(body.trace, 'trace must be present').toBeTruthy();
    expect(typeof body.trace === 'object', 'trace must be an object').toBe(true);

    // ── quality scores ──────────────────────────────────────────
    expect(body.trace.qualityScores, 'qualityScores must be in trace').toBeDefined();
    const qs = body.trace.qualityScores as Array<{ overall: number; passed: boolean }>;
    expect(Array.isArray(qs), 'qualityScores must be an array').toBe(true);
    expect(qs.length, 'qualityScores must have one entry per variant').toBe(body.variants.length);
    expect(qs[0].overall, 'overall quality score must be 0-100').toBeGreaterThanOrEqual(0);
    expect(qs[0].overall, 'overall quality score must be 0-100').toBeLessThanOrEqual(100);
  });

  test('generateContent with skipImages=true returns no image candidates', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/generate`, {
      headers: { 'Content-Type': 'application/json' },
      data: { ...REQUEST_BODY, skipImages: true },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.imageCandidates).toHaveLength(0);
    expect(body.trace.imageRelator, 'imageRelator should be "skipped" in trace').toBe('skipped');
  });

  test('GET /v1/patterns returns pattern list', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/v1/patterns`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.patterns)).toBe(true);
    expect(body.patterns.length, 'at least one pattern must be defined').toBeGreaterThan(0);
    expect(body.patterns[0].id).toBeTruthy();
    expect(body.patterns[0].name).toBeTruthy();
  });
});
