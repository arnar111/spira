import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';

const CODE_REGEX = /^[A-Z0-9]{3}$/;
const CODE_LENGTH = 3;

/** Hámarksstærð beiðni (allt JSON-ið, þ.m.t. snapshot) — ~5 MB. */
const MAX_BODY_BYTES = 5 * 1024 * 1024;
/** Hámarkslengd nafns. */
const MAX_NAME_LENGTH = 64;

/**
 * Föst-glugga takmörk per IP+aðgerð. Kóðarýmið er aðeins 36³ = ~47k (auðtalið),
 * svo signin/signup þola þröng mörk; sync er eðlilega tíðari (debounce 1,2 s).
 */
const RATE_LIMITS: Record<string, { max: number; windowMinutes: number }> = {
  signin: { max: 10, windowMinutes: 5 },
  signup: { max: 10, windowMinutes: 5 },
  sync: { max: 120, windowMinutes: 5 },
  pull: { max: 60, windowMinutes: 5 },
};

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // Stærðarvörn áður en JSON er þáttað — content-length fyrst, svo raunlengd.
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json(
      { error: 'too_large', message: 'Gögnin eru of stór til að vista í skýið (hámark ~5 MB).' },
      413,
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (rawBody.length > MAX_BODY_BYTES) {
    return json(
      { error: 'too_large', message: 'Gögnin eru of stór til að vista í skýið (hámark ~5 MB).' },
      413,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (action !== 'signup' && action !== 'signin' && action !== 'sync' && action !== 'pull') {
    return json({ error: 'unknown_action' }, 404);
  }

  // Hraðatakmörkun per IP+aðgerð. Bilun í teljaranum stöðvar ekki notandann
  // (fail-open) — vörnin er gegn skriðþunga-skönnun, ekki harðlæsing.
  const limit = RATE_LIMITS[action];
  const ip =
    context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const allowed = await checkRateLimit(`${ip}:${action}`, limit.max, limit.windowMinutes);
  if (!allowed) {
    return json(
      { error: 'rate_limited', message: 'Of margar tilraunir — reyndu aftur eftir smá stund.' },
      429,
    );
  }

  if (action === 'signup') return signup(body);
  if (action === 'signin') return signin(body);
  if (action === 'pull') return pull(body);
  return sync(body);
};

export const config: Config = {
  path: '/api/account',
};

/**
 * Föst-glugga teljari í Postgres (fallin sem keyra á Netlify eru ríkislaus).
 * Ein upsert-setning: nýr gluggi ef sá gamli er útrunninn, annars +1.
 * Skilar false þegar teljarinn er kominn yfir hámark.
 */
async function checkRateLimit(
  key: string,
  max: number,
  windowMinutes: number,
): Promise<boolean> {
  try {
    const db = getDatabase();
    const [row] = await db.sql`
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (${key}, NOW(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < NOW() - make_interval(mins => ${windowMinutes})
            THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start < NOW() - make_interval(mins => ${windowMinutes})
            THEN NOW()
          ELSE rate_limits.window_start
        END
      RETURNING count
    `;
    return Number(row?.count ?? 0) <= max;
  } catch (err) {
    // Tafla vantar / DB hikst — hleypum beiðninni í gegn frekar en að loka öllu.
    console.warn('[account] rate limit check failed', err);
    return true;
  }
}

/**
 * Lágmarks-staðfesting á snapshot-laginu sem skrifast í JSONB.
 * Speglar isSnapshot í src/lib/sync.ts (version 1 + töflufylkin).
 */
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

async function signup(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const data = (body.data ?? {}) as Record<string, unknown>;

  if (!code) return json({ error: 'invalid_code', message: 'Kóði verður að vera 3 stafir (A–Z, 0–9).' }, 400);
  if (name.length === 0) return json({ error: 'invalid_name', message: 'Nafn vantar.' }, 400);
  if (name.length > MAX_NAME_LENGTH) {
    return json({ error: 'invalid_name', message: `Nafn má mest vera ${MAX_NAME_LENGTH} stafir.` }, 400);
  }
  // Nýskráning sendir a.m.k. { version: 1 } (fullt snapshot þegar gögn eru til).
  if (typeof data !== 'object' || data === null || data.version !== 1) {
    return json({ error: 'invalid_data', message: 'Gögnin eru ekki á réttu sniði.' }, 400);
  }

  const db = getDatabase();
  const existing = await db.sql`SELECT code FROM accounts WHERE code = ${code}`;
  if (existing.length > 0) {
    return json({ error: 'code_taken', message: 'Þessi kóði er upptekinn — veldu annan.' }, 409);
  }

  const [row] = await db.sql`
    INSERT INTO accounts (code, name, data)
    VALUES (${code}, ${name}, ${JSON.stringify(data)}::jsonb)
    RETURNING code, name, updated_at
  `;
  return json({ code: row.code, name: row.name, updated_at: row.updated_at });
}

async function signin(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  if (!code) return json({ error: 'invalid_code', message: 'Kóði verður að vera 3 stafir.' }, 400);

  const db = getDatabase();
  const [row] = await db.sql`SELECT code, name, data, updated_at FROM accounts WHERE code = ${code}`;
  if (!row) return json({ error: 'not_found', message: 'Enginn reikningur með þessum kóða.' }, 404);
  return json(row);
}

/**
 * Sækir nýjustu skýjagögn fyrir tæki sem er þegar skráð inn (samleitni milli
 * tækja — sjá syncManager.pull í src/lib/sync.ts). `since` er updated_at sem
 * tækið sá síðast; sé það óbreytt skilum við bara { unchanged: true } í stað
 * þess að senda allt JSONB-blobbið aftur.
 */
async function pull(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  if (!code) return json({ error: 'invalid_code', message: 'Kóði verður að vera 3 stafir.' }, 400);
  const since = typeof body.since === 'string' ? body.since : null;

  const db = getDatabase();
  const [row] = await db.sql`SELECT data, updated_at FROM accounts WHERE code = ${code}`;
  if (!row) return json({ error: 'not_found', message: 'Enginn reikningur með þessum kóða.' }, 404);

  const updatedAt =
    row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at);
  if (since && since === updatedAt) {
    return json({ unchanged: true, updated_at: updatedAt });
  }
  return json({ data: row.data, updated_at: updatedAt });
}

async function sync(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  if (!code) return json({ error: 'invalid_code' }, 400);
  if (!isSnapshotShape(body.data)) {
    return json({ error: 'invalid_data', message: 'Gögnin eru ekki á réttu sniði.' }, 400);
  }

  const db = getDatabase();
  const result = await db.sql`
    UPDATE accounts
    SET data = ${JSON.stringify(body.data)}::jsonb, updated_at = NOW()
    WHERE code = ${code}
    RETURNING updated_at
  `;
  if (result.length === 0) return json({ error: 'not_found' }, 404);
  return json({ updated_at: result[0].updated_at });
}

/**
 * Samræmd kóða-normalisering (sjá src/lib/account.ts — höldum þeim eins):
 * hástafa → strippa allt nema A–Z/0–9 → nákvæmlega 3 stafir, annars ógilt.
 */
function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  if (!CODE_REGEX.test(code)) return null;
  return code;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
