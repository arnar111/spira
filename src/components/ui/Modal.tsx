import { useEffect, type ReactNode } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
            className={`w-full ${SIZE_MAX_WIDTH[size]} rounded-2xl p-5 ${
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
