import type { Config, Context } from '@netlify/functions';

const SYSTEM =
  'Rós er hlý, fróð og hagnýt ræktunarráðgjafi fyrir íslenska inniræktun (pipar & tómatar). ' +
  'Hún notar dagbókarfærslur, fasa og myndir til að ráðleggja um vökvun, næringu, klippingu/toppun, ' +
  'frjóvgun og hvenær aldin eru tilbúin. ' +
  'Þegar notandi lýsir vandamáli skaltu FYRST útskýra stuttlega hvað er líklega að gerast og af hverju, ' +
  'og GEFA SVO hagnýtar lausnir í skref-fyrir-skref lista. ' +
  'Svaraðu á íslensku, hlýlega og hnitmiðað, og kláraðu alltaf svarið. ' +
  'Notaðu einfalt Markdown (feitletrun **svona**, skáletur *svona*, tölusetta eða punktalista) ' +
  'til að gera svörin læsileg.';

interface RosTurn {
  role: 'user' | 'model';
  text: string;
}

interface InlineImage {
  mime: string;
  dataB64: string;
}

interface RosBody {
  messages: RosTurn[];
  context?: string;
  images?: InlineImage[];
}

type GeminiPart = { text?: string } | { inline_data: { mime_type: string; data: string } };

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

// Fallback chain: try the newest model first, fall back to older/lighter ones
// when a model is overloaded (503) or rate-limited (429). `gemini-3.0-flash`
// does not exist — `gemini-3.1-flash-lite` is the closest step below 3.5.
const DEFAULT_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

// Per-attempt cap so a hanging upstream call can't burn the whole Netlify
// function budget and turn into a 504. Most 503s come back in <1s, so the
// chain usually completes fast even when the first model is overloaded.
const ATTEMPT_TIMEOUT_MS = 8000;
// Stop starting new attempts once we've spent this long overall.
const OVERALL_BUDGET_MS = 22000;

// Upstream statuses worth retrying on the next model (transient / load).
// 4xx like 400/403/404 are NOT retryable — another model won't fix them.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

// Primary from GEMINI_MODEL (or comma-separated GEMINI_MODELS) takes priority,
// then the defaults, de-duped.
function buildModelChain(): string[] {
  const env = process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || '';
  const wanted = env.split(',').map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const m of [...wanted, ...DEFAULT_CHAIN]) {
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let body: RosBody;
  try {
    body = (await req.json()) as RosBody;
  } catch {
    return json({ error: 'invalid_json', message: 'Ógild beiðni.' }, 400);
  }

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return json({ error: 'no_key', message: 'Rós er ekki uppsett (GEMINI_API_KEY vantar).' }, 500);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const images = Array.isArray(body.images) ? body.images : [];
  const system = typeof body.context === 'string' && body.context.trim().length > 0
    ? `${body.context.trim()}\n\n${SYSTEM}`
    : SYSTEM;

  const contents: GeminiContent[] = [];
  messages.forEach((turn, index) => {
    const role: 'user' | 'model' = turn.role === 'model' ? 'model' : 'user';
    const parts: GeminiPart[] = [{ text: typeof turn.text === 'string' ? turn.text : '' }];
    // Attach images to the latest user turn.
    if (index === messages.length - 1 && role === 'user' && images.length > 0) {
      for (const img of images) {
        if (img && typeof img.mime === 'string' && typeof img.dataB64 === 'string') {
          parts.push({ inline_data: { mime_type: img.mime, data: img.dataB64 } });
        }
      }
    }
    contents.push({ role, parts });
  });

  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  const chain = buildModelChain();
  const startedAt = Date.now();
  let lastStatus = 0;

  for (const model of chain) {
    if (Date.now() - startedAt > OVERALL_BUDGET_MS) break;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal,
      });
    } catch {
      // Network error or per-attempt timeout (abort) — try the next model.
      clearTimeout(timer);
      lastStatus = 504;
      continue;
    }
    clearTimeout(timer);

    if (res.ok) {
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        lastStatus = 502;
        continue;
      }
      const text = extractText(data);
      if (text) return json({ text, model });
      // 200 but empty (e.g. safety block / no candidate) — try the next model.
      lastStatus = res.status;
      continue;
    }

    lastStatus = res.status;
    // Overloaded / rate-limited / upstream 5xx → fall through to the next model.
    if (RETRYABLE.has(res.status)) continue;
    // 400 / 403 / 404 etc. are not fixable by switching models — stop here.
    break;
  }

  const overloaded = lastStatus === 503 || lastStatus === 429 || lastStatus === 504;
  return json(
    {
      error: 'upstream_error',
      lastStatus,
      message: overloaded
        ? 'Rós er mjög upptekin í augnablikinu — öll líkön svöruðu ekki. Reyndu aftur eftir smá stund.'
        : 'Rós svaraði ekki. Reyndu aftur síðar.',
    },
    overloaded ? 503 : 502,
  );
};

export const config: Config = {
  path: '/api/ros',
};

function extractText(data: unknown): string {
  if (!isRecord(data)) return '';
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  const first = candidates[0];
  if (!isRecord(first)) return '';
  const content = first.content;
  if (!isRecord(content)) return '';
  const parts = content.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (isRecord(p) && typeof p.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
