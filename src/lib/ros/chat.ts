export interface RosTurn {
  role: 'user' | 'model';
  text: string;
}

export interface RosInlineImage {
  mime: string;
  dataB64: string;
}

export interface AskRosInput {
  messages: RosTurn[];
  context?: string;
  images?: RosInlineImage[];
}

/** Niðurstaða úr streymandi spjalli: samanlagður texti og líkanið sem svaraði. */
export interface AskRosResult {
  text: string;
  model?: string;
}

const API = '/api/ros';
const MAX_DIMENSION = 1024;
const NET_ERROR = 'Náði ekki sambandi við Rós. Athugaðu nettenginguna.';

/**
 * Venjulegt (ekki-streymandi) spjall við Rós. Skilar fullbúnum texta.
 * Óbreytt hegðun: kastar villu á netbresti og á `!res.ok` (íslensk skilaboð).
 */
export async function askRos(input: AskRosInput): Promise<string> {
  let res: Response;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error(NET_ERROR);
  }

  return (await readJsonResult(res)).text;
}

/**
 * Streymandi spjall við Rós — skilar smátt og smátt. `onDelta` er kallað með
 * samanlögðum texta (allt sem komið er) eftir hvert delta, svo UI getur
 * uppfært jafnóðum. Loforðið leysist með heildartextanum og líkaninu þegar
 * `done`-atburður berst.
 *
 * - Ef svarið er SSE (`text/event-stream`) lesum við strauminn og þáttum
 *   `data: `-línur (með bufferun fyrir hlutalínur á chunk-mörkum).
 * - Ef `error`-atburður berst: höfum við þegar safnað texta leysum við með
 *   honum, annars köstum við villu með skilaboðunum.
 * - Ef svarið er EKKI SSE (t.d. JSON-villa eða straumur óstuddur) föllum við í
 *   sömu JSON-meðhöndlun og `askRos`.
 * - Netbrestur kastar sömu íslensku skilaboðum og `askRos`.
 */
export async function askRosStream(
  input: AskRosInput,
  onDelta: (textSoFar: string) => void,
): Promise<AskRosResult> {
  let res: Response;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, stream: true }),
    });
  } catch {
    throw new Error(NET_ERROR);
  }

  const contentType = res.headers.get('Content-Type') || '';
  if (!res.ok || !contentType.includes('text/event-stream') || !res.body) {
    // Ekki straumur (villu-JSON eða streymi óstutt) — venjuleg JSON-meðhöndlun.
    return readJsonResult(res);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let model: string | undefined;

  // Þáttar eina SSE `data: `-línu. Skilar `true` ef straumi á að ljúka.
  const handleLine = (line: string): boolean => {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('data:')) return false;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) return false;
    let evt: { delta?: string; done?: boolean; model?: string; error?: string; message?: string };
    try {
      evt = JSON.parse(jsonStr);
    } catch {
      return false;
    }
    if (typeof evt.delta === 'string') {
      text += evt.delta;
      onDelta(text);
      return false;
    }
    if (evt.done === true) {
      if (typeof evt.model === 'string') model = evt.model;
      return true;
    }
    if (typeof evt.error === 'string') {
      // Villa í miðju: ef við höfum þegar texta skilum við honum, annars köstum.
      if (text.length > 0) return true;
      throw new Error(typeof evt.message === 'string' ? evt.message : 'Rós svaraði ekki.');
    }
    return false;
  };

  let finished = false;
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      // Straumur rofnaði: skilum því sem komið er, annars netvilla.
      if (text.length > 0) break;
      throw new Error(NET_ERROR);
    }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      if (handleLine(line)) {
        finished = true;
        break;
      }
    }
    if (finished) break;
  }

  // Síðasta lína án nýlínu (ef einhver).
  if (!finished && buffer.trim().length > 0) {
    handleLine(buffer);
  }

  return { text, model };
}

/**
 * Les JSON-svar frá /api/ros (ekki-streymandi leiðin) og skilar
 * `AskRosResult`. Kastar íslenskri villu á `!res.ok`.
 */
async function readJsonResult(res: Response): Promise<AskRosResult> {
  let payload: { text?: string; message?: string; model?: string } = {};
  try {
    payload = (await res.json()) as { text?: string; message?: string; model?: string };
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(
      typeof payload.message === 'string' ? payload.message : `Rós svaraði ekki (${res.status}).`,
    );
  }

  return {
    text: typeof payload.text === 'string' ? payload.text : '',
    model: typeof payload.model === 'string' ? payload.model : undefined,
  };
}

export async function blobToInlineImage(blob: Blob): Promise<RosInlineImage> {
  const fallback = async (): Promise<RosInlineImage> => {
    const dataB64 = stripDataUrl(await blobToDataUrl(blob));
    return { mime: blob.type || 'image/jpeg', dataB64 };
  };

  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return fallback();
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return fallback();
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return fallback();
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { mime: 'image/jpeg', dataB64: stripDataUrl(dataUrl) };
}

function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Gat ekki lesið mynd.'));
    reader.readAsDataURL(blob);
  });
}
