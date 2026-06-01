import type { Config, Context } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Spíra plant-health advisor — server-side proxy to the Claude API.
 *
 * Adapted from the Eignamat Claude proxy, modernised for this use case:
 *  - Uses the official @anthropic-ai/sdk instead of hand-rolled fetch.
 *  - Purpose-built for plant diagnosis: the horticultural knowledge base and
 *    the output schema live here (server-side), so the client only sends a
 *    photo + structured grow context. The API key never leaves the server.
 *  - Prompt caching on the static knowledge-base system block.
 *  - Structured output via a forced tool so the result maps onto the app.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
const ALLOWED_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
// Netlify synchronous functions cap the request body at ~6 MB; resize client-side.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Grounding knowledge distilled from the indoor-Iceland grow guides. Kept stable
 * so it can be prompt-cached across requests (cache_control below).
 */
const KNOWLEDGE_BASE = `Þú ert „Spíru-greinir", sérfræðingur í inniræktun á chili-pipar og tómötum á Íslandi.
Þú færð mynd af plöntu ásamt samhengi (afbrigði, fasi, dagar, vökvun/næring, hiti/raki) og skilar
skipulagðri greiningu á íslensku með tólinu report_diagnosis. Vertu nákvæm/ur, hófsöm/hófsamur og
forðastu ofgreiningu — ef plantan lítur vel út skaltu segja það.

KJÖRGILDI (inni):
- Hiti: dagur 21–29°C (lágmark 15°C); nótt ekki undir 13°C. Tómatar (t.d. Steinunn) þola kaldari nætur.
- Raki: 50–70%. Undir 40% þurrkar frjókorn; yfir 80% hindrar frjóvgun og eykur sveppahættu.
- Ljós (PPFD): plöntu 200–400, vöxtur 400–600, blóm/aldin 600–900 µmol/m²/s. DLI 20–30 mol/m²/dag.
- pH 6,0–6,8. Jöfn vökvun; láttu efsta lag þorna milli vökvana.

ALGENG EINKENNI → ORSÖK → LAUSN:
- Gulnandi neðri blöð: köfnunarefnisskortur eða ofvökvun. Athugaðu frárennsli; gefðu N-ríkan áburð varlega.
- Blóm detta án aldins: hita-/rakastreita eða léleg frjóvgun. Haltu 15–27°C; handfrjóvgaðu með tannbursta.
- Svört, innfallin dæld á botni aldins: kálbotnsfúi (blossom end rot) — óregluleg vökvun truflar kalkflutning. Vökvaðu jafnt.
- Blöð krullast: ofvökvun, hitastreita eða meindýr. Athugaðu vökvun, hita og skoðaðu undir blöðum.
- Fjólublá blöð/stönglar: fosfórskortur eða kuldi við rætur. Hækkaðu rótarhita; bættu við fosfór.
- Fín gulnun með vef (stippling): spunamítlar. Auktu raka; neemolía; einangraðu plöntuna.
- Hvít duftkennd skán á blöðum: mjöldögg. Bættu loftflæði; minnka raka; fjarlægðu sýkt blöð.
- Millæða-gulnun (grænar æðar): magnesíumskortur. Epsom-salt (1 msk/L) sem úði.
- Langir, renglulegir stilkar: of lítið ljós. Auktu styrk; lækkaðu ljós nær plöntu.
- Klístruð blöð / smáflugur: blaðlús eða hvítflugur. Sápuvatn; neemolía.

EÐLILEGT (ekki vandamál): hrukkótt (rugose) blöð á sumum yrkjum (t.d. Steinunn); létt slapp síðdegis
sem jafnar sig; elstu neðstu blöð gulna með aldri.

Skrifaðu allan texta á íslensku. Veldu severity: "ok" (ekkert að), "watch" (fylgjast með) eða
"act_now" (bregðast strax við). Gefðu confidence (low/medium/high) per vandamál og rökstuddu með því
sem SÉST á myndinni. Stingdu upp á stuttri skráningu (suggestedLog) sem notandinn getur vistað.`;

const DIAGNOSIS_TOOL: Anthropic.Tool = {
  name: 'report_diagnosis',
  description:
    'Skila skipulagðri heilsugreiningu á plöntunni á íslensku, byggðri á myndinni og samhenginu.',
  input_schema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: ['ok', 'watch', 'act_now'],
        description: 'Heildarmat: ok / fylgjast með / bregðast strax við.',
      },
      summary: { type: 'string', description: 'Stutt samantekt (1–2 setningar).' },
      likelyIssues: {
        type: 'array',
        description: 'Líkleg vandamál, það líklegasta fyrst. Tómt ef plantan er heilbrigð.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
            evidence: { type: 'string', description: 'Hvað á myndinni bendir til þessa.' },
          },
          required: ['name', 'confidence', 'evidence'],
          additionalProperties: false,
        },
      },
      recommendedActions: { type: 'array', items: { type: 'string' } },
      whatToCheck: { type: 'array', items: { type: 'string' } },
      positives: { type: 'array', items: { type: 'string' } },
      suggestedLog: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['note', 'pest', 'disease'] },
          note: { type: 'string' },
        },
        required: ['type', 'note'],
        additionalProperties: false,
      },
    },
    required: ['severity', 'summary', 'likelyIssues', 'recommendedActions', 'whatToCheck', 'suggestedLog'],
    additionalProperties: false,
  },
};

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(
      { error: 'not_configured', message: 'AI er ekki uppsett — bættu ANTHROPIC_API_KEY við Netlify.' },
      503,
    );
  }

  let body: { image?: { mediaType?: string; data?: string }; context?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const image = body.image;
  if (!image?.data || !image.mediaType) {
    return json({ error: 'missing_image', message: 'Mynd vantar.' }, 400);
  }
  if (!ALLOWED_MEDIA.includes(image.mediaType as (typeof ALLOWED_MEDIA)[number])) {
    return json({ error: 'bad_media_type', message: 'Óstudd myndtegund.' }, 400);
  }
  // base64 expands ~4/3; reject oversized payloads before calling the API.
  if (image.data.length * 0.75 > MAX_IMAGE_BYTES) {
    return json({ error: 'image_too_large', message: 'Myndin er of stór — minnkaðu hana.' }, 413);
  }

  const contextText = buildContextText(body.context);
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system: [{ type: 'text', text: KNOWLEDGE_BASE, cache_control: { type: 'ephemeral' } }],
      tools: [DIAGNOSIS_TOOL],
      tool_choice: { type: 'tool', name: 'report_diagnosis' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: contextText },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mediaType as (typeof ALLOWED_MEDIA)[number],
                data: image.data,
              },
            },
          ],
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return json({ error: 'no_diagnosis', message: 'Greining tókst ekki.' }, 502);
    }

    return json({
      ok: true,
      diagnosis: toolBlock.input,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
        cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return json({ error: 'auth', message: 'ANTHROPIC_API_KEY er ógilt.' }, 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'rate_limited', message: 'Of margar fyrirspurnir — reyndu aftur eftir smá.' }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      return json({ error: 'api_error', message: `Claude villa (${err.status ?? '?'}).` }, 502);
    }
    console.error('[diagnose] error', err);
    return json({ error: 'server_error', message: 'Óþekkt villa.' }, 500);
  }
};

export const config: Config = {
  path: '/api/diagnose',
};

/** Render the grow context the client sends into a compact prompt block. */
function buildContextText(raw: unknown): string {
  const c = (raw ?? {}) as Record<string, unknown>;
  const lines: string[] = ['Samhengi plöntunnar:'];
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    lines.push(`- ${label}: ${String(value)}`);
  };
  add('Afbrigði', c.variety);
  add('Flokkur', c.category === 'tomato' ? 'Tómatur' : c.category === 'pepper' ? 'Pipar' : c.category);
  add('Fasi', c.phase);
  add('Dagur frá sáningu', c.day);
  add('Staðsetning', c.location);
  add('Markhiti (°C)', c.targetTempC);
  add('Síðasti hiti (°C)', c.lastTempC);
  add('Síðasti raki (%)', c.lastHumidityPct);
  add('Ljóstími (klst)', c.lightOnHours);
  if (Array.isArray(c.recentLogs) && c.recentLogs.length > 0) {
    lines.push(`- Nýlegar skráningar: ${(c.recentLogs as unknown[]).map(String).join(' · ')}`);
  }
  lines.push('\nGreindu heilsu plöntunnar á myndinni og skilaðu með report_diagnosis.');
  return lines.join('\n');
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
