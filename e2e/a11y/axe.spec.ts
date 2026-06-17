/**
 * Corner 1 — Accessibility: axe-core audit on key routes.
 *
 * Runs after demo account '123' is signed in so the authenticated pages
 * render real content.  Fails on serious/critical axe violations only.
 *
 * Requires the dev server on :5173 (started automatically by Playwright's
 * webServer config).
 *
 * Run: npx playwright test e2e/a11y/
 */
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Biðjum um minni hreyfingu svo framer-motion sleppi (eða stytti) innkomu-
// hreyfingar. Án þessa skannar axe stundum á meðan opacity er enn að fara úr
// 0 → 1 og les þá "fölsk" lág birtuskil (fg ≈ bg).  Sjá settle() líka.
test.use({ reducedMotion: 'reduce' });

// ─── helpers ───────────────────────────────────────────────────────────────

/**
 * Bíða þar til síðan er fullstöðug: netið hljótt OG innkomu-hreyfingar búnar.
 * framer-motion knýr opacity með rAF (ekki CSS-transition), svo networkidle eitt
 * og sér dugar ekki — við gefum hreyfingunni tíma til að setjast.
 */
async function settle(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
}

/** Sign in with the demo account '123' and wait for /home. */
async function signInDemo(page: import('@playwright/test').Page) {
  await page.goto('/login');

  // Fill the code input with demo code
  const codeInput = page.locator('input[type="text"], input:not([type])').first();
  await codeInput.fill('123');

  // Submit — the button text is in Icelandic
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Skrá|Inn|Halda/ }).first();
  await submitBtn.click();

  // Wait for navigation away from /login
  await page.waitForURL(/\/(home|ros|grows|setup)/, { timeout: 10_000 });
}

/**
 * Run axe on the current page, filter to serious/critical, and assert zero.
 * Returns the raw AxeResults for diagnostic logging if needed.
 */
async function assertNoA11yViolations(page: import('@playwright/test').Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );

  if (seriousOrCritical.length > 0) {
    const details = seriousOrCritical
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes
            .slice(0, 2)
            .map((n) => n.html)
            .join(' | ')}`,
      )
      .join('\n');
    throw new Error(`${label} — ${seriousOrCritical.length} serious/critical axe violation(s):\n${details}`);
  }

  return results;
}

// ─── tests ─────────────────────────────────────────────────────────────────

test.describe('A11y: key routes (serious/critical violations fail)', () => {
  test.beforeEach(async ({ page }) => {
    await signInDemo(page);
  });

  test('/login — no serious/critical violations', async ({ page }) => {
    // Login page itself (before sign-in)
    await page.goto('/login');
    await settle(page);
    await assertNoA11yViolations(page, '/login');
  });

  test('/home — no serious/critical violations', async ({ page }) => {
    await page.goto('/home');
    await settle(page);
    await assertNoA11yViolations(page, '/home');
  });

  test('/ros — no serious/critical violations', async ({ page }) => {
    await page.goto('/ros');
    await settle(page);
    await assertNoA11yViolations(page, '/ros');
  });

  test('/harvest — no serious/critical violations', async ({ page }) => {
    await page.goto('/harvest');
    await settle(page);
    await assertNoA11yViolations(page, '/harvest');
  });

  test('/grows — no serious/critical violations', async ({ page }) => {
    await page.goto('/grows');
    await settle(page);
    await assertNoA11yViolations(page, '/grows');
  });
});

test.describe('A11y: login page (no auth needed)', () => {
  test('login page loads without serious/critical a11y violations', async ({ page }) => {
    await page.goto('/login');
    await settle(page);
    await assertNoA11yViolations(page, '/login (unauthenticated)');
  });
});
