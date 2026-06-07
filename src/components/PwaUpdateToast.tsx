import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { setupServiceWorker } from '@/lib/sw';

/**
 * Setur upp service-worker (5.3) og sýnir lítið „toast" þegar ný útgáfa bíður —
 * í stað þess að skipta þegjandi um útgáfu meðan notandinn er að vinna.
 * „Endurhlaða" sækir nýju útgáfuna (SW notar skipWaiting+clientsClaim).
 */
export function PwaUpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setupServiceWorker(() => setShow(true));
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed left-0 right-0 z-[60] flex justify-center px-3"
          style={{ bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-full pl-4 pr-3 py-2 text-[13px] font-medium shadow-lg transition-colors"
            style={{
              background: 'rgba(36,56,39,.96)',
              border: '1px solid rgba(159,191,157,.4)',
              color: 'var(--cream-50)',
            }}
          >
            <span>Ný útgáfa í boði</span>
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px]"
              style={{ background: 'rgba(84,130,85,.4)', color: 'var(--cream-50)' }}
            >
              <RefreshCw size={12} />
              Endurhlaða
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
