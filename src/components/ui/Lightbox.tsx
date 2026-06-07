import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { useScrollLock } from '@/lib/useScrollLock';

export interface LightboxProps {
  /** Hvort myndaskoðarinn sé opinn. */
  open: boolean;
  /** Loka (bakgrunnssmellur, X-hnappur eða Escape). */
  onClose: () => void;
  /** Object-URL myndar sem á að sýna (t.d. úr usePhotoUrl). */
  src?: string;
  /** Skýring neðst: dagsetning. */
  date?: string;
  /** Skýring neðst: plöntu-/ræktunarheiti. */
  plantName?: string;
  /** Aukatexti (t.d. nóta tengdrar skráningar). */
  note?: string;
  /** Staða í safni, t.d. "3/12" — birt í skýringunni. */
  counter?: string;
  /** Fletta á fyrri mynd (örvar/hnappur + strok birtast ef gefið). */
  onPrev?: () => void;
  /** Fletta á næstu mynd. */
  onNext?: () => void;
  /** Eyða myndinni (lítill hnappur neðst ef gefið). */
  onDelete?: () => void;
}

/**
 * Myndaskoðari í fullum skjá: nær-svartur bakgrunnur, mynd miðjuð, skýring
 * (dagsetning + plöntuheiti) neðst. Notar `useScrollLock` (sömu reglu og Modal)
 * svo síðan skrolli ekki á bak við. 3.2-galleríið sendir inn gögn + flettifalla.
 */
export function Lightbox({
  open,
  onClose,
  src,
  date,
  plantName,
  note,
  counter,
  onPrev,
  onNext,
  onDelete,
}: LightboxProps) {
  useScrollLock(open);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev?.();
      else if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, onPrev, onNext]);

  if (typeof document === 'undefined') return null;

  const caption = [date, plantName, counter].filter(Boolean).join(' · ');

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(6,10,7,.94)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) {
              if (dx < 0) onNext?.();
              else onPrev?.();
            }
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Loka mynd"
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full text-cream-100"
            style={{ background: 'rgba(231,217,168,.1)' }}
          >
            <X size={20} />
          </button>

          {onPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Fyrri mynd"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full text-cream-100"
              style={{ background: 'rgba(231,217,168,.1)' }}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Næsta mynd"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full text-cream-100"
              style={{ background: 'rgba(231,217,168,.1)' }}
            >
              <ChevronRight size={22} />
            </button>
          )}

          <motion.div
            className="flex flex-col items-center max-w-full max-h-full px-4 py-12"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {src && (
              <img
                src={src}
                alt={caption || 'Mynd'}
                className="rounded-xl object-contain"
                style={{ maxWidth: '92vw', maxHeight: '80vh' }}
              />
            )}
            {(caption || note || onDelete) && (
              <div className="mt-4 text-center">
                {caption && (
                  <div
                    className="sp-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      color: 'var(--cream-200)',
                    }}
                  >
                    {caption}
                  </div>
                )}
                {note && (
                  <div className="text-sm text-cream-300/70 mt-1 max-w-md">{note}</div>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-cream-300/70 hover:text-cap-400 transition-colors"
                  >
                    <Trash2 size={13} />
                    Eyða mynd
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
