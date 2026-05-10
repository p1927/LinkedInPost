/**
 * Mock helpers for the setup wizard's Express API (`/api/setup/*` on port 3456).
 *
 * The wizard runs in the real browser at `localhost:3456/setup`. Each test
 * calls `setupSetupApiMocks(page, overrides)` BEFORE navigating to install
 * route handlers that intercept every `/api/setup/*` request. Tests can then:
 *
 *   • Override individual endpoint responses (e.g. force a Cloudflare
 *     validation failure)
 *   • Inspect the `calls[]` array to assert on what the wizard sent
 *   • Pre-seed setup state for resume scenarios
 *
 * No real Express server is hit during tests.
 *
 * ⚠️  Timing requirement: After calling `setupSetupApiMocks`, the test MUST
 * call `await page.waitForLoadState('domcontentloaded')` before navigating
 * to the wizard. `Promise.all([page.route(...)])` returns before Chromium's
 * route handler table is fully updated, so without this explicit wait the
 * wizard's `fetch()` calls may bypass the mock handlers and hit the real
 * server. Always pair with a follow-up `await page.waitForTimeout(2000)`
 * after navigation to allow the wizard's async state chain
 * (project-path → state → render) to complete.
 */

import type { Page, Route     }
  }

  // PREVIEW_CHANNEL_OPTIONS — non-empty array of { value, label }
  const previewChannels = result.PREVIEW_CHANNEL_OPTIONS;
  if (!Array.isArray(previewChannels)) {
    failures.push({ name: 'PREVIEW_CHANNEL_OPTIONS', error: 'not an array' });
  } else if (previewChannels.length === 0) {
    failures.push({ name: 'PREVIEW_CHANNEL_OPTIONS', error: 'empty array' });
  } else {
    for (const pc of previewChannels) {
      if (!pc || typeof pc !== 'object') { failures.push({ name: 'PREVIEW_CHANNEL_OPTIONS entry', error: 'not an object' }); break; }
      if (!('value' in pc) || typeof pc.value !== 'string') failures.push({ name: 'PREVIEW_CHANNEL_OPTIONS[].value', error: 'missing or non-string' });
      if (!('label' in pc) || typeof pc.label !== 'string') failures.push({ name: 'PREVIEW_CHANNEL_OPTIONS[].label', error: 'missing or non-string' });
    }
  }

  // COLOR_OPTIONS — non-empty array
  const colors = result.COLOR_OPTIONS;
  if (!Array.isArray(colors) || colors.length === 0) {
    failures.push({ name: 'COLOR_OPTIONS', error: 'not a non-empty array' });
  } else {
    for (const c of colors) {
      if (!c || typeof c !== 'object') { failures.push({ name: 'COLOR_OPTIONS entry', error: 'not an object' }); break; }
      if (!('value' in c) || typeof c.value !== 'string') failures.push({ name: 'COLOR_OPTIONS[].value', error: 'missing or non-string' });
      if (!('label' in c) || typeof c.label !== 'string') failures.push({ name: 'COLOR_OPTIONS[].label', error: 'missing or non-string' });
    }
  }

  // STORY_OPTIONS — non-empty array
  const stories = result.STORY_OPTIONS;
  if (!Array.isArray(stories) || stories.length === 0) {
    failures.push({ name: 'STORY_OPTIONS', error: 'not a non-empty array' });
  } else {
    for (const s of stories) {
      if (!s || typeof s !== 'object') { failures.push({ name: 'STORY_OPTIONS entry', error: 'not an object' }); break; }
      if (!('value' in s) || typeof s.value !== 'string') failures.push({ name: 'STORY_OPTIONS[].value', error: 'missing or non-string' });
      if (!('label' in s) || typeof s.label !== 'string') failures.push({ name: 'STORY_OPTIONS[].label', error: 'missing or non-string' });
    }
  }

  // CHANNEL_SEND_OPTIONS — non-empty array
  const sendOptions = result.CHANNEL_SEND_OPTIONS;
  if (!Array.isArray(sendOptions) || sendOptions.length === 0) {
    failures.push({ name: 'CHANNEL_SEND_OPTIONS', error: 'not a non-empty array' });
  } else {
    for (const s of sendOptions) {
      if (!s || typeof s !== 'object') { failures.push({ name: 'CHANNEL_SEND_OPTIONS entry', error: 'not an object' }); break; }
      if (!('value' in s) || typeof s.value !== 'string') failures.push({ name: 'CHANNEL_SEND_OPTIONS[].value', error: 'missing or non-string' });
      if (!('label' in s) || typeof s.label !== 'string') failures.push({ name: 'CHANNEL_SEND_OPTIONS[].label', error: 'missing or non-string' });
    }
  }

  // NEWS_API_PROVIDERS — non-empty array
  const providers = result.NEWS_API_PROVIDERS;
  if (!Array.isArray(providers) || providers.length === 0) {
    failures.push({ name: 'NEWS_API_PROVIDERS', error: 'not a non-empty array' });
  } else {
    for (const p of providers) {
      if (!p || typeof p !== 'object') { failures.push({ name: 'NEWS_API_PROVIDERS entry', error: 'not an object' }); break; }
      if (!('value' in p) || typeof p.value !== 'string') failures.push({ name: 'NEWS_API_PROVIDERS[].value', error: 'missing or non-string' });
      if (!('label' in p) || typeof p.label !== 'string') failures.push({ name: 'NEWS_API_PROVIDERS[].label', error: 'missing or non-string' });
    }
  }

  // emptyNewsletterConfig — must return a valid config object
  const emptyCfg = result.emptyNewsletterConfig;
  if (!emptyCfg || typeof emptyCfg !== 'object') {
    failures.push({ name: 'emptyNewsletterConfig', error: 'not an object' });
  } else {
    const requiredFields = ['rssEnabled', 'newsApiEnabled', 'itemCount', 'scheduleFrequency', 'subjectTemplate', 'processingTemplate', 'previewChannel', 'primaryChannel'];
    for (const field of requiredFields) {
      if (!(field in emptyCfg)) failures.push({ name: `emptyNewsletterConfig.${field}`, error: 'missing field' });
    }
    if (!Array.isArray(emptyCfg.scheduleTimes)) failures.push({ name: 'emptyNewsletterConfig.scheduleTimes', error: 'not an array' });
    if (!Array.isArray(emptyCfg.customRssFeeds)) failures.push({ name: 'emptyNewsletterConfig.customRssFeeds', error: 'not an array' });
    if (!Array.isArray(emptyCfg.emailRecipients)) failures.push({ name: 'emptyNewsletterConfig.emailRecipients', error: 'not an array' });
    if (!Array.isArray(emptyCfg.channelTargets)) failures.push({ name: 'emptyNewsletterConfig.channelTargets', error: 'not an array' });
  }

  return failures;
}
