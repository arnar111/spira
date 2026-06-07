import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollLock } from '@/lib/useScrollLock';
import { Eyebrow } from '@/components/ui/Eyebrow';

type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  size?: ModalSize;
  fullHeight?: boolean;
}

const SIZE_MAX_WIDTH: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  children,
  title,
  eyebrow,
  size = 'md',
  fullHeight = false,
}: ModalProps) {
  useScrollLock(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Fókusgildra (1.2): geymdu fyrri fókus, færðu fókus inn í gluggann við
  // opnun, haltu Tab/Shift+Tab innan hans, og skilaðu fókus til baka við lokun.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Færðu fókus inn í gluggann eftir að hann hefur teiknast.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={`w-full ${SIZE_MAX_WIDTH[size]} rounded-2xl p-5 outline-none ${
              fullHeight ? 'flex flex-col' : ''
            }`}
            style={{
              background: 'rgba(36,56,39,.96)',
              border: '1px solid rgba(64,104,67,.55)',
              maxHeight: fullHeight ? 'min(88vh, 100%)' : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {(eyebrow || title) && (
              <div className={fullHeight ? 'shrink-0' : undefined}>
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                {title && (
                  <h3
                    id={titleId}
                    className="sp-display"
                    style={{
                      fontSize: 22,
                      color: 'var(--cream-50)',
                      fontWeight: 500,
                      marginTop: eyebrow ? 4 : 0,
                      marginBottom: 14,
                    }}
                  >
                    {title}
                  </h3>
                )}
              </div>
            )}
            {fullHeight ? (
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            ) : (
              children
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
