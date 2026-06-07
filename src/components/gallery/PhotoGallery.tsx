import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Images } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhotoLightbox, type LightboxPhoto } from '@/components/gallery/PhotoLightbox';
import { db, type LogEntry, type PhotoBlob, type Plant } from '@/lib/db';
import { deletePhoto, usePhotoUrl } from '@/lib/photos';
import {
  flattenGroups,
  formatMb,
  groupPhotosByMonth,
} from '@/lib/photoGallery';

/** Hlutfall kvóta þar sem við vörum við að geymsla sé að fyllast. */
const QUOTA_WARN = 0.8;

/** Ein smámynd sem afnemur object-URL við aftengingu (gegnum usePhotoUrl). */
function Thumb({
  photo,
  onOpen,
}: {
  photo: PhotoBlob;
  onOpen: () => void;
}) {
  const url = usePhotoUrl(photo.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square rounded-xl overflow-hidden border transition-transform active:scale-[.98]"
      style={{ background: 'rgba(18,31,20,.6)', borderColor: 'rgba(64,104,67,.4)' }}
    >
      {url ? (
        <img src={url} alt="Smámynd" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span className="block w-full h-full" />
      )}
    </button>
  );
}

interface PhotoGalleryProps {
  growId: string;
  /** Afmarkar safnið við eina plöntu (per-plant view). */
  plantId?: string;
  plants: Plant[];
  logs: LogEntry[];
  className?: string;
}

/**
 * Myndasafn ræktunar (eða einnar plöntu) — tímaröðuð smámyndaspjöld með
 * mánaðar-hausum, geymslunotkun og ljóskassa með flettingu/eyðingu. Allt
 * staðbundið (db.photos) — engar sync-breytingar.
 */
export function PhotoGallery({
  growId,
  plantId,
  plants,
  logs,
  className,
}: PhotoGalleryProps) {
  const photos = useLiveQuery(async () => {
    const rows = await db.photos.where('growId').equals(growId).toArray();
    return plantId ? rows.filter((p) => p.plantId === plantId) : rows;
  }, [growId, plantId]);

  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    let active = true;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      void navigator.storage
        .estimate()
        .then((est) => {
          if (active && est.usage != null && est.quota != null) {
            setStorage({ usage: est.usage, quota: est.quota });
          }
        })
        .catch((err) => console.warn('[spira] storage.estimate mistókst', err));
    }
    return () => {
      active = false;
    };
    // Endurmeta þegar fjöldi mynda breytist (eyðing/viðbót).
  }, [photos?.length]);

  const plantById = useMemo(() => {
    const m = new Map<string, Plant>();
    for (const p of plants) m.set(p.id, p);
    return m;
  }, [plants]);

  // Tengjum hverja mynd við athugasemd af skráningu sem vísar á hana.
  const noteByPhoto = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of logs) {
      if (l.photoId && l.note && l.note.trim()) m.set(l.photoId, l.note.trim());
    }
    return m;
  }, [logs]);

  const groups = useMemo(() => groupPhotosByMonth(photos ?? []), [photos]);
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  const lightboxItems = useMemo<LightboxPhoto[]>(
    () =>
      flat.map((photo) => {
        const plant = photo.plantId ? plantById.get(photo.plantId) : undefined;
        return {
          photo,
          plantLabel: plant ? plant.nickname || plant.variety : undefined,
          note: noteByPhoto.get(photo.id),
        };
      }),
    [flat, plantById, noteByPhoto],
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PhotoBlob | null>(null);

  const openAt = useCallback(
    (photoId: string) => {
      const idx = flat.findIndex((p) => p.id === photoId);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [flat],
  );

  // Eyðir mynd OG hreinsar photoId af tengdri skráningu (heldur log-inu, fjarlægir vísun).
  const confirmDelete = useCallback(async () => {
    const target = pendingDelete;
    if (!target) return;
    try {
      const linked = logs.filter((l) => l.photoId === target.id);
      for (const l of linked) {
        await db.logs.update(l.id, { photoId: undefined });
      }
      await deletePhoto(target.id);
    } catch (err) {
      console.warn('[spira] eyðing myndar mistókst', err);
    } finally {
      setPendingDelete(null);
      setLightboxIndex(null);
    }
  }, [pendingDelete, logs]);

  if (!photos || photos.length === 0) return null;

  const usagePct = storage && storage.quota > 0 ? storage.usage / storage.quota : 0;
  const overQuota = usagePct >= QUOTA_WARN;

  return (
    <Card tone="strong" radius={18} padding={16} className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <Eyebrow>
          <span className="inline-flex items-center gap-1.5">
            <Images size={11} /> Myndasafn
          </span>
        </Eyebrow>
        {storage && (
          <span
            className="sp-mono text-[10px]"
            style={{ color: overQuota ? 'var(--cap-400)' : 'var(--cream-400)' }}
          >
            Myndir nota ~{formatMb(storage.usage)}
            {overQuota ? ' · geymsla að fyllast' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/55 mb-1.5">
              {g.label}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {g.photos.map((photo) => (
                <Thumb key={photo.id} photo={photo} onOpen={() => openAt(photo.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <PhotoLightbox
        items={lightboxItems}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        onDelete={(photo) => setPendingDelete(photo)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        title="Eyða mynd?"
        body="Myndin verður fjarlægð úr þessu tæki. Tengd skráning helst en án myndar. Þetta er ekki hægt að afturkalla."
        confirmLabel="Eyða mynd"
        destructive
      />
    </Card>
  );
}
