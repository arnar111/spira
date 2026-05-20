import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';

const CODE_REGEX = /^[A-Z0-9]{3}$/;
const MAX_CODE_LEN = 3;

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (action === 'signup') return signup(body);
  if (action === 'signin') return signin(body);
  if (action === 'sync') return sync(body);

  return json({ error: 'unknown_action' }, 404);
};

export const config: Config = {
  path: '/api/account',
};

async function signup(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const data = (body.data ?? {}) as Record<string, unknown>;

  if (!code) return json({ error: 'invalid_code', message: 'Kóði verður að vera 3 stafir (A–Z, 0–9).' }, 400);
  if (name.length === 0) return json({ error: 'invalid_name', message: 'Nafn vantar.' }, 400);

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

async function sync(body: Record<string, unknown>) {
  const code = normalizeCode(body.code);
  if (!code) return json({ error: 'invalid_code' }, 400);
  if (typeof body.data !== 'object' || body.data === null) {
    return json({ error: 'invalid_data' }, 400);
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

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (code.length !== MAX_CODE_LEN) return null;
  if (!CODE_REGEX.test(code)) return null;
  return code;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
