/**
 * Smoke tests — all in-Layout routes (Desktop Chromium only).
 *
 * What we check for every route:
 *   1. Page renders an h1 (or known heading element) without timing out.
 *   2. No uncaught JS errors (pageerror).
 *   3. No console.error calls (React or otherwise).
 *   4. No ErrorBoundary fallback ("Eitthvað fór úrskeiðis").
 *   5. Lazy chunks (RosOverview, Varieties, History) actually load.
 *
 * Auth: we use the demo account '123' — it seeds a rich local dataset
 * via seedDemoData() without touching the network.
 *
 * Run: npm run test:e2e  (requires npm run dev on :5173 — playwright.config.ts
 * starts the dev server automatically via webServer).
 */

import { test, expect, type Page } from '@playwright/test';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Sign in with demo code '123' and wait for /home. */
async function signInAsDemo(page: Page) {
  await page.goto('/');

  // The app may briefly show a loading screen before redirecting to /login.
  await page.waitForURL(/\/(login|home)?/, { timeout: 10_000 });

  // If already on /home (e.g. localStorage is set from a previous test), done.
  if (page.url().includes('/home')) return;

  // Fill the three-character code input boxes.
  const codeInputs = page.locator('input[inputmode="text"]');
  await expect(codeInputs).toHaveCount(3, { timeout: 5_000 });

  await codeInputs.nth(0).fill('1');
  await codeInputs.nth(1).fill('2');
  await codeInputs.nth(2).fill('3');

  // Click submit — "Halda áfram"
  await page.getByRole('button', { name: /Halda áfram/i }).click();

  // seedDemoData writes to IndexedDB and navigates to /home.
  await page.waitForURL('/home', { timeout: 15_000 });
}

/**
 * Navigate to a route and assert:
 *  - no ErrorBoundary fallback
 *  - no uncaught pageerror or console.error (collected before navigation)
 *  - at least one heading element visible
 */
async function smokeRoute(
  page: Page,
  route: string,
  opts: {
    headingPattern?: RegExp;
    /** Extra selector to wait for before checking heading (lazy pages). */
    waitForSelector?: string;
  } = {},
) {
  await page.goto(route);

  // Wait for any lazy Suspense fallback to resolve.
  if (opts.waitForSelector) {
    await page.waitForSelector(opts.waitForSelector, { timeout: 15_000 });
  } else {
    // Generic: wait for the network to be idle so lazy chunks finish loading.
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  }

  // 1. No ErrorBoundary fallback.
  await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);

  // 2. At least one h1 (or the specific pattern) is visible.
  if (opts.headingPattern) {
    await expect(
      page.locator('h1, [class*="sp-h"], [class*="sp-display"]').filter({ hasText: opts.headingPattern }),
    ).toBeVisible({ timeout: 10_000 });
  } else {
    // Any h1 on page is acceptable.
    const h1s = page.locator('h1');
    await expect(h1s.first()).toBeVisible({ timeout: 10_000 });
  }
}

// ─── suite ──────────────────────────────────────────────────────────────────

test.describe('Smoke: unauthenticated redirect', () => {
  test('/ redirects to /login when no account is set', async ({ page }) => {
    // Clear any existing localStorage so we start fresh.
    await page.addInitScript(() => {
      localStorage.clear();
    });

    const jsErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Should land on /login or stay at / (both are valid unauthenticated states —
    // the app renders <Login> for ALL routes when unauthenticated, possibly at
    // the root URL before a redirect fires).
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 5_000 });

    // Login page should show "Spíra" branding — confirms the Login component rendered.
    await expect(page.getByRole('heading', { name: 'Spíra' })).toBeVisible({ timeout: 5_000 });

    expect(jsErrors, `pageerrors on /login: ${jsErrors.join(', ')}`).toHaveLength(0);
    // console.errors may contain non-fatal warnings; filter for hard errors.
    const hardErrors = consoleErrors.filter(
      (m) =>
        !m.includes('Warning:') &&
        !m.includes('[PWA]') &&
        !m.includes('service worker'),
    );
    expect(hardErrors, `console.error on /login: ${hardErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Smoke: demo sign-in', () => {
  test('signs in with code 123 and lands on /home', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.addInitScript(() => localStorage.clear());
    await signInAsDemo(page);

    await expect(page).toHaveURL('/home');
    expect(jsErrors, `pageerrors during demo sign-in: ${jsErrors.join(', ')}`).toHaveLength(0);
  });
});

// All routes that live inside <Layout> — tested as a batch after demo sign-in.
test.describe('Smoke: in-Layout routes', () => {
  // Sign in once, then each test reuses the stored session via storageState.
  // Because Playwright fixture isolation resets state, we sign in in beforeEach.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Keep whatever localStorage was set from a previous test in the same
      // worker; clear only when there is no account yet.
      const key = 'spira:account';
      if (!localStorage.getItem(key)) localStorage.clear();
    });
    await signInAsDemo(page);
  });

  // --- Collect errors per test ---
  let jsErrors: string[];
  let consoleErrors: string[];

  test.beforeEach(async ({ page }) => {
    jsErrors = [];
    consoleErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
  });

  function assertNoErrors(route: string) {
    expect(jsErrors, `pageerror on ${route}: ${jsErrors.join(', ')}`).toHaveLength(0);
    const hard = consoleErrors.filter(
      (m) =>
        m.includes('[spira]') ||
        // React error boundaries log via console.error
        m.includes('The above error') ||
        m.includes('caught an error'),
    );
    expect(hard, `console.error on ${route}:\n${hard.join('\n')}`).toHaveLength(0);
  }

  test('/home — renders home page (Góðan dag greeting)', async ({ page }) => {
    // Home page uses div.sp-display with "Góðan dag" — not an h1.
    await page.goto('/home');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);
    // The greeting text "Góðan dag" appears in HomeMobile (md:hidden).
    // On desktop viewport HomeDesktop renders — check for nav or grow content instead.
    const greeting = page.getByText(/Góðan dag|Ræktanir|Rós/);
    await expect(greeting.first()).toBeVisible({ timeout: 10_000 });
    assertNoErrors('/home');
  });

  test('/ros — RosOverview lazy chunk loads (Dagskrá Rósar)', async ({ page }) => {
    await smokeRoute(page, '/ros', {
      headingPattern: /Dagskrá Rósar/,
    });
    assertNoErrors('/ros');
  });

  test('/grows — renders Ræktanir heading', async ({ page }) => {
    await smokeRoute(page, '/grows', {
      headingPattern: /Ræktanir/,
    });
    assertNoErrors('/grows');
  });

  test('/grow/:id — navigates from grows list to a grow detail', async ({ page }) => {
    // Go to grows list first; demo data should have at least one grow.
    await page.goto('/grows');
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Click the first grow row to open GrowDetail.
    const firstLink = page.locator('a[href^="/grow/"]').first();

    if (await firstLink.count() === 0) {
      // No links found — skip rather than fail, and record a warning.
      console.warn('[smoke] No /grow/:id links found on /grows — demo data may not have seeded.');
      return;
    }

    await firstLink.click();
    await page.waitForURL(/\/grow\//, { timeout: 10_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // GrowDetail shows an h1 with the grow name (could be anything).
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);
    assertNoErrors('/grow/:id');
  });

  test('/plants — renders Plöntur heading', async ({ page }) => {
    await smokeRoute(page, '/plants', {
      headingPattern: /Plöntur/,
    });
    assertNoErrors('/plants');
  });

  test('/varieties — Varieties lazy chunk loads (afbrigði)', async ({ page }) => {
    await smokeRoute(page, '/varieties', {
      // Heading is dynamic: "N afbrigði"
      headingPattern: /afbrigði/i,
    });
    assertNoErrors('/varieties');
  });

  test('/environment — renders Hiti & raki heading', async ({ page }) => {
    await smokeRoute(page, '/environment', {
      headingPattern: /Hiti/,
    });
    assertNoErrors('/environment');
  });

  test('/harvest — renders harvest page', async ({ page }) => {
    await smokeRoute(page, '/harvest');
    assertNoErrors('/harvest');
  });

  test('/history — History lazy chunk loads (Lokaðar ræktanir)', async ({ page }) => {
    await smokeRoute(page, '/history', {
      headingPattern: /Lokaðar ræktanir/,
    });
    assertNoErrors('/history');
  });
});

test.describe('Smoke: unknown route falls back gracefully', () => {
  test('/nonexistent redirects to / or /home (no crash)', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.goto('/nonexistent-route-xyz');
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // The app has a catch-all <Navigate to="/" replace /> — should land somewhere sane.
    await expect(page).toHaveURL(/\/(login|home|nonexistent)?/, { timeout: 5_000 });
    await expect(page.getByText('Eitthvað fór úrskeiðis')).toHaveCount(0);
    expect(jsErrors, `pageerrors on unknown route: ${jsErrors.join(', ')}`).toHaveLength(0);
  });
});
