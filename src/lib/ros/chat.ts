export interface RosTurn {
  role: 'user' | 'model';
  text: string;
}

export interface RosInlineImage {
  mime: string;
  dataB64: string;
}

interface AskRosInput {
  messages: RosTurn[];
  context?: string;
  images?: RosInlineImage[];
}

const API = '/api/ros';
const MAX_DIMENSION = 1024;

export async function askRos(input: AskRosInput): Promise<string> {
  let res: Response;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('Náði ekki sambandi við Rós. Athugaðu nettenginguna.');
  }

  let payload: { text?: string; message?: string } = {};
  try {
    payload = (await res.json()) as { text?: string; message?: string };
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    throw new Error(
      typeof payload.message === 'string' ? payload.message : `Rós svaraði ekki (${res.status}).`,
    );
  }

  return typeof payload.text === 'string' ? payload.text : '';
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
