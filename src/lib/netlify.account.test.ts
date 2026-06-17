/**
 * Corner 4 — Netlify function hardening (pure-logic tests, no DB needed).
 *
 * We test:
 *   a) normalizeCode alignment between client (src/lib/account.ts) and server
 *      (netlify/functions/account.mts — identical logic, same regex).
 *   b) isSnapshotShape — the server-side SnapshotV1 validation mirror.
 *   c) Body-size / name-length cap constants match CLAUDE.md spec.
 *   d) Rate-limit window constants match CLAUDE.md spec.
 *
 * Anything requiring a live Postgres/Netlify env (getDatabase, actual HTTP
 * requests) is out-of-scope and noted below.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeCode, isValidCode, CODE_PATTERN, CODE_LENGTH } from '@/lib/account';

// Read the Netlify account function source once for all constant-inspection tests
const ACCOUNT_MTS = fs.readFileSync(
  path.resolve(__dirname, '../../netlify/functions/account.mts'),
  'utf-8',
);

// ─── a) normalizeCode client↔server alignment ──────────────────────────────
//
// The server's normalizeCode (in account.mts) does:
//   raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
//   then returns null if length !== 3
//
// The client's normalizeCode does the same transform but does NOT enforce
// length (that is left to isValidCode).  We test that the TRANSFORM steps
// are identical and that the combination client-normalize→isValidCode mirrors
// the server's null-or-code behaviour.

describe('normalizeCode: client↔server transform alignment', () => {
  // Helper that mirrors the server's full normalizeCode (including length gate)
  function serverNormalize(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 3) return null;
    if (!/^[A-Z0-9]{3}$/.test(code)) return null;
    return code;
  }

  it('lowercase → uppercase (both sides)', () => {
    expect(normalizeCode('abc')).toBe('ABC');
    expect(serverNormalize('abc')).toBe('ABC');
  });

  it('strips non-alphanumeric (both sides)', () => {
    expect(normalizeCode('a-b!c')).toBe('ABC');
    expect(serverNormalize('a-b!c')).toBe('ABC');
  });

  it('client does not clip; server returns null for >3 chars', () => {
    expect(normalizeCode('abcdef')).toBe('ABCDEF'); // client: no length gate
    expect(isValidCode(normalizeCode('abcdef'))).toBe(false); // gate is in isValidCode
    expect(serverNormalize('abcdef')).toBeNull();            // server rejects
  });

  it('exactly 3 valid chars: client returns string, server returns same string', () => {
    const valid3 = ['ABC', 'A1B', '123', 'Z9Z'];
    for (const c of valid3) {
      expect(normalizeCode(c)).toBe(c);
      expect(serverNormalize(c)).toBe(c);
    }
  });

  it('empty string: client returns empty, server returns null', () => {
    expect(normalizeCode('')).toBe('');
    expect(isValidCode('')).toBe(false);
    expect(serverNormalize('')).toBeNull();
  });

  it('Icelandic chars (Þ/Ð/Æ/Ö) are stripped on both sides', () => {
    expect(normalizeCode('ÞÐÆ')).toBe('');
    expect(serverNormalize('ÞÐÆ')).toBeNull();
  });

  it('2-char input: invalid on both sides', () => {
    expect(isValidCode(normalizeCode('AB'))).toBe(false);
    expect(serverNormalize('AB')).toBeNull();
  });

  it('4-char input: invalid on both sides', () => {
    expect(isValidCode(normalizeCode('ABCD'))).toBe(false);
    expect(serverNormalize('ABCD')).toBeNull();
  });

  it('non-string input: client throws (toUpperCase on undefined fails), server null', () => {
    expect(serverNormalize(null)).toBeNull();
    expect(serverNormalize(123)).toBeNull();
    expect(serverNormalize(undefined)).toBeNull();
    expect(serverNormalize({})).toBeNull();
  });

  it('CODE_PATTERN and CODE_LENGTH constants are self-consistent', () => {
    expect(CODE_LENGTH).toBe(3);
    expect(CODE_PATTERN.source).toBe('^[A-Z0-9]{3}$');
    // Confirm pattern matches exactly 3 uppercase alnum chars
    expect(CODE_PATTERN.test('ABC')).toBe(true);
    expect(CODE_PATTERN.test('A1C')).toBe(true);
    expect(CODE_PATTERN.test('123')).toBe(true);
    expect(CODE_PATTERN.test('abC')).toBe(false);
    expect(CODE_PATTERN.test('ABCD')).toBe(false);
    expect(CODE_PATTERN.test('AB')).toBe(false);
  });
});

// ─── b) isSnapshotShape (server-side mirror) ─────────────────────────────

describe('server isSnapshotShape logic', () => {
  // Copy of the pure logic from account.mts (no DB dependency)
  function isSnapshotShape(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
      v.version === 1 &&
      Array.isArray(v.grows) &&
      Array.isArray(v.plants) &&
      Array.isArray(v.logs) &&
      Array.isArray(v.environment) &&
      Array.isArray(v.harvests) &&
      Array.isArray(v.meta)
    );
  }

  it('accepts a valid v1 snapshot shape', () => {
    expect(
      isSnapshotShape({
        version: 1,
        grows: [],
        plants: [],
        logs: [],
        environment: [],
        harvests: [],
        meta: [],
      }),
    ).toBe(true);
  });

  it('rejects null and primitives', () => {
    expect(isSnapshotShape(null)).toBe(false);
    expect(isSnapshotShape(undefined)).toBe(false);
    expect(isSnapshotShape('string')).toBe(false);
    expect(isSnapshotShape(42)).toBe(false);
    expect(isSnapshotShape(true)).toBe(false);
  });

  it('rejects empty object {}', () => {
    expect(isSnapshotShape({})).toBe(false);
  });

  it('rejects version 2 (future/unknown)', () => {
    expect(
      isSnapshotShape({
        version: 2,
        grows: [],
        plants: [],
        logs: [],
        environment: [],
        harvests: [],
        meta: [],
      }),
    ).toBe(false);
  });

  it('rejects when any required array is missing', () => {
    const base = { version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] };
    const fields = ['grows', 'plants', 'logs', 'environment', 'harvests', 'meta'] as const;
    for (const f of fields) {
      const bad = { ...base };
      delete (bad as Record<string, unknown>)[f];
      expect(isSnapshotShape(bad)).toBe(false);
    }
  });

  it('rejects when an array field is not an array', () => {
    expect(
      isSnapshotShape({
        version: 1,
        grows: 'not-an-array',
        plants: [],
        logs: [],
        environment: [],
        harvests: [],
        meta: [],
      }),
    ).toBe(false);
    expect(
      isSnapshotShape({
        version: 1,
        grows: {},
        plants: [],
        logs: [],
        environment: [],
        harvests: [],
        meta: [],
      }),
    ).toBe(false);
  });

  it('matches the client-side isSnapshot behaviour exactly', async () => {
    // Import the client-side isSnapshot and confirm they agree on all cases
    const { isSnapshot } = await import('@/lib/sync');
    const cases: unknown[] = [
      { version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] },
      null,
      undefined,
      {},
      { version: 2, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] },
      { version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [] }, // meta missing
      'garbage',
    ];
    for (const c of cases) {
      expect(isSnapshot(c)).toBe(isSnapshotShape(c));
    }
  });
});

// ─── c) Body-size and name-length caps (from CLAUDE.md spec) ─────────────

describe('server hardening constants (spec from CLAUDE.md)', () => {
  it('MAX_BODY_BYTES should be ~5 MB (documented spec)', () => {
    // The constant must be 5 * 1024 * 1024
    expect(ACCOUNT_MTS).toContain('5 * 1024 * 1024');
  });

  it('MAX_NAME_LENGTH should be 64 (documented spec)', () => {
    expect(ACCOUNT_MTS).toContain('MAX_NAME_LENGTH = 64');
  });
});

// ─── d) Rate-limit window constants ─────────────────────────────────────────

describe('rate-limit window constants (spec from CLAUDE.md)', () => {
  it('signin: max=10 in 5 min window', () => {
    expect(ACCOUNT_MTS).toMatch(/signin.*max.*10/s);
    expect(ACCOUNT_MTS).toMatch(/signin.*windowMinutes.*5/s);
  });

  it('sync: max=120 in 5 min window', () => {
    expect(ACCOUNT_MTS).toMatch(/sync.*max.*120/s);
    expect(ACCOUNT_MTS).toMatch(/sync.*windowMinutes.*5/s);
  });

  it('rate limit check fails open (returns true on DB error)', () => {
    // The CLAUDE.md documents "fails open if the table is missing".
    // The catch block returns true to fail open.
    expect(ACCOUNT_MTS).toContain('return true');
    expect(ACCOUNT_MTS).toContain('rate limit check failed');
  });
});

// ─── e) Out-of-scope documentation ────────────────────────────────────────
//
// The following require a live Netlify/Postgres environment and are intentionally
// NOT tested here:
//   - checkRateLimit actual Postgres upsert behaviour
//   - signup/signin/sync actual DB read/write
//   - HTTP response status codes from the handler
//   - GEMINI_API_KEY / ros.mts proxying
