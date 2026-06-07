import { useCallback } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';
import { usePhotoUrl } from '@/lib/photos';
import type { PhotoBlob } from '@/lib/db';
import { longDate } from '@/lib/dates';

/** Lýsigögn um eina mynd í ljóskassanum + samhengi til að sýna í texta. */
export interface LightboxPhoto {
  photo: PhotoBlob;
  /** Heiti plöntu (gælunafn/afbrigði) ef tengt. */
  plantLabel?: string;
  /** Athugasemd af tengdri skráningu, ef einhver. */
  note?: string;
}

/**
 * Þunnur millistykkis-íhlutur (3.2): heldur utan um myndasafnið (items + index)
 * og object-URL, en birtingin sjálf er sameiginlegi heilskjás-skoðarinn
 * `ui/Lightbox` (2.4) — örvar/strok/Escape/eyðing búa þar.
 */
export function PhotoLightbox({
  items,
  index,
  open,
  onClose,
  onIndexChange,
  onDelete,
}: {
  items: LightboxPhoto[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  onDelete?: (photo: PhotoBlob) => void;
}) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0));
  const current = items[safeIndex];
  const url = usePhotoUrl(open ? current?.photo.id : undefined);

  const go = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      onIndexChange((safeIndex + delta + items.length) % items.length);
    },
    [items.length, safeIndex, onIndexChange],
  );

  if (!current) return null;

  return (
    <Lightbox
      open={open}
      onClose={onClose}
      src={url ?? undefined}
      date={longDate(current.photo.takenAt)}
      plantName={current.plantLabel}
      note={current.note}
      counter={items.length > 1 ? `${safeIndex + 1}/${items.length}` : undefined}
      onPrev={items.length > 1 ? () => go(-1) : undefined}
      onNext={items.length > 1 ? () => go(1) : undefined}
      onDelete={onDelete ? () => onDelete(current.photo) : undefined}
    />
  );
}
