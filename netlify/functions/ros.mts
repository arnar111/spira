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
  stream?: boolean;
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

// — Inntaksmörk (5.1 server hardening) —
// Biðlarinn (src/lib/ros/chat.ts) klippir spjallsöguna í sömu mörk áður en hann
// sendir, svo þessi 413-svör eiga aðeins við um beiðnir utan appsins.
const MAX_MESSAGES = 40;
const MAX_IMAGES = 4;
/** ~2 MB á mynd, mælt á afkóðuðum bætum (base64-lengd × 3/4). */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** Samhengið er stytt (ekki hafnað) — appið byggir það sjálft og það má skerða. */
const MAX_CONTEXT_CHARS = 24_000;

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

  // — Inntaksmörk —
  if (messages.length > MAX_MESSAGES) {
    return json(
      { error: 'too_many_messages', message: 'Spjallið er orðið of langt fyrir eina beiðni — opnaðu nýtt spjall.' },
      413,
    );
  }
  if (images.length > MAX_IMAGES) {
    return json(
      { error: 'too_many_images', message: `Of margar myndir — sendu mest ${MAX_IMAGES} í einu.` },
      413,
    );
  }
  for (const img of images) {
    const b64len = img && typeof img.dataB64 === 'string' ? img.dataB64.length : 0;
    if ((b64len * 3) / 4 > MAX_IMAGE_BYTES) {
      return json(
        { error: 'image_too_large', message: 'Mynd er of stór fyrir Rós (hámark ~2 MB).' },
        413,
      );
    }
  }

  let context = typeof body.context === 'string' ? body.context.trim() : '';
  if (context.length > MAX_CONTEXT_CHARS) {
    context = `${context.slice(0, MAX_CONTEXT_CHARS)}\n\n[Samhengi var stytt vegna lengdar.]`;
  }
  const system = context.length > 0 ? `${context}\n\n${SYSTEM}` : SYSTEM;

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

  if (body.stream === true) {
    return await streamResponse(payload, KEY);
  }

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

// --- Streaming path -------------------------------------------------------
//
// Sömu fallback-reglur og í venjulegu leiðinni, en með SSE. Við könnum
// líkana-keðjuna á undan og opnum EKKI SSE-straum fyrr en upstream-líkan hefur
// skilað fyrsta texta-delta. Þannig getum við fallið aftur á venjulega
// JSON-villuna (sama snið og venjulega leiðin) ef öll líkön bregðast áður en
// nokkur straumur opnast — villumeðhöndlun helst samræmd hjá biðlaranum.
//
// Um leið og fyrsta delta hefur verið áframsent læsum við líkanið — síðari
// villa skilar sér þá sem `error`-atburður og straumnum er lokað (við skiptum
// aldrei um líkan eftir að straumur er opinn).
async function streamResponse(payload: string, key: string): Promise<Response> {
  const chain = buildModelChain();
  const startedAt = Date.now();
  let lastStatus = 0;

  for (const model of chain) {
    if (Date.now() - startedAt > OVERALL_BUDGET_MS) break;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const controller = new AbortController();
    // Tímamörk gilda á tíma-að-fyrsta-bæti; þau eru hreinsuð þegar fyrsta delta
    // er komið svo langt svar verði ekki rofið.
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
      clearTimeout(timer);
      lastStatus = 504;
      continue; // netvilla / tímamörk — reyndu næsta líkan
    }

    if (!res.ok || !res.body) {
      clearTimeout(timer);
      lastStatus = res.ok ? 502 : res.status;
      if (!res.ok && !RETRYABLE.has(res.status)) break; // 400/403/404 — vonlaust
      continue;
    }

    // Lesum fyrstu delta-in fram að fyrsta texta svo við vitum hvort líkanið
    // skilar einhverju. Ef ekkert kemur (tómt/öryggis-blokkað) reynum við næsta.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstDelta = '';
    let upstreamDone = false;

    try {
      while (!firstDelta) {
        const { done, value } = await reader.read();
        if (done) {
          upstreamDone = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, '');
          buffer = buffer.slice(nl + 1);
          const text = parseSseDataLine(line);
          if (text) {
            firstDelta = text;
            break;
          }
        }
      }
    } catch {
      clearTimeout(timer);
      lastStatus = 504;
      continue; // rofnaði fyrir fyrsta delta — reyndu næsta líkan
    }
    clearTimeout(timer);

    if (!firstDelta) {
      // Straumur kláraðist án texta (öryggis-blokk / tómt svar) — næsta líkan.
      if (upstreamDone) lastStatus = lastStatus || res.status;
      continue;
    }

    // Líkanið skilar texta → opnum OKKAR SSE-straum og áframsendum afganginn.
    return openClientStream(reader, decoder, buffer, firstDelta, model);
  }

  // Engin delta barst úr neinu líkani — sama JSON-villa og venjulega leiðin.
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
}

// Búum til SSE-svar fyrir biðlarann út frá líkani sem þegar hefur skilað fyrsta
// delta. `buffer` er það sem eftir var ólesið eftir fyrsta delta.
function openClientStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  initialBuffer: string,
  firstDelta: string,
  model: string,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Fyrsta delta sem þegar var lesið úr upstream.
      send({ delta: firstDelta });

      let buffer = initialBuffer;
      const flush = () => {
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, '');
          buffer = buffer.slice(nl + 1);
          const text = parseSseDataLine(line);
          if (text) send({ delta: text });
        }
      };

      try {
        // Tæmum það sem þegar var í buffer.
        flush();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          flush();
        }
        // Síðasta lína án nýlínu.
        const tail = parseSseDataLine(buffer);
        if (tail) send({ delta: tail });
        send({ done: true, model });
      } catch {
        // Straumur rofnaði eftir að fyrsta delta var sent — engin líkana-skipti
        // héðan í frá, bara villa og loka.
        send({ error: 'upstream_error', message: 'Rós rofnaði í miðju svari. Reyndu aftur.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

// Tekur eina línu úr upstream SSE ("data: {json}") og dregur út samanlagðan
// texta úr candidates[0].content.parts[].text. Skilar '' ef engin texti.
function parseSseDataLine(line: string): string {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith('data:')) return '';
  const jsonStr = trimmed.slice(5).trim();
  if (!jsonStr || jsonStr === '[DONE]') return '';
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return '';
  }
  return extractText(data);
}

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
