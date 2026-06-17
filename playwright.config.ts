/**
 * Playwright configuration for Spira end-to-end tests.
 *
 * Projects:
 *   - Desktop Chromium  — full desktop viewport
 *   - iPhone 14         — mobile emulation (WebKit)
 *   - iPhone SE         — smaller mobile emulation (WebKit)
 *
 * Test directory: e2e/
 *   e2e/smoke/   — fast sanity checks (loads, navigation)
 *   e2e/mobile/  — mobile-specific flows
 *   e2e/a11y/    — accessibility checks
 *
 * Naming convention: e2e/**\/*.spec.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',

  // Fail fast on CI; locally keep going so you see all failures.
  forbidOnly: !!process.env.CI,

  // Retry once on CI to reduce flake noise.
  retries: process.env.CI ? 1 : 0,

  // Parallel by default; override with PLAYWRIGHT_WORKERS env var.
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iPhone 14',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
