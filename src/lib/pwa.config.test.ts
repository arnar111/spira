/**
 * Corner 2 — PWA config shape tests (node, no DOM needed).
 *
 * These tests validate the vite.config.ts PWA/Workbox rules and the
 * public/manifest.webmanifest without running a build, by reading the config
 * and manifest as data and asserting their shape.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

// ─── manifest ──────────────────────────────────────────────────────────────

describe('public/manifest.webmanifest', () => {
  let manifest: Record<string, unknown>;

  it('parses as valid JSON', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    manifest = JSON.parse(raw) as Record<string, unknown>;
    expect(manifest).toBeTruthy();
  });

  it('has required PWA fields: name, short_name, start_url, display', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    expect(typeof m.name).toBe('string');
    expect(typeof m.short_name).toBe('string');
    expect(typeof m.start_url).toBe('string');
    expect(typeof m.display).toBe('string');
  });

  it('display is a valid value (standalone/fullscreen/minimal-ui/browser)', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    const validDisplayValues = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
    expect(validDisplayValues).toContain(m.display);
  });

  it('has at least one icon with src, sizes, type', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    expect(Array.isArray(m.icons)).toBe(true);
    const icons = m.icons as Array<Record<string, unknown>>;
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(typeof icon.src).toBe('string');
      expect(typeof icon.sizes).toBe('string');
      expect(typeof icon.type).toBe('string');
    }
  });

  it('has a maskable icon (required for Android installability)', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    const icons = m.icons as Array<Record<string, unknown>>;
    const maskable = icons.find((ic) => String(ic.purpose ?? '').includes('maskable'));
    expect(maskable).toBeDefined();
  });

  it('start_url is "/" (root)', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');
    const m = JSON.parse(raw) as Record<string, unknown>;
    expect(m.start_url).toBe('/');
  });
});

// ─── vite.config PWA rules ─────────────────────────────────────────────────

describe('vite.config.ts PWA / Workbox rules', () => {
  it('vite.config.ts exists and references navigateFallbackDenylist', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(src).toContain('navigateFallbackDenylist');
  });

  it('navigateFallbackDenylist includes /api/ pattern', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    // The pattern /^\/api\// must appear in the denylist
    expect(src).toMatch(/navigateFallbackDenylist.*\/api\//s);
  });

  it('runtimeCaching has NetworkOnly handler for /api/', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(src).toContain("handler: 'NetworkOnly'");
    expect(src).toContain('/api/');
  });

  it('manifest: false (plugin does not generate a second manifest)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(src).toContain('manifest: false');
  });

  it('injectRegister: null (manual SW registration)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    expect(src).toContain('injectRegister: null');
  });

  it('does NOT cache /api/* routes (no CacheFirst/StaleWhileRevalidate on api)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf-8');
    // Must not have CacheFirst or StaleWhileRevalidate paired with /api/
    // The only handler for /api/ must be NetworkOnly
    const apiCacheFirstMatch = src.match(/\/api\/[^]*?CacheFirst/s);
    const apiStaleMatch = src.match(/\/api\/[^]*?StaleWhileRevalidate/s);
    expect(apiCacheFirstMatch).toBeNull();
    expect(apiStaleMatch).toBeNull();
  });
});
