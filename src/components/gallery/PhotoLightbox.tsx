import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { usePhotoUrl } from '@/lib/photos';
import type { PhotoBlob } from '@/lib/db';

/** Lýsigögn um eina mynd í ljóskassanum + samhengi til að sýna í texta. */
export interface LightboxPhoto {
  photo: PhotoBlob;
  /** Heiti plöntu (gælunafn/afbrigði) ef tengt. */
  plantLabel?: string;
  /** Athugasemd af tengdri skráningu, ef einhver. */
  note?: string;
}

function fullDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/**
 * Heilskjás ljóskassi ofan á ui/Modal (3.2). Örva-/strok-fletting milli mynda,
 * sýnir dagsetningu + plöntu + tengda skráningar-athugasemd, og býður eyðingu.
 * (2.4 skilar fínni ui/Lightbox á annarri grein — lead samræmir.)
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
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const next = (safeIndex + delta + items.length) % items.length;
      onIndexChange(next);
    },
    [items.length, safeIndex, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!current) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div
        className="relative"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <div className="text-cream-50 text-sm font-medium truncate">
              {current.plantLabel ?? 'Mynd'}
            </div>
            <div className="sp-mono text-[11px] text-cream-400/70">
              {fullDate(current.photo.takenAt)}
              {items.length > 1 ? ` · ${safeIndex + 1}/${items.length}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Loka mynd"
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-cream-300 hover:text-cream-100"
            style={{ background: 'rgba(18,31,20,.55)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="relative rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(8,14,9,.92)', minHeight: 200 }}
        >
          {url ? (
            <img
              src={url}
              alt={current.plantLabel ? `Mynd af ${current.plantLabel}` : 'Mynd'}
              className="w-full max-h-[64vh] object-contain"
            />
          ) : (
            <div className="w-full h-64" />
          )}

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Fyrri mynd"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-cream-50"
                style={{ background: 'rgba(18,31,20,.6)' }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Næsta mynd"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-cream-50"
                style={{ background: 'rgba(18,31,20,.6)' }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {current.note && (
          <p className="text-[12px] text-cream-300/80 mt-2 leading-relaxed">{current.note}</p>
        )}

        {onDelete && (
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => onDelete(current.photo)}
              className="inline-flex items-center gap-1.5 text-[12px] text-cream-300/70 hover:text-cap-400 transition-colors"
            >
              <Trash2 size={13} />
              Eyða mynd
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
