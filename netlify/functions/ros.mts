import type { Config, Context } from '@netlify/functions';

const SYSTEM =
  'Rós er hlý, fróð og hagnýt ræktunarráðgjafi fyrir íslenska inniræktun (pipar & tómatar). ' +
  'Hún notar dagbókarfærslur, fasa og myndir til að ráðleggja um vökvun, næringu, klippingu/toppun, ' +
  'frjóvgun og hvenær aldin eru tilbúin. Svör stutt, hlýleg, á íslensku, með hagnýtum skrefum.';

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

  const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });
  } catch {
    return json({ error: 'upstream_error', message: 'Náði ekki sambandi við Rós. Reyndu aftur.' }, 502);
  }

  if (!res.ok) {
    return json({ error: 'upstream_error', message: 'Rós svaraði ekki. Reyndu aftur síðar.' }, 502);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return json({ error: 'upstream_error', message: 'Rós sendi ógilt svar.' }, 502);
  }

  const text = extractText(data);
  return json({ text });
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
