/**
 * Client wrapper for the Spíra plant-health advisor.
 *
 * The heavy lifting (model, knowledge base, output schema) lives in the
 * `/api/diagnose` Netlify function — this module only resizes the photo and
 * exchanges JSON with it. The Anthropic key never reaches the browser.
 */

export type Severity = 'ok' | 'watch' | 'act_now';
export type Confidence = 'low' | 'medium' | 'high';

export interface DiagnosisIssue {
  name: string;
  confidence: Confidence;
  evidence: string;
}

export interface SuggestedLog {
  type: 'note' | 'pest' | 'disease';
  note: string;
}

export interface Diagnosis {
  severity: Severity;
  summary: string;
  likelyIssues: DiagnosisIssue[];
  recommendedActions: string[];
  whatToCheck: string[];
  positives?: string[];
  suggestedLog: SuggestedLog;
}

export interface DiagnoseContext {
  variety?: string;
  category?: string;
  phase?: string;
  day?: number;
  location?: string;
  targetTempC?: number;
  lastTempC?: number;
  lastHumidityPct?: number;
  lightOnHours?: number;
  recentLogs?: string[];
}

export interface ResizedImage {
  mediaType: 'image/jpeg';
  /** base64 (no data: prefix) */
  data: string;
  /** the resized JPEG, for storing as a PhotoBlob */
  blob: Blob;
}

export interface DiagnoseResult {
  diagnosis: Diagnosis;
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

export class AiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/** Downscale + re-encode an image to a small JPEG (keeps payloads well under Netlify's 6 MB cap). */
export async function resizeImage(
  file: Blob,
  maxEdge = 1024,
  quality = 0.82,
): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AiError(0, 'canvas', 'Gat ekki unnið myndina.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new AiError(0, 'canvas', 'Myndvinnsla mistókst.'))),
      'image/jpeg',
      quality,
    ),
  );
  const data = await blobToBase64(blob);
  return { mediaType: 'image/jpeg', data, blob };
}

/** Send a photo + grow context to the advisor and return the structured diagnosis. */
export async function diagnosePlant(
  context: DiagnoseContext,
  image: ResizedImage,
): Promise<DiagnoseResult> {
  let res: Response;
  try {
    res = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: { mediaType: image.mediaType, data: image.data },
        context,
      }),
    });
  } catch {
    throw new AiError(0, 'network', 'Næ ekki sambandi við greini.');
  }

  let payload: { ok?: boolean; error?: string; message?: string } & Partial<DiagnoseResult> = {};
  try {
    payload = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok || !payload.diagnosis) {
    throw new AiError(
      res.status,
      payload.error ?? 'unknown',
      payload.message ?? `Greining mistókst (${res.status}).`,
    );
  }
  return { diagnosis: payload.diagnosis, usage: payload.usage };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new AiError(0, 'read', 'Gat ekki lesið myndina.'));
    reader.readAsDataURL(blob);
  });
}
