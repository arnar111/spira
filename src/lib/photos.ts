import { useEffect, useState } from 'react';
import { db, newId, type PhotoBlob } from '@/lib/db';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

interface DownscaleResult {
  blob: Blob;
  width?: number;
  height?: number;
}

/**
 * Downscale an image File to a max longest-side of 1600px (keeping aspect)
 * and re-encode as JPEG. Falls back to the original file blob if the canvas
 * pipeline is unavailable (SSR / no document / decode failure).
 */
async function downscaleImage(file: File): Promise<DownscaleResult> {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return { blob: file };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width: srcW, height: srcH } = bitmap;

    if (!srcW || !srcH) {
      bitmap.close();
      return { blob: file };
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { blob: file };
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
    });

    if (!blob) {
      return { blob: file };
    }

    return { blob, width: targetW, height: targetH };
  } catch {
    return { blob: file };
  }
}

/**
 * Downscale + store a photo File in the device-local db.photos table.
 * Returns the new photo id. Photos never leave the device (not synced).
 */
export async function addPhotoFromFile(
  file: File,
  opts: { growId: string; plantId?: string },
): Promise<string> {
  const { blob, width, height } = await downscaleImage(file);
  const id = newId();

  const record: PhotoBlob = {
    id,
    growId: opts.growId,
    plantId: opts.plantId,
    blob,
    width,
    height,
    takenAt: Date.now(),
  };

  await db.photos.add(record);
  return id;
}

/**
 * React hook: resolve a photo id to an object URL for an <img src>.
 * Returns null while loading or when no id is given. Revokes the URL on
 * cleanup / id change to avoid leaking blob URLs.
 */
export function usePhotoUrl(photoId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoId || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      setUrl(null);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    void db.photos
      .get(photoId)
      .then((photo) => {
        if (!active || !photo) {
          return;
        }
        objectUrl = URL.createObjectURL(photo.blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          setUrl(null);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setUrl(null);
    };
  }, [photoId]);

  return url;
}

/** Delete a device-local photo blob. */
export async function deletePhoto(photoId: string): Promise<void> {
  await db.photos.delete(photoId);
}

/** Read a raw photo blob (e.g. for download/export). */
export async function getPhotoBlob(photoId: string): Promise<Blob | undefined> {
  const photo = await db.photos.get(photoId);
  return photo?.blob;
}
