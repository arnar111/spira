/**
 * Mobile e2e tests — iPhone 14 + iPhone SE (WebKit).
 *
 * Checks (all on phone viewports):
 *   1. Demo sign-in ("123") navigates to /home.
 *   2. Mobile layout: bottom nav visible; lg-only embedded Rós pane absent
 *      on /grow/:id.
 *   3. Core routes (/home, /grows, /grow/:id, /ros, /harvest) each render a
 *      heading and have no horizontal overflow.
 *   4. "Spyrja Rós" button opens a role=dialog modal on mobile.
 *   5. Bottom-nav touch targets are >= 40 px tall.
 *   6. index.html contains required iOS PWA meta tags.
 *
 * Run:
 *   npm run test:e2e:iphone
 *   npx playwright test --project="iPhone SE"
 *
 * Auth: demo code "123" seeds local IndexedDB via seedDemoData() — no network.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Sign in with the demo code "123" and wait for /home.
 *
 * IMPORTANT: Do NOT use addInitScript() anywhere — it fires on EVERY page
 * navigation and would clear localStorage before every goto(), breaking the
 * session. Instead, clear storage with page.evaluate() (runs once in the
 * current page context) before navigating.
 *
 * The CodeInput component is three separate <input inputmode="text"> elements.
 * We click-and-type each char with pressSequentially so that React's onChange
 * fires correctly in WebKit (fill() can miss intermediate synthetic events).
 */
async function signInAsDemo(page: Page) {
  // Clear any stale session synchronously before the first navigation.
  // page.evaluate() runs in the currently loaded page (blank/about:blank at
  // the start of a test), so it won't interfere with subsequent navigations.
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* sandboxed — ignore */ }
  });

  await page.goto('/');
  await page.waitForURL(/\/(login|home)?/, { timeout: 10_000 });

  // If the session is already active (e.g. reused browser context), skip.
  if (page.url().includes('/home')) return;

  // Wait for the three CodeInput boxes (they animate in after ~1.5 s).
  const codeInputs = page.locator('input[inputmode="text"]');
  await expect(codeInputs).toHaveCount(3, { timeout: 10_000 });

  // Click each box and type its character; this mirrors real touch typing
  // and properly triggers React's synthetic onChange events in WebKit.
  await codeInputs.nth(0).click();
  await codeInputs.nth(0).pressSequentially('1', { delay: 50 });

  await codeInputs.nth(1).click();
  await codeInputs.nth(1).pressSequentially('2', { delay: 50 });

  await codeInputs.nth(2).click();
  await codeInputs.nth(2).pressSequentially('3', { delay: 50 });

  // Wait for the submit button to become enabled (all 3 chars valid).
  const submitBtn = page.getByRole('button', { name: /Halda áfram/i });
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
  await submitBtn.click();

  // seedDemoData() writes to IndexedDB and navigates to /home.
  await page.waitForURL('/home', { timeout: 25_000 });
}

/** Navigate to a route and wait for it to finish loading. */
async function gotoRoute(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

// ─── selector helpers ────────────────────────────────────────────────────────

/**
 * The mobile bottom nav rendered by MobileNav() in Layout.tsx:
 *   <nav aria-label="Aðalvalmynd" className="md:hidden fixed bottom-0 left-0 right-0 z-30">
 *
 * The desktop sidebar nav lives inside <aside class="hidden md:flex ..."> and
 * does NOT have class "fixed". On iPhone viewports (~390 px) the `md:`
 * breakpoint (~768 px) is inactive, so the desktop aside is hidden and the
 * fixed bottom nav is shown.
 */
function mobileBottomNav(page: Page) {
  return page.locator('nav[aria-label="Aðalvalmynd"][class*="fixed"]');
}

// ─── suite 1: demo sign-in ───────────────────────────────────────────────────

test.describe('Mobile: demo sign-in', () => {
  test('signing in with code 123 reaches /home on a phone viewport', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await signInAsDemo(page);

    await expect(page).toHaveURL('/home');
    expect(
      jsErrors,
      `JS errors during mobile demo sign-in: ${jsErrors.join(', ')}`,
    ).toHaveLength(0);
  });
});

// ─── suite 2-6: layout, navigation and UX ────────────────────────────────────

test.describe('Mobile: layout, navigation and UX', () => {
  // Sign in once per test. Each Playwright test gets a fresh browser context,
  // so we must sign in from scratch every time.
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page);
  });

  // ── 2a. Bottom nav visible ────────────────────────────────────────────────

  test('bottom nav is visible on /home', async ({ page }) => {
    await gotoRoute(page, '/home');

    // On phone viewports the md:hidden fixed bottom nav IS shown.
    const nav = mobileBottomNav(page);
    await expect(nav).toBeVisible({ timeout: 8_000 });
  });

  // ── 2b. Embedded Rós pane NOT visible on /grow/:id on mobile ──────────────

  test('lg-only embedded Rós pane is NOT visible on /grow/:id on mobile', async ({ page }) => {
    await gotoRoute(page, '/grows');

    const firstGrowLink = page.locator('a[href^="/grow/"]').first();
    if ((await firstGrowLink.count()) === 0) {
      console.warn('[mobile] No /grow/:id link — demo data may not have seeded.');
      test.skip();
      return;
    }

    await firstGrowLink.click();
    await page.waitForURL(/\/grow\//, { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // The embedded aside has aria-label="Rós — yfirlit ræktunar" and
    // class="hidden lg:block lg:sticky ...". On mobile it must NOT be visible.
    const embeddedPane = page.locator('[aria-label="Rós — yfirlit ræktunar"]');
    const paneCount = await embeddedPane.count();
    if (paneCount > 0) {
      await expect(embeddedPane.first()).not.toBeVisible();
    }
    // count === 0 means not in the DOM — equally correct.
  });

  // ── 3. Core routes — heading + no horizontal overflow ─────────────────────

  /**
   * Navigate to a route and assert:
   *   - No ErrorBoundary fallback.
   *   - A heading/display-text element matching headingText is visible.
   *   - No horizontal overflow (scrollWidth <= innerWidth + 4 px tolerance).
   */
  async function assertHeadingAndNoOverflow(
    page: Page,
    route: string,
    headingText: RegExp | string,
  ) {
    await gotoRoute(page, route);

    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);

    // The app uses both semantic headings (h1/h2) and utility classes
    // (sp-h1/sp-h2/sp-display) for display text — target all of them.
    const heading = page
      .locator('h1, h2, [class*="sp-h"], [class*="sp-display"]')
      .filter({ hasText: headingText });
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.scrollWidth,
      `Horizontal overflow on ${route}: scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 4);
  }

  test('/home — renders Spíra header, no horizontal overflow', async ({ page }) => {
    await gotoRoute(page, '/home');
    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);

    // The mobile sticky header (<header class="md:hidden ..."> in Layout.tsx)
    // contains a <span class="sp-display ...">Spíra</span>.
    // We scope to <header> so we don't accidentally pick the Wordmark inside
    // the desktop <aside class="hidden md:flex ..."> (which is hidden on mobile
    // but appears first in DOM order).
    const mobileHeader = page.locator('header').filter({ hasText: 'Spíra' });
    await expect(mobileHeader.getByText('Spíra')).toBeVisible({ timeout: 8_000 });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.scrollWidth,
      `/home horizontal overflow: scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 4);
  });

  test('/grows — renders Ræktanir heading, no horizontal overflow', async ({ page }) => {
    await assertHeadingAndNoOverflow(page, '/grows', /Ræktanir/i);
  });

  test('/grow/:id — renders grow heading, no horizontal overflow', async ({ page }) => {
    await gotoRoute(page, '/grows');
    const firstGrowLink = page.locator('a[href^="/grow/"]').first();
    if ((await firstGrowLink.count()) === 0) {
      console.warn('[mobile] No /grow/:id link — skipping grow detail overflow check.');
      test.skip();
      return;
    }
    await firstGrowLink.click();
    await page.waitForURL(/\/grow\//, { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);

    // GrowDetail renders the grow name in a div.sp-h2 (not an h1).
    // sp-h2 is a utility type-scale class from index.css.
    const growHeading = page.locator('[class*="sp-h"]').first();
    await expect(growHeading).toBeVisible({ timeout: 10_000 });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.scrollWidth,
      `/grow/:id horizontal overflow: scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 4);
  });

  test('/ros — renders RosOverview heading, no horizontal overflow', async ({ page }) => {
    // /ros is lazy-loaded; networkidle wait in assertHeadingAndNoOverflow covers it.
    await assertHeadingAndNoOverflow(page, '/ros', /Dagskrá Rósar/i);
  });

  test('/harvest — renders harvest page, no horizontal overflow', async ({ page }) => {
    await gotoRoute(page, '/harvest');
    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);

    // The Harvest h1 shows total weight with an SVG icon (e.g. "⚖ 1234g") —
    // hard to match with text. The Eyebrow above reads "UPPSKERA" (uppercase
    // via CSS) and is always present. We scope to <main> so we don't pick up
    // the "Uppskera" nav label in the desktop aside (hidden on mobile but
    // appearing first in DOM order).
    await expect(page.locator('main').getByText('Uppskera').first()).toBeVisible({ timeout: 8_000 });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.scrollWidth,
      `/harvest horizontal overflow: scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`,
    ).toBeLessThanOrEqual(overflow.innerWidth + 4);
  });

  // ── 4. "Spyrja Rós" opens a role=dialog modal on mobile ───────────────────

  test('"Spyrja Rós" opens a dialog modal (not an embedded pane) on mobile', async ({ page }) => {
    await gotoRoute(page, '/grows');
    const firstGrowLink = page.locator('a[href^="/grow/"]').first();
    if ((await firstGrowLink.count()) === 0) {
      console.warn('[mobile] No /grow/:id link — skipping Rós modal check.');
      test.skip();
      return;
    }

    await firstGrowLink.click();
    await page.waitForURL(/\/grow\//, { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // On mobile the button reads "Spyrja Rós"; on desktop "Spjall við Rós".
    // getByRole + exact name avoids matching hidden nav spans.
    const rosButton = page.getByRole('button', { name: 'Spyrja Rós' });
    await expect(rosButton).toBeVisible({ timeout: 8_000 });
    await rosButton.click();

    // RosWindow uses Modal which renders role="dialog".
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
  });

  // ── 5. Touch-target sanity: bottom-nav items >= 40 px tall ───────────────

  test('bottom-nav items are at least 40 px tall (touch target)', async ({ page }) => {
    await gotoRoute(page, '/home');

    const nav = mobileBottomNav(page);
    await expect(nav).toBeVisible({ timeout: 8_000 });

    // The nav container spans the full bottom — measure its height.
    const navBox = await nav.boundingBox();
    expect(navBox, 'Mobile bottom nav has no bounding box').not.toBeNull();
    expect(
      navBox!.height,
      `Mobile bottom nav height ${navBox!.height}px is below 40 px`,
    ).toBeGreaterThanOrEqual(40);

    // Each NavLink anchor inside the mobile nav.
    const navLinks = nav.locator('a');
    const linkCount = await navLinks.count();
    expect(linkCount, 'Expected at least 3 mobile nav links').toBeGreaterThanOrEqual(3);

    for (let i = 0; i < linkCount; i++) {
      const box = await navLinks.nth(i).boundingBox();
      if (!box) continue; // not visible — skip
      expect(
        box.height,
        `Nav link #${i} height ${box.height}px is below 40 px touch-target minimum`,
      ).toBeGreaterThanOrEqual(40);
    }
  });

  // ── 6. iOS PWA meta in index.html ─────────────────────────────────────────

  test('index.html has apple-touch-icon, viewport meta and manifest link', async ({ page }) => {
    await gotoRoute(page, '/home');

    // <link rel="apple-touch-icon">
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').count();
    expect(
      appleTouchIcon,
      'Missing <link rel="apple-touch-icon"> in index.html',
    ).toBeGreaterThanOrEqual(1);

    // <meta name="viewport" content="width=device-width, ...">
    const viewportMeta = await page
      .locator('meta[name="viewport"][content*="width=device-width"]')
      .count();
    expect(
      viewportMeta,
      'Missing correct <meta name="viewport"> in index.html',
    ).toBeGreaterThanOrEqual(1);

    // <link rel="manifest" href="/manifest.webmanifest">
    const manifestLink = await page.locator('link[rel="manifest"]').count();
    expect(
      manifestLink,
      'Missing <link rel="manifest"> in index.html',
    ).toBeGreaterThanOrEqual(1);
  });
});
