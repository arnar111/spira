export interface Account {
  code: string;
  name: string;
}

export interface AccountResponse extends Account {
  data?: unknown;
  updated_at?: string;
}

const STORAGE_KEY = 'spira:account';
const API = '/api/account';

export const CODE_LENGTH = 3;
export const CODE_PATTERN = /^[A-Z0-9]{3}$/;

/**
 * Samræmd kóða-normalisering (sjá netlify/functions/account.mts — höldum þeim
 * eins): hástafa → strippa allt nema A–Z/0–9. EKKERT klipp — gildi með rangri
 * lengd fellur á isValidCode í stað þess að styttast hljóðlaust.
 */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCode(raw: string): boolean {
  return CODE_PATTERN.test(raw);
}

export function getCurrentAccount(): Account | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.code === 'string' && typeof parsed?.name === 'string') {
      return { code: parsed.code, name: parsed.name };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setCurrentAccount(account: Account): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function clearCurrentAccount(): void {
  localStorage.removeItem(STORAGE_KEY);
}

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function postAction<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let payload: { error?: string; message?: string } & Record<string, unknown> = {};
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      typeof payload.error === 'string' ? payload.error : 'unknown',
      typeof payload.message === 'string' ? payload.message : `Villa (${res.status})`,
    );
  }
  return payload as T;
}

export async function signUp(code: string, name: string, data: unknown): Promise<AccountResponse> {
  return postAction<AccountResponse>('signup', { code, name, data });
}

export async function signIn(code: string): Promise<AccountResponse> {
  return postAction<AccountResponse>('signin', { code });
}

export async function syncData(code: string, data: unknown): Promise<{ updated_at: string }> {
  return postAction<{ updated_at: string }>('sync', { code, data });
}

export interface PullResponse {
  unchanged?: boolean;
  data?: unknown;
  updated_at?: string;
}

/**
 * Sækir nýjustu skýjagögn fyrir innskráð tæki. `since` er updated_at sem þetta
 * tæki sá síðast — netþjónninn svarar { unchanged: true } sé ekkert nýtt.
 */
export async function pullData(code: string, since: string | null): Promise<PullResponse> {
  return postAction<PullResponse>('pull', { code, since });
}

export { ApiError };
