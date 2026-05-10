     expect((bodyText?.length ?? 0)).toBeGreaterThan(10);
   });
 });

// ---------------------------------------------------------------------------
// Journey 59.8: Researcher Panel — Zero Results Empty State
// ---------------------------------------------------------------------------

test.describe('Journey 59.8: Researcher Panel — Zero Results Empty State', () => {

  test('researcher panel shows empty state message when search returns zero results', async ({ page }) => {
    /**
     * Goal: In the researcher panel, if a search returns zero results show a
     * helpful 'No articles found for <query> — try broader terms' message.
     *
     * This test validates the zero-results empty state is rendered when the
     * trending search returns an empty articles array.
     *
     * Expected behavior: Page shows 'No articles found' text when results empty.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    await setupApiMocks(page, {
      trendingSearch: { ok: true, data: { articles: [], stale: false } },
    });
    await injectFakeToken(page);
    await page.goto('./dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Verify no JS errors occurred
    expect(jsErrors).toHaveLength(0);
    // Verify empty state message is visible
    const emptyState = page.getByText(/No articles found/i);
    const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasEmptyState).toBe(true);
  });
 });