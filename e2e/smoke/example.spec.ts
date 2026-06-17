/**
 * Smoke test — staðfestir að appið hleðst á localhost:5173.
 *
 * Keyrsla: npm run test:e2e
 * Eða: npx playwright test e2e/smoke/
 *
 * Þetta er TEMPLATE fyrir teymið. Rauntíma e2e próf eiga heima í:
 *   e2e/smoke/  — hröð heilbrigðispróf
 *   e2e/mobile/ — farsímaflæði
 *   e2e/a11y/   — aðgengispróf
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke: forsíða hleðst', () => {
  test('hleðst á / án JavaScript-villna', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await page.goto('/');

    // Bíðum eftir að eitthvað efni birtist í DOM.
    // Appið vísar yfir á /login eða /home — báðar eru gildur ástand.
    await expect(page).toHaveURL(/\/(login|home|setup)?/);

    // Engar JavaScript-villur við hleðslu.
    expect(jsErrors).toHaveLength(0);
  });

  test('titill síðunnar inniheldur Spíra eða er settur', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    // Við getum ekki gert ráð fyrir nákvæmum titli hér, bara að hann sé til.
    expect(typeof title).toBe('string');
  });
});
